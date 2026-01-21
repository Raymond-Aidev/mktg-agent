"""
Skin Analyzer Module

Analyzes skin health indicators from facial photos.
"""

import cv2
import numpy as np
from typing import List, Optional, Tuple
from .base_analyzer import BaseAnalyzer, AnalysisResult


class SkinAnalyzer(BaseAnalyzer):
    """
    Analyzes skin health indicators.

    Detects:
    - Skin tone and uniformity
    - Color abnormalities (yellowing, pallor, redness)
    - Texture irregularities
    - Spots and blemishes
    """

    # HSV ranges for skin detection
    SKIN_HSV_LOWER = np.array([0, 20, 70])
    SKIN_HSV_UPPER = np.array([20, 255, 255])

    def __init__(self):
        super().__init__()

    def get_required_regions(self) -> List[str]:
        return ['face', 'skin']

    def analyze(
        self,
        image: np.ndarray,
        face_region: Optional[Tuple[int, int, int, int]] = None,
        **kwargs
    ) -> AnalysisResult:
        """
        Analyze skin health from image.

        Args:
            image: BGR image
            face_region: Optional (x, y, w, h) of face region
        """
        if not self.validate_input(image):
            return self.create_error_result("Invalid input image")

        try:
            # Detect skin regions
            skin_mask = self._detect_skin(image)

            # If face region provided, focus on that area
            if face_region is not None:
                x, y, w, h = face_region
                roi_mask = np.zeros_like(skin_mask)
                roi_mask[y:y+h, x:x+w] = 255
                skin_mask = cv2.bitwise_and(skin_mask, roi_mask)

            skin_pixels = np.sum(skin_mask > 0)

            if skin_pixels < 100:
                return self.create_error_result("Insufficient skin area detected")

            # Perform analyses
            indicators = {}
            details = {}

            # Color analysis
            color_results = self._analyze_color(image, skin_mask)
            indicators.update(color_results['indicators'])
            details['color'] = color_results['details']

            # Texture analysis
            texture_results = self._analyze_texture(image, skin_mask)
            indicators.update(texture_results['indicators'])
            details['texture'] = texture_results['details']

            # Uniformity analysis
            uniformity_results = self._analyze_uniformity(image, skin_mask)
            indicators.update(uniformity_results['indicators'])
            details['uniformity'] = uniformity_results['details']

            # Spot detection
            spot_results = self._detect_spots(image, skin_mask)
            indicators.update(spot_results['indicators'])
            details['spots'] = spot_results['details']

            # Calculate confidence
            confidence = self.calculate_confidence(
                image_quality=kwargs.get('image_quality', 70),
                region_detected=True,
                sample_size=skin_pixels,
                min_samples=5000
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

    def _detect_skin(self, image: np.ndarray) -> np.ndarray:
        """Detect skin regions using color-based segmentation."""
        # Convert to HSV
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

        # Create skin mask
        mask = cv2.inRange(hsv, self.SKIN_HSV_LOWER, self.SKIN_HSV_UPPER)

        # Also try YCrCb space for better skin detection
        ycrcb = cv2.cvtColor(image, cv2.COLOR_BGR2YCrCb)
        mask_ycrcb = cv2.inRange(ycrcb, np.array([0, 133, 77]), np.array([255, 173, 127]))

        # Combine masks
        combined = cv2.bitwise_or(mask, mask_ycrcb)

        # Clean up with morphology
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        combined = cv2.morphologyEx(combined, cv2.MORPH_OPEN, kernel)
        combined = cv2.morphologyEx(combined, cv2.MORPH_CLOSE, kernel)

        return combined

    def _analyze_color(self, image: np.ndarray, mask: np.ndarray) -> dict:
        """Analyze skin color for health indicators."""
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)

        skin_hsv = hsv[mask > 0]
        skin_lab = lab[mask > 0]

        # Calculate mean values
        mean_h = np.mean(skin_hsv[:, 0])
        mean_s = np.mean(skin_hsv[:, 1])
        mean_v = np.mean(skin_hsv[:, 2])
        mean_a = np.mean(skin_lab[:, 1])  # Red-green
        mean_b = np.mean(skin_lab[:, 2])  # Yellow-blue

        # Yellowing indicator (high b value in LAB)
        yellowing = max(0, (mean_b - 128) / 127)  # Normalize 0-1
        yellowing = min(1.0, yellowing * 1.5)  # Scale for sensitivity

        # Redness indicator (high a value in LAB)
        redness = max(0, (mean_a - 128) / 127)
        redness = min(1.0, redness * 1.5)

        # Pallor indicator (low saturation, high value)
        pallor = max(0, (1 - mean_s / 255) * (mean_v / 255))
        pallor = min(1.0, pallor * 1.2)

        return {
            'indicators': {
                'skin_yellowing': round(yellowing, 3),
                'skin_redness': round(redness, 3),
                'skin_pallor': round(pallor, 3),
            },
            'details': {
                'mean_hue': round(float(mean_h), 2),
                'mean_saturation': round(float(mean_s), 2),
                'mean_value': round(float(mean_v), 2),
                'mean_a_channel': round(float(mean_a), 2),
                'mean_b_channel': round(float(mean_b), 2),
            }
        }

    def _analyze_texture(self, image: np.ndarray, mask: np.ndarray) -> dict:
        """Analyze skin texture quality."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Apply mask
        masked_gray = cv2.bitwise_and(gray, gray, mask=mask)

        # Calculate Laplacian variance (sharpness/texture)
        laplacian = cv2.Laplacian(masked_gray, cv2.CV_64F)
        texture_variance = laplacian.var()

        # Calculate local binary pattern-like texture
        # Using gradient magnitude
        gx = cv2.Sobel(masked_gray, cv2.CV_64F, 1, 0, ksize=3)
        gy = cv2.Sobel(masked_gray, cv2.CV_64F, 0, 1, ksize=3)
        gradient_magnitude = np.sqrt(gx**2 + gy**2)
        mean_gradient = np.mean(gradient_magnitude[mask > 0])

        # Higher texture variance can indicate roughness or issues
        # Normal skin should have moderate texture
        texture_score = 1.0 - min(1.0, abs(texture_variance - 500) / 1000)

        return {
            'indicators': {
                'skin_texture_score': round(texture_score, 3),
            },
            'details': {
                'texture_variance': round(float(texture_variance), 2),
                'mean_gradient': round(float(mean_gradient), 2),
            }
        }

    def _analyze_uniformity(self, image: np.ndarray, mask: np.ndarray) -> dict:
        """Analyze skin color uniformity."""
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        skin_pixels = lab[mask > 0]

        if len(skin_pixels) < 10:
            return {
                'indicators': {'skin_uniformity': 0.5},
                'details': {'sample_size': len(skin_pixels)}
            }

        # Calculate coefficient of variation for each channel
        std_l = np.std(skin_pixels[:, 0])
        std_a = np.std(skin_pixels[:, 1])
        std_b = np.std(skin_pixels[:, 2])

        mean_l = np.mean(skin_pixels[:, 0])
        mean_a = np.mean(skin_pixels[:, 1])
        mean_b = np.mean(skin_pixels[:, 2])

        cv_l = std_l / (mean_l + 1e-6)
        cv_a = std_a / (abs(mean_a - 128) + 1e-6)
        cv_b = std_b / (abs(mean_b - 128) + 1e-6)

        # Average uniformity (lower CV = more uniform)
        avg_cv = (cv_l + cv_a + cv_b) / 3
        uniformity = max(0, min(1.0, 1.0 - avg_cv))

        return {
            'indicators': {
                'skin_uniformity': round(uniformity, 3),
            },
            'details': {
                'cv_lightness': round(float(cv_l), 4),
                'cv_a_channel': round(float(cv_a), 4),
                'cv_b_channel': round(float(cv_b), 4),
            }
        }

    def _detect_spots(self, image: np.ndarray, mask: np.ndarray) -> dict:
        """Detect spots and blemishes on skin."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Apply Gaussian blur
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)

        # Detect dark spots (potential moles, blemishes)
        masked_gray = cv2.bitwise_and(blurred, blurred, mask=mask)
        mean_val = np.mean(masked_gray[mask > 0])

        # Threshold for dark spots
        _, dark_spots = cv2.threshold(
            masked_gray,
            int(mean_val * 0.7),
            255,
            cv2.THRESH_BINARY_INV
        )
        dark_spots = cv2.bitwise_and(dark_spots, mask)

        # Threshold for light spots
        _, light_spots = cv2.threshold(
            masked_gray,
            int(mean_val * 1.3),
            255,
            cv2.THRESH_BINARY
        )
        light_spots = cv2.bitwise_and(light_spots, mask)

        # Clean up
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        dark_spots = cv2.morphologyEx(dark_spots, cv2.MORPH_OPEN, kernel)
        light_spots = cv2.morphologyEx(light_spots, cv2.MORPH_OPEN, kernel)

        # Count spots
        dark_contours, _ = cv2.findContours(
            dark_spots, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        light_contours, _ = cv2.findContours(
            light_spots, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        # Filter small contours (noise)
        min_area = 20
        dark_count = len([c for c in dark_contours if cv2.contourArea(c) > min_area])
        light_count = len([c for c in light_contours if cv2.contourArea(c) > min_area])

        total_spots = dark_count + light_count
        skin_area = np.sum(mask > 0)

        # Spot density (spots per 10000 pixels)
        spot_density = (total_spots / skin_area) * 10000 if skin_area > 0 else 0

        # Score: fewer spots = higher score
        spot_score = max(0, 1.0 - (spot_density / 10))

        return {
            'indicators': {
                'skin_spot_score': round(spot_score, 3),
            },
            'details': {
                'dark_spots': dark_count,
                'light_spots': light_count,
                'total_spots': total_spots,
                'spot_density': round(spot_density, 2),
            }
        }
