"""
Eye Analyzer Module

Analyzes eye health indicators from facial photos.
"""

import cv2
import numpy as np
from typing import List, Optional, Tuple
from .base_analyzer import BaseAnalyzer, AnalysisResult


class EyeAnalyzer(BaseAnalyzer):
    """
    Analyzes eye health indicators.

    Detects:
    - Sclera (white of eye) color - yellowing for jaundice
    - Eye redness/bloodshot appearance
    - Pupil characteristics
    - Dark circles under eyes
    """

    def __init__(self):
        super().__init__()
        self._eye_cascade = None

    @property
    def eye_cascade(self):
        """Lazy load eye cascade classifier."""
        if self._eye_cascade is None:
            self._eye_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + 'haarcascade_eye.xml'
            )
        return self._eye_cascade

    def get_required_regions(self) -> List[str]:
        return ['face', 'eyes']

    def analyze(
        self,
        image: np.ndarray,
        face_region: Optional[Tuple[int, int, int, int]] = None,
        **kwargs
    ) -> AnalysisResult:
        """
        Analyze eye health from image.

        Args:
            image: BGR image
            face_region: Optional (x, y, w, h) of face region
        """
        if not self.validate_input(image):
            return self.create_error_result("Invalid input image")

        try:
            # Detect eyes
            eyes = self._detect_eyes(image, face_region)

            if len(eyes) == 0:
                return self.create_error_result("No eyes detected in image")

            indicators = {}
            details = {}
            all_warnings = []

            # Analyze each detected eye
            eye_results = []
            for i, (ex, ey, ew, eh) in enumerate(eyes[:2]):  # Max 2 eyes
                eye_roi = image[ey:ey+eh, ex:ex+ew]

                # Sclera analysis
                sclera_result = self._analyze_sclera(eye_roi)
                eye_results.append(sclera_result)

            # Average results from both eyes
            if eye_results:
                avg_yellowing = np.mean([r['yellowing'] for r in eye_results])
                avg_redness = np.mean([r['redness'] for r in eye_results])
                avg_clarity = np.mean([r['clarity'] for r in eye_results])

                indicators['eye_yellowing'] = round(avg_yellowing, 3)
                indicators['eye_redness'] = round(avg_redness, 3)
                indicators['eye_clarity'] = round(avg_clarity, 3)

                details['individual_eyes'] = eye_results
                details['eyes_detected'] = len(eyes)

            # Dark circles analysis (if face region available)
            if face_region is not None and len(eyes) > 0:
                dark_circle_result = self._analyze_dark_circles(
                    image, face_region, eyes
                )
                indicators['dark_circles'] = dark_circle_result['score']
                details['dark_circles'] = dark_circle_result['details']

            # Calculate confidence
            confidence = self.calculate_confidence(
                image_quality=kwargs.get('image_quality', 70),
                region_detected=len(eyes) > 0,
                sample_size=len(eyes) * 1000,
                min_samples=2000
            )

            return AnalysisResult(
                analyzer_name=self.name,
                success=True,
                indicators=indicators,
                confidence=confidence,
                details=details,
                warnings=all_warnings
            )

        except Exception as e:
            return self.create_error_result(f"Analysis error: {str(e)}")

    def _detect_eyes(
        self,
        image: np.ndarray,
        face_region: Optional[Tuple[int, int, int, int]] = None
    ) -> List[Tuple[int, int, int, int]]:
        """Detect eye regions in image."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # If face region provided, search only in upper half of face
        if face_region is not None:
            fx, fy, fw, fh = face_region
            # Eyes are typically in upper 60% of face
            search_region = gray[fy:fy+int(fh*0.6), fx:fx+fw]
            offset_x, offset_y = fx, fy
        else:
            search_region = gray
            offset_x, offset_y = 0, 0

        eyes = self.eye_cascade.detectMultiScale(
            search_region,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30)
        )

        # Adjust coordinates for offset
        adjusted_eyes = [
            (x + offset_x, y + offset_y, w, h)
            for (x, y, w, h) in eyes
        ]

        # Sort by x coordinate to identify left/right
        adjusted_eyes.sort(key=lambda e: e[0])

        return adjusted_eyes

    def _analyze_sclera(self, eye_roi: np.ndarray) -> dict:
        """
        Analyze sclera (white of eye) for health indicators.

        Returns dict with yellowing, redness, and clarity scores.
        """
        if eye_roi.size == 0:
            return {'yellowing': 0, 'redness': 0, 'clarity': 0.5}

        # Convert to different color spaces
        hsv = cv2.cvtColor(eye_roi, cv2.COLOR_BGR2HSV)
        lab = cv2.cvtColor(eye_roi, cv2.COLOR_BGR2LAB)

        # Detect sclera (white regions)
        # High value, low saturation in HSV
        sclera_mask = cv2.inRange(
            hsv,
            np.array([0, 0, 150]),
            np.array([180, 80, 255])
        )

        # Clean up mask
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        sclera_mask = cv2.morphologyEx(sclera_mask, cv2.MORPH_OPEN, kernel)

        sclera_pixels = np.sum(sclera_mask > 0)

        if sclera_pixels < 50:
            # Not enough sclera visible
            return {'yellowing': 0, 'redness': 0, 'clarity': 0.5}

        # Get sclera pixels in LAB space
        sclera_lab = lab[sclera_mask > 0]
        sclera_hsv = hsv[sclera_mask > 0]

        # Yellowing: high b value in LAB (yellow-blue axis)
        mean_b = np.mean(sclera_lab[:, 2])
        yellowing = max(0, (mean_b - 128) / 50)
        yellowing = min(1.0, yellowing)

        # Redness: Check for red pixels in eye region
        # Red in HSV wraps around 0/180
        red_mask1 = cv2.inRange(hsv, np.array([0, 50, 50]), np.array([10, 255, 255]))
        red_mask2 = cv2.inRange(hsv, np.array([170, 50, 50]), np.array([180, 255, 255]))
        red_mask = cv2.bitwise_or(red_mask1, red_mask2)

        red_pixels = np.sum(red_mask > 0)
        total_pixels = eye_roi.shape[0] * eye_roi.shape[1]
        redness = min(1.0, (red_pixels / total_pixels) * 5)

        # Clarity: Based on how white the sclera is
        mean_l = np.mean(sclera_lab[:, 0])
        mean_s = np.mean(sclera_hsv[:, 1])
        clarity = (mean_l / 255) * (1 - mean_s / 255)
        clarity = max(0, min(1.0, clarity))

        return {
            'yellowing': round(yellowing, 3),
            'redness': round(redness, 3),
            'clarity': round(clarity, 3),
            'sclera_pixels': sclera_pixels
        }

    def _analyze_dark_circles(
        self,
        image: np.ndarray,
        face_region: Tuple[int, int, int, int],
        eyes: List[Tuple[int, int, int, int]]
    ) -> dict:
        """Analyze dark circles under eyes."""
        fx, fy, fw, fh = face_region

        dark_circle_values = []

        for ex, ey, ew, eh in eyes[:2]:
            # Region below each eye
            under_eye_y = ey + eh
            under_eye_h = int(eh * 0.5)
            under_eye_x = ex
            under_eye_w = ew

            # Ensure within image bounds
            if under_eye_y + under_eye_h > image.shape[0]:
                continue

            under_eye_roi = image[
                under_eye_y:under_eye_y+under_eye_h,
                under_eye_x:under_eye_x+under_eye_w
            ]

            if under_eye_roi.size == 0:
                continue

            # Convert to LAB and analyze lightness
            lab = cv2.cvtColor(under_eye_roi, cv2.COLOR_BGR2LAB)
            mean_l = np.mean(lab[:, :, 0])

            # Compare to cheek region (should be lighter)
            cheek_y = under_eye_y + under_eye_h
            cheek_roi = image[
                cheek_y:cheek_y+under_eye_h,
                under_eye_x:under_eye_x+under_eye_w
            ]

            if cheek_roi.size > 0:
                cheek_lab = cv2.cvtColor(cheek_roi, cv2.COLOR_BGR2LAB)
                cheek_l = np.mean(cheek_lab[:, :, 0])

                # Dark circle score based on difference
                darkness = max(0, (cheek_l - mean_l) / 50)
                dark_circle_values.append(min(1.0, darkness))

        if not dark_circle_values:
            return {'score': 0.0, 'details': {}}

        avg_darkness = np.mean(dark_circle_values)

        return {
            'score': round(avg_darkness, 3),
            'details': {
                'individual_scores': dark_circle_values,
                'eyes_analyzed': len(dark_circle_values)
            }
        }
