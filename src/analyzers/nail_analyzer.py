"""
Nail Analyzer Module

Analyzes nail health indicators from hand/finger photos.
"""

import cv2
import numpy as np
from typing import List, Optional, Tuple
from .base_analyzer import BaseAnalyzer, AnalysisResult


class NailAnalyzer(BaseAnalyzer):
    """
    Analyzes nail health indicators.

    Detects:
    - Nail color (cyanosis, pallor, yellowing)
    - Nail bed coloration
    - Surface abnormalities
    - Nail shape indicators
    """

    def __init__(self):
        super().__init__()

    def get_required_regions(self) -> List[str]:
        return ['nails']

    def analyze(
        self,
        image: np.ndarray,
        nail_regions: Optional[List[Tuple[int, int, int, int]]] = None,
        **kwargs
    ) -> AnalysisResult:
        """
        Analyze nail health from image.

        Args:
            image: BGR image (expected to be a close-up of nails)
            nail_regions: Optional list of (x, y, w, h) for each nail
        """
        if not self.validate_input(image):
            return self.create_error_result("Invalid input image")

        try:
            # Detect nail regions if not provided
            if nail_regions is None:
                nail_regions = self._detect_nails(image)

            if len(nail_regions) == 0:
                # Analyze entire image as potential nail
                nail_regions = [(0, 0, image.shape[1], image.shape[0])]

            indicators = {}
            details = {}
            all_nail_results = []

            for i, region in enumerate(nail_regions[:5]):  # Max 5 nails
                x, y, w, h = region
                nail_roi = image[y:y+h, x:x+w]

                if nail_roi.size == 0:
                    continue

                result = self._analyze_single_nail(nail_roi)
                all_nail_results.append(result)

            if not all_nail_results:
                return self.create_error_result("Could not analyze nail regions")

            # Average results across all nails
            indicators['nail_cyanosis'] = round(
                np.mean([r['cyanosis'] for r in all_nail_results]), 3
            )
            indicators['nail_pallor'] = round(
                np.mean([r['pallor'] for r in all_nail_results]), 3
            )
            indicators['nail_yellowing'] = round(
                np.mean([r['yellowing'] for r in all_nail_results]), 3
            )
            indicators['nail_health_score'] = round(
                np.mean([r['health_score'] for r in all_nail_results]), 3
            )

            details['nails_analyzed'] = len(all_nail_results)
            details['individual_results'] = all_nail_results

            # Calculate confidence
            confidence = self.calculate_confidence(
                image_quality=kwargs.get('image_quality', 70),
                region_detected=True,
                sample_size=len(all_nail_results) * 1000,
                min_samples=1000
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

    def _detect_nails(self, image: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """
        Attempt to detect nail regions in image.

        This is challenging without specialized models, so we use
        color and shape heuristics.
        """
        # Convert to different color spaces
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)

        # Nails are typically pinkish/light colored
        # High value, moderate saturation
        nail_mask = cv2.inRange(
            hsv,
            np.array([0, 10, 150]),
            np.array([25, 100, 255])
        )

        # Clean up
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        nail_mask = cv2.morphologyEx(nail_mask, cv2.MORPH_CLOSE, kernel)
        nail_mask = cv2.morphologyEx(nail_mask, cv2.MORPH_OPEN, kernel)

        # Find contours
        contours, _ = cv2.findContours(
            nail_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        nail_regions = []
        min_area = 500  # Minimum nail area

        for contour in contours:
            area = cv2.contourArea(contour)
            if area < min_area:
                continue

            # Check aspect ratio (nails are usually wider than tall or squarish)
            x, y, w, h = cv2.boundingRect(contour)
            aspect_ratio = w / h if h > 0 else 0

            if 0.5 < aspect_ratio < 3.0:  # Reasonable nail aspect ratio
                nail_regions.append((x, y, w, h))

        return nail_regions

    def _analyze_single_nail(self, nail_roi: np.ndarray) -> dict:
        """Analyze a single nail region."""
        hsv = cv2.cvtColor(nail_roi, cv2.COLOR_BGR2HSV)
        lab = cv2.cvtColor(nail_roi, cv2.COLOR_BGR2LAB)

        # Calculate mean color values
        mean_h = np.mean(hsv[:, :, 0])
        mean_s = np.mean(hsv[:, :, 1])
        mean_v = np.mean(hsv[:, :, 2])
        mean_l = np.mean(lab[:, :, 0])
        mean_a = np.mean(lab[:, :, 1])
        mean_b = np.mean(lab[:, :, 2])

        # Cyanosis: Bluish tint
        cyanosis = 0
        if 100 < mean_h < 140:  # Blue hue range
            cyanosis = 1.0 - abs(mean_h - 120) / 40
        if mean_b < 120:  # Blue in LAB
            lab_cyanosis = (120 - mean_b) / 40
            cyanosis = max(cyanosis, min(1.0, lab_cyanosis))

        # Pallor: Pale/white appearance
        # Low saturation, high lightness
        pallor = 0
        if mean_s < 30 and mean_l > 180:
            pallor = ((30 - mean_s) / 30 + (mean_l - 180) / 75) / 2
        pallor = min(1.0, pallor)

        # Yellowing: Yellow discoloration
        yellowing = 0
        if 20 < mean_h < 40:  # Yellow hue range
            yellowing = 1.0 - abs(mean_h - 30) / 20
        if mean_b > 140:  # Yellow in LAB
            lab_yellow = (mean_b - 140) / 40
            yellowing = max(yellowing, min(1.0, lab_yellow))

        # Analyze nail bed (look for lunula - half-moon)
        lunula_result = self._analyze_lunula(nail_roi)

        # Surface analysis
        surface_result = self._analyze_surface(nail_roi)

        # Calculate health score
        health_score = 1.0
        health_score -= cyanosis * 0.3
        health_score -= pallor * 0.2
        health_score -= yellowing * 0.2
        health_score -= surface_result['irregularity'] * 0.2
        health_score = max(0.0, health_score)

        return {
            'cyanosis': round(cyanosis, 3),
            'pallor': round(pallor, 3),
            'yellowing': round(yellowing, 3),
            'health_score': round(health_score, 3),
            'surface_irregularity': surface_result['irregularity'],
            'lunula_visible': lunula_result['visible'],
            'color_details': {
                'mean_hue': round(float(mean_h), 2),
                'mean_saturation': round(float(mean_s), 2),
                'mean_value': round(float(mean_v), 2),
            }
        }

    def _analyze_lunula(self, nail_roi: np.ndarray) -> dict:
        """
        Analyze the lunula (half-moon at nail base).

        A visible, white lunula is generally a sign of good health.
        """
        h, w = nail_roi.shape[:2]

        # Lunula is typically at the bottom of the nail image
        # (assuming nail is photographed with base at bottom)
        lunula_region = nail_roi[int(h*0.7):, :]

        if lunula_region.size == 0:
            return {'visible': False}

        # Look for whiter region
        hsv = cv2.cvtColor(lunula_region, cv2.COLOR_BGR2HSV)
        white_mask = cv2.inRange(
            hsv,
            np.array([0, 0, 200]),
            np.array([180, 40, 255])
        )

        white_ratio = np.sum(white_mask > 0) / white_mask.size

        return {
            'visible': white_ratio > 0.1,
            'white_ratio': round(white_ratio, 3)
        }

    def _analyze_surface(self, nail_roi: np.ndarray) -> dict:
        """Analyze nail surface for ridges, pitting, etc."""
        gray = cv2.cvtColor(nail_roi, cv2.COLOR_BGR2GRAY)

        # Use edge detection to find surface irregularities
        edges = cv2.Canny(gray, 50, 150)
        edge_density = np.sum(edges > 0) / edges.size

        # Laplacian for texture
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        texture_var = laplacian.var()

        # Higher edge density and texture variance = more irregularities
        irregularity = min(1.0, (edge_density * 5 + texture_var / 1000) / 2)

        return {
            'irregularity': round(irregularity, 3),
            'edge_density': round(edge_density, 4),
            'texture_variance': round(float(texture_var), 2)
        }
