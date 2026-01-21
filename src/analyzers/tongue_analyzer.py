"""
Tongue Analyzer Module

Analyzes tongue color and coating for health indicators.
Based on Traditional Chinese Medicine principles with modern image analysis.
"""

import cv2
import numpy as np
from typing import List, Optional, Tuple, Dict, Any
from .base_analyzer import BaseAnalyzer, AnalysisResult


class TongueAnalyzer(BaseAnalyzer):
    """
    Analyzes tongue color and coating for health assessment.

    Detects:
    - Tongue body color (pale, normal, red, crimson, purple)
    - Tongue coating color and thickness
    - Moisture level
    - Shape abnormalities
    """

    # Tongue color classifications (in LAB color space)
    TONGUE_COLORS = {
        'pale': {'l_range': (70, 100), 'a_range': (125, 140), 'b_range': (125, 145)},
        'light_red': {'l_range': (55, 75), 'a_range': (140, 155), 'b_range': (130, 150)},
        'red': {'l_range': (45, 60), 'a_range': (155, 175), 'b_range': (135, 160)},
        'crimson': {'l_range': (35, 50), 'a_range': (165, 185), 'b_range': (140, 165)},
        'purple': {'l_range': (30, 55), 'a_range': (140, 165), 'b_range': (115, 135)},
        'blue_purple': {'l_range': (25, 45), 'a_range': (130, 155), 'b_range': (100, 125)},
    }

    # Coating color classifications
    COATING_COLORS = {
        'white': {'l_range': (75, 100), 'a_range': (120, 135), 'b_range': (120, 140)},
        'yellow': {'l_range': (65, 85), 'a_range': (125, 145), 'b_range': (145, 175)},
        'gray': {'l_range': (45, 65), 'a_range': (125, 135), 'b_range': (125, 140)},
        'black': {'l_range': (20, 45), 'a_range': (125, 135), 'b_range': (125, 140)},
    }

    def __init__(self):
        super().__init__()

    def get_required_regions(self) -> List[str]:
        return ['tongue']

    def analyze(
        self,
        image: np.ndarray,
        tongue_region: Optional[Tuple[int, int, int, int]] = None,
        face_region: Optional[Tuple[int, int, int, int]] = None,
        **kwargs
    ) -> AnalysisResult:
        """
        Analyze tongue for health indicators.

        Args:
            image: BGR image
            tongue_region: Optional (x, y, w, h) of tongue region
            face_region: Face region for tongue detection
        """
        if not self.validate_input(image):
            return self.create_error_result("Invalid input image")

        try:
            # Detect tongue region if not provided
            if tongue_region is None:
                tongue_region = self._detect_tongue(image, face_region)

            if tongue_region is None:
                return AnalysisResult(
                    analyzer_name=self.name,
                    success=False,
                    errors=["Tongue not detected. Please open mouth and show tongue."],
                    warnings=["For tongue analysis, please take a photo with tongue extended."]
                )

            x, y, w, h = tongue_region
            tongue_roi = image[y:y+h, x:x+w]

            indicators = {}
            details = {}

            # Analyze tongue body color
            body_result = self._analyze_body_color(tongue_roi)
            indicators['tongue_color_score'] = body_result['score']
            indicators['tongue_pallor'] = body_result['pallor']
            indicators['tongue_redness'] = body_result['redness']
            indicators['tongue_purple'] = body_result['purple']
            details['body_color'] = body_result

            # Analyze tongue coating
            coating_result = self._analyze_coating(tongue_roi)
            indicators['coating_thickness'] = coating_result['thickness']
            indicators['coating_yellow'] = coating_result['yellow_index']
            details['coating'] = coating_result

            # Analyze moisture
            moisture_result = self._analyze_moisture(tongue_roi)
            indicators['tongue_moisture'] = moisture_result['score']
            details['moisture'] = moisture_result

            # Analyze texture/cracks
            texture_result = self._analyze_texture(tongue_roi)
            indicators['tongue_crack_index'] = texture_result['crack_index']
            details['texture'] = texture_result

            # Overall tongue health score
            indicators['tongue_health_score'] = self._calculate_health_score(indicators)

            # Calculate confidence
            confidence = self.calculate_confidence(
                image_quality=kwargs.get('image_quality', 70),
                region_detected=True,
                sample_size=w * h,
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

    def _detect_tongue(
        self,
        image: np.ndarray,
        face_region: Optional[Tuple[int, int, int, int]] = None
    ) -> Optional[Tuple[int, int, int, int]]:
        """
        Detect tongue region in image.

        Uses color segmentation to find red/pink tongue area
        in the lower face region.
        """
        if face_region is not None:
            x, y, w, h = face_region
            # Focus on lower third of face (mouth area)
            mouth_y = y + int(h * 0.6)
            mouth_h = int(h * 0.4)
            search_region = image[mouth_y:mouth_y+mouth_h, x:x+w]
            offset = (x, mouth_y)
        else:
            # Search in lower half of image
            h, w = image.shape[:2]
            search_region = image[h//2:, :]
            offset = (0, h//2)

        # Convert to HSV for color detection
        hsv = cv2.cvtColor(search_region, cv2.COLOR_BGR2HSV)

        # Tongue color range (pinkish-red)
        lower_tongue = np.array([0, 50, 80])
        upper_tongue = np.array([20, 255, 255])
        mask1 = cv2.inRange(hsv, lower_tongue, upper_tongue)

        # Also check red range wrapping around
        lower_tongue2 = np.array([160, 50, 80])
        upper_tongue2 = np.array([180, 255, 255])
        mask2 = cv2.inRange(hsv, lower_tongue2, upper_tongue2)

        mask = mask1 | mask2

        # Clean up mask
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

        # Find contours
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        if not contours:
            return None

        # Find largest contour that could be tongue
        min_area = 1000  # Minimum tongue area
        valid_contours = [c for c in contours if cv2.contourArea(c) > min_area]

        if not valid_contours:
            return None

        largest = max(valid_contours, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(largest)

        # Add offset
        return (x + offset[0], y + offset[1], w, h)

    def _analyze_body_color(self, tongue_roi: np.ndarray) -> Dict[str, Any]:
        """Analyze tongue body color."""
        # Convert to LAB for better color analysis
        lab = cv2.cvtColor(tongue_roi, cv2.COLOR_BGR2LAB)

        # Get center region (avoid edges/coating)
        h, w = tongue_roi.shape[:2]
        center = lab[int(h*0.3):int(h*0.7), int(w*0.2):int(w*0.8)]

        if center.size == 0:
            center = lab

        mean_l = np.mean(center[:, :, 0])
        mean_a = np.mean(center[:, :, 1])
        mean_b = np.mean(center[:, :, 2])

        # Classify color
        color_class = self._classify_tongue_color(mean_l, mean_a, mean_b)

        # Calculate specific indicators
        # Pallor: high L, low a (less red)
        pallor = max(0, min(1, (mean_l - 50) / 50 * (1 - (mean_a - 128) / 50)))

        # Redness: low-mid L, high a
        redness = max(0, min(1, (mean_a - 140) / 40))

        # Purple: presence of blue tint
        purple = max(0, min(1, (140 - mean_b) / 40 + (mean_a - 140) / 60))

        # Overall color health score (normal is light red)
        # Deviation from normal reduces score
        normal_l, normal_a, normal_b = 65, 147, 140
        deviation = np.sqrt(
            ((mean_l - normal_l) / 30) ** 2 +
            ((mean_a - normal_a) / 20) ** 2 +
            ((mean_b - normal_b) / 20) ** 2
        )
        score = max(0, min(1, 1 - deviation / 2))

        return {
            'score': round(score, 3),
            'pallor': round(pallor, 3),
            'redness': round(redness, 3),
            'purple': round(purple, 3),
            'classification': color_class,
            'lab_values': {
                'L': round(float(mean_l), 2),
                'a': round(float(mean_a), 2),
                'b': round(float(mean_b), 2)
            }
        }

    def _classify_tongue_color(self, l: float, a: float, b: float) -> str:
        """Classify tongue color based on LAB values."""
        best_match = 'unknown'
        best_score = float('inf')

        for color_name, ranges in self.TONGUE_COLORS.items():
            l_mid = (ranges['l_range'][0] + ranges['l_range'][1]) / 2
            a_mid = (ranges['a_range'][0] + ranges['a_range'][1]) / 2
            b_mid = (ranges['b_range'][0] + ranges['b_range'][1]) / 2

            score = np.sqrt((l - l_mid)**2 + (a - a_mid)**2 + (b - b_mid)**2)

            if score < best_score:
                best_score = score
                best_match = color_name

        return best_match

    def _analyze_coating(self, tongue_roi: np.ndarray) -> Dict[str, Any]:
        """Analyze tongue coating color and thickness."""
        lab = cv2.cvtColor(tongue_roi, cv2.COLOR_BGR2LAB)

        # Coating is typically on the top surface
        h, w = tongue_roi.shape[:2]
        top_region = lab[:int(h*0.5), :]

        if top_region.size == 0:
            return {'thickness': 0, 'yellow_index': 0, 'color': 'none'}

        mean_l = np.mean(top_region[:, :, 0])
        mean_a = np.mean(top_region[:, :, 1])
        mean_b = np.mean(top_region[:, :, 2])

        # Coating thickness based on lightness
        # Thicker coating = higher L value (more white/opaque)
        thickness = max(0, min(1, (mean_l - 50) / 40))

        # Yellow index based on b channel
        yellow_index = max(0, min(1, (mean_b - 130) / 40))

        # Classify coating color
        coating_color = 'thin'
        if thickness > 0.3:
            if yellow_index > 0.4:
                coating_color = 'yellow'
            elif mean_l > 75:
                coating_color = 'white'
            elif mean_l < 50:
                coating_color = 'gray' if mean_l > 35 else 'black'

        return {
            'thickness': round(thickness, 3),
            'yellow_index': round(yellow_index, 3),
            'color': coating_color,
            'lab_values': {
                'L': round(float(mean_l), 2),
                'a': round(float(mean_a), 2),
                'b': round(float(mean_b), 2)
            }
        }

    def _analyze_moisture(self, tongue_roi: np.ndarray) -> Dict[str, Any]:
        """
        Analyze tongue moisture level.

        Moist tongues have more specular highlights.
        Dry tongues have more matte appearance.
        """
        gray = cv2.cvtColor(tongue_roi, cv2.COLOR_BGR2GRAY)

        # Detect specular highlights (bright spots)
        _, highlights = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY)
        highlight_ratio = np.sum(highlights > 0) / highlights.size

        # Check for texture roughness (dry tongues are rougher)
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        roughness = laplacian.var()

        # Moisture score
        # More highlights and less roughness = more moist
        moisture = min(1, highlight_ratio * 20 + (1 - min(1, roughness / 500)) * 0.5)

        return {
            'score': round(moisture, 3),
            'highlight_ratio': round(highlight_ratio, 4),
            'roughness': round(float(roughness), 2),
            'classification': 'moist' if moisture > 0.5 else 'dry'
        }

    def _analyze_texture(self, tongue_roi: np.ndarray) -> Dict[str, Any]:
        """Analyze tongue texture for cracks and abnormalities."""
        gray = cv2.cvtColor(tongue_roi, cv2.COLOR_BGR2GRAY)

        # Use edge detection to find cracks/fissures
        edges = cv2.Canny(gray, 50, 150)

        # Morphological operations to connect crack lines
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        edges = cv2.dilate(edges, kernel, iterations=1)

        # Calculate crack index based on edge density
        edge_density = np.sum(edges > 0) / edges.size
        crack_index = min(1, edge_density * 5)

        # Find linear structures (potential cracks)
        lines = cv2.HoughLinesP(edges, 1, np.pi/180, 30, minLineLength=20, maxLineGap=10)
        line_count = len(lines) if lines is not None else 0

        return {
            'crack_index': round(crack_index, 3),
            'edge_density': round(edge_density, 4),
            'line_count': line_count,
            'classification': 'cracked' if crack_index > 0.3 else 'normal'
        }

    def _calculate_health_score(self, indicators: Dict[str, float]) -> float:
        """Calculate overall tongue health score."""
        weights = {
            'tongue_color_score': 0.35,
            'coating_thickness': -0.15,  # Thick coating is negative
            'coating_yellow': -0.15,     # Yellow coating is negative
            'tongue_moisture': 0.2,
            'tongue_crack_index': -0.15, # Cracks are negative
        }

        score = 0.5
        for indicator, weight in weights.items():
            if indicator in indicators:
                if weight > 0:
                    score += weight * indicators[indicator]
                else:
                    score += weight * indicators[indicator]

        return round(max(0, min(1, score + 0.3)), 3)
