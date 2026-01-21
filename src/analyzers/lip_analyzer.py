"""
Lip Analyzer Module

Analyzes lip and mouth health indicators from facial photos.
"""

import cv2
import numpy as np
from typing import List, Optional, Tuple
from .base_analyzer import BaseAnalyzer, AnalysisResult


class LipAnalyzer(BaseAnalyzer):
    """
    Analyzes lip health indicators.

    Detects:
    - Lip color (cyanosis, pallor)
    - Oxygen saturation index (SpO2 indicator)
    - Circulation status
    - Lip dryness/texture
    - Dehydration indicator
    - Overall lip health score
    """

    # HSV ranges for lip detection
    LIP_HSV_LOWER = np.array([0, 50, 50])
    LIP_HSV_UPPER = np.array([20, 255, 255])

    # Reference values for oxygen saturation estimation
    # Based on lip color correlation with SpO2 levels
    SPO2_COLOR_REFERENCE = {
        'normal': {'h_range': (0, 15), 'a_range': (145, 165)},      # SpO2 > 95%
        'mild_low': {'h_range': (10, 25), 'a_range': (135, 150)},   # SpO2 90-95%
        'moderate_low': {'h_range': (100, 130), 'a_range': (125, 140)},  # SpO2 85-90%
        'severe_low': {'h_range': (110, 140), 'a_range': (115, 130)},    # SpO2 < 85%
    }

    def __init__(self):
        super().__init__()

    def get_required_regions(self) -> List[str]:
        return ['face', 'lips']

    def analyze(
        self,
        image: np.ndarray,
        face_region: Optional[Tuple[int, int, int, int]] = None,
        lip_landmarks: Optional[np.ndarray] = None,
        **kwargs
    ) -> AnalysisResult:
        """
        Analyze lip health from image.

        Args:
            image: BGR image
            face_region: Optional (x, y, w, h) of face region
            lip_landmarks: Optional array of lip landmark points
        """
        if not self.validate_input(image):
            return self.create_error_result("Invalid input image")

        try:
            # Detect lip region
            lip_mask = self._detect_lips(image, face_region, lip_landmarks)

            lip_pixels = np.sum(lip_mask > 0)
            if lip_pixels < 100:
                return self.create_error_result("Lip region not detected")

            indicators = {}
            details = {}

            # Color analysis
            color_result = self._analyze_lip_color(image, lip_mask)
            indicators.update(color_result['indicators'])
            details['color'] = color_result['details']

            # Texture analysis
            texture_result = self._analyze_lip_texture(image, lip_mask)
            indicators.update(texture_result['indicators'])
            details['texture'] = texture_result['details']

            # Overall lip health
            health_score = self._calculate_lip_health(indicators)
            indicators['lip_health_score'] = health_score

            # Calculate confidence
            confidence = self.calculate_confidence(
                image_quality=kwargs.get('image_quality', 70),
                region_detected=True,
                sample_size=lip_pixels,
                min_samples=500
            )

            return AnalysisResult(
                analyzer_name=self.name,
                success=True,
                indicators=indicators,
                confidence=confidence,
                details=details
            )

        except Exception as e:
            return self.create_error_result(f"Analysis error: {str(e)}")

    def _detect_lips(
        self,
        image: np.ndarray,
        face_region: Optional[Tuple[int, int, int, int]] = None,
        lip_landmarks: Optional[np.ndarray] = None
    ) -> np.ndarray:
        """Detect lip region using color-based segmentation."""
        mask = np.zeros(image.shape[:2], dtype=np.uint8)

        # If lip landmarks provided, use them
        if lip_landmarks is not None and len(lip_landmarks) > 0:
            hull = cv2.convexHull(lip_landmarks)
            cv2.fillPoly(mask, [hull], 255)
            return mask

        # Estimate lip region from face
        if face_region is not None:
            fx, fy, fw, fh = face_region
            # Lips are typically in lower third of face
            lip_y = fy + int(fh * 0.65)
            lip_h = int(fh * 0.25)
            lip_x = fx + int(fw * 0.25)
            lip_w = int(fw * 0.5)

            search_region = image[lip_y:lip_y+lip_h, lip_x:lip_x+lip_w]
        else:
            # Use lower third of image as search region
            h, w = image.shape[:2]
            lip_y = int(h * 0.6)
            lip_x = int(w * 0.3)
            lip_w = int(w * 0.4)
            lip_h = int(h * 0.25)
            search_region = image[lip_y:lip_y+lip_h, lip_x:lip_x+lip_w]

        if search_region.size == 0:
            return mask

        # Color-based lip detection
        hsv = cv2.cvtColor(search_region, cv2.COLOR_BGR2HSV)

        # Lips are typically reddish
        lip_mask = cv2.inRange(hsv, self.LIP_HSV_LOWER, self.LIP_HSV_UPPER)

        # Also check for darker red tones
        lip_mask2 = cv2.inRange(
            hsv,
            np.array([160, 50, 50]),
            np.array([180, 255, 255])
        )
        lip_mask = cv2.bitwise_or(lip_mask, lip_mask2)

        # Clean up
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        lip_mask = cv2.morphologyEx(lip_mask, cv2.MORPH_CLOSE, kernel)
        lip_mask = cv2.morphologyEx(lip_mask, cv2.MORPH_OPEN, kernel)

        # Find largest contour (likely the lips)
        contours, _ = cv2.findContours(
            lip_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        if contours:
            largest = max(contours, key=cv2.contourArea)
            # Place back into full image mask
            offset_mask = np.zeros(search_region.shape[:2], dtype=np.uint8)
            cv2.drawContours(offset_mask, [largest], -1, 255, -1)

            # Copy to correct location in full mask
            if face_region is not None:
                mask[lip_y:lip_y+lip_h, lip_x:lip_x+lip_w] = offset_mask
            else:
                mask[lip_y:lip_y+lip_h, lip_x:lip_x+lip_w] = offset_mask

        return mask

    def _analyze_lip_color(self, image: np.ndarray, mask: np.ndarray) -> dict:
        """Analyze lip color for health indicators including oxygen saturation."""
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        lip_hsv = hsv[mask > 0]
        lip_lab = lab[mask > 0]
        lip_rgb = rgb[mask > 0]

        if len(lip_hsv) == 0:
            return {
                'indicators': {
                    'lip_cyanosis': 0.0,
                    'lip_pallor': 0.0,
                    'oxygen_saturation_index': 1.0,
                    'circulation_index': 1.0,
                    'dehydration_index': 0.0,
                },
                'details': {}
            }

        # Calculate mean values
        mean_h = np.mean(lip_hsv[:, 0])
        mean_s = np.mean(lip_hsv[:, 1])
        mean_v = np.mean(lip_hsv[:, 2])
        mean_l = np.mean(lip_lab[:, 0])
        mean_a = np.mean(lip_lab[:, 1])  # Red-green
        mean_b = np.mean(lip_lab[:, 2])  # Yellow-blue
        mean_r = np.mean(lip_rgb[:, 0])
        mean_g = np.mean(lip_rgb[:, 1])
        mean_b_rgb = np.mean(lip_rgb[:, 2])

        # === CYANOSIS (Bluish tint) ===
        # Normal lip hue should be 0-20 (red range)
        blue_deviation = 0
        if mean_h > 100 and mean_h < 140:
            blue_deviation = 1.0 - abs(mean_h - 120) / 40
        cyanosis = min(1.0, blue_deviation)

        # Also check LAB b channel (negative = blue)
        if mean_b < 128:
            lab_cyanosis = (128 - mean_b) / 50
            cyanosis = max(cyanosis, min(1.0, lab_cyanosis))

        # === PALLOR (Paleness) ===
        # Healthy lips should have good saturation and red tones
        pallor = 0
        if mean_s < 80:
            pallor = (80 - mean_s) / 80
        if mean_a < 140:  # Low red in LAB
            pallor = max(pallor, (140 - mean_a) / 50)
        pallor = min(1.0, pallor)

        # === OXYGEN SATURATION INDEX ===
        # Estimate SpO2 based on lip color
        # Healthy oxygenated blood gives pink/red lips
        # Low oxygen gives bluish/purple lips

        # Factors for SpO2 estimation:
        # 1. Hue deviation from red (0-20 is normal)
        hue_factor = 1.0
        if mean_h > 20:
            if mean_h < 100:
                hue_factor = 1.0 - (mean_h - 20) / 80 * 0.3
            else:
                # Bluish hue indicates low oxygen
                hue_factor = max(0.3, 0.7 - (mean_h - 100) / 40 * 0.4)

        # 2. Red-green ratio in LAB (a channel)
        # Higher a = more red = better oxygenation
        a_factor = min(1.0, max(0.5, (mean_a - 120) / 40))

        # 3. Blue tint check
        blue_factor = 1.0
        if mean_b_rgb > mean_r * 0.8:
            blue_factor = max(0.5, 1.0 - (mean_b_rgb - mean_r * 0.8) / 50)

        # Combined SpO2 index (1.0 = healthy, 0.0 = severely low)
        spo2_index = (hue_factor * 0.4 + a_factor * 0.4 + blue_factor * 0.2)
        spo2_index = max(0, min(1.0, spo2_index))

        # Classify SpO2 level
        if spo2_index > 0.85:
            spo2_level = 'normal'  # >95%
        elif spo2_index > 0.7:
            spo2_level = 'mild_low'  # 90-95%
        elif spo2_index > 0.5:
            spo2_level = 'moderate_low'  # 85-90%
        else:
            spo2_level = 'severe_low'  # <85%

        # === CIRCULATION INDEX ===
        # Good circulation = vibrant color, good saturation
        circulation = 0.5
        if mean_s > 100 and mean_a > 140:
            circulation = min(1.0, (mean_s - 50) / 100 * (mean_a - 120) / 50)
        elif mean_s > 60:
            circulation = (mean_s - 60) / 80 * 0.7

        # Reduce if cyanosis present
        circulation = circulation * (1 - cyanosis * 0.5)
        circulation = max(0, min(1.0, circulation))

        # === DEHYDRATION INDEX ===
        # Dehydration causes: pale, dry, less vibrant lips
        # Low saturation + low value = possible dehydration
        dehydration = 0
        if mean_s < 70:
            dehydration += (70 - mean_s) / 70 * 0.4
        if mean_v < 100:
            dehydration += (100 - mean_v) / 100 * 0.3
        if pallor > 0.3:
            dehydration += pallor * 0.3

        dehydration = min(1.0, dehydration)

        return {
            'indicators': {
                'lip_cyanosis': round(cyanosis, 3),
                'lip_pallor': round(pallor, 3),
                'oxygen_saturation_index': round(spo2_index, 3),
                'circulation_index': round(circulation, 3),
                'dehydration_index': round(dehydration, 3),
            },
            'details': {
                'mean_hue': round(float(mean_h), 2),
                'mean_saturation': round(float(mean_s), 2),
                'mean_value': round(float(mean_v), 2),
                'mean_lightness': round(float(mean_l), 2),
                'mean_a_channel': round(float(mean_a), 2),
                'mean_b_channel': round(float(mean_b), 2),
                'rgb_values': {
                    'R': round(float(mean_r), 2),
                    'G': round(float(mean_g), 2),
                    'B': round(float(mean_b_rgb), 2),
                },
                'spo2_level': spo2_level,
            }
        }

    def _analyze_lip_texture(self, image: np.ndarray, mask: np.ndarray) -> dict:
        """Analyze lip texture for dryness/cracking."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        masked_gray = cv2.bitwise_and(gray, gray, mask=mask)

        # Calculate texture using Laplacian
        laplacian = cv2.Laplacian(masked_gray, cv2.CV_64F)
        texture_variance = laplacian.var()

        # Calculate gradient for crack detection
        gx = cv2.Sobel(masked_gray, cv2.CV_64F, 1, 0, ksize=3)
        gy = cv2.Sobel(masked_gray, cv2.CV_64F, 0, 1, ksize=3)
        gradient_mag = np.sqrt(gx**2 + gy**2)

        lip_gradient = gradient_mag[mask > 0]
        mean_gradient = np.mean(lip_gradient) if len(lip_gradient) > 0 else 0

        # High texture variance and gradient can indicate dryness/cracking
        # Normal smooth lips should have moderate values
        dryness = 0
        if texture_variance > 200:
            dryness = min(1.0, (texture_variance - 200) / 500)
        if mean_gradient > 30:
            dryness = max(dryness, min(1.0, (mean_gradient - 30) / 50))

        # Moisture score (inverse of dryness)
        moisture = 1.0 - dryness

        return {
            'indicators': {
                'lip_dryness': round(dryness, 3),
                'lip_moisture': round(moisture, 3),
            },
            'details': {
                'texture_variance': round(float(texture_variance), 2),
                'mean_gradient': round(float(mean_gradient), 2),
            }
        }

    def _calculate_lip_health(self, indicators: dict) -> float:
        """Calculate overall lip health score."""
        # Weight different indicators
        weights = {
            'lip_cyanosis': -0.4,      # Negative impact
            'lip_pallor': -0.3,        # Negative impact
            'lip_dryness': -0.2,       # Negative impact
            'lip_moisture': 0.1,       # Positive impact
        }

        score = 1.0  # Start with perfect score
        for indicator, weight in weights.items():
            if indicator in indicators:
                if weight < 0:
                    # Negative indicators reduce score
                    score += weight * indicators[indicator]
                else:
                    # Positive indicators are already factored
                    pass

        return round(max(0.0, min(1.0, score)), 3)
