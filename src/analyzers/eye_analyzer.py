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
    - Conjunctiva pallor - anemia indicator
    - Pupil characteristics
    - Dark circles under eyes
    - Scleral icterus (jaundice index)
    """

    # Reference values for anemia detection
    ANEMIA_THRESHOLDS = {
        'severe': 0.7,      # Very pale conjunctiva
        'moderate': 0.5,    # Moderately pale
        'mild': 0.3,        # Slightly pale
        'normal': 0.0       # Healthy color
    }

    # Jaundice index reference (JECI - Jaundice Eye Color Index)
    JAUNDICE_THRESHOLDS = {
        'severe': 0.6,      # Significant yellowing
        'moderate': 0.4,    # Noticeable yellowing
        'mild': 0.2,        # Slight yellowing
        'normal': 0.0       # No yellowing
    }

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
                avg_anemia = np.mean([r.get('anemia_index', 0) for r in eye_results])
                avg_jaundice = np.mean([r.get('jaundice_index', 0) for r in eye_results])

                indicators['eye_yellowing'] = round(avg_yellowing, 3)
                indicators['eye_redness'] = round(avg_redness, 3)
                indicators['eye_clarity'] = round(avg_clarity, 3)
                indicators['anemia_index'] = round(avg_anemia, 3)
                indicators['jaundice_index'] = round(avg_jaundice, 3)

                # Classify severity
                details['anemia_severity'] = self._classify_anemia(avg_anemia)
                details['jaundice_severity'] = self._classify_jaundice(avg_jaundice)
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
        Analyze sclera (white of eye) and conjunctiva for health indicators.

        Returns dict with yellowing, redness, clarity, anemia_index, and jaundice_index.
        """
        if eye_roi.size == 0:
            return {'yellowing': 0, 'redness': 0, 'clarity': 0.5, 'anemia_index': 0, 'jaundice_index': 0}

        # Convert to different color spaces
        hsv = cv2.cvtColor(eye_roi, cv2.COLOR_BGR2HSV)
        lab = cv2.cvtColor(eye_roi, cv2.COLOR_BGR2LAB)
        rgb = cv2.cvtColor(eye_roi, cv2.COLOR_BGR2RGB)

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
            return {'yellowing': 0, 'redness': 0, 'clarity': 0.5, 'anemia_index': 0, 'jaundice_index': 0}

        # Get sclera pixels in LAB space
        sclera_lab = lab[sclera_mask > 0]
        sclera_hsv = hsv[sclera_mask > 0]
        sclera_rgb = rgb[sclera_mask > 0]

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

        # === ANEMIA INDEX (Conjunctiva Pallor) ===
        # Analyze conjunctiva region (pinkish-red area around eye)
        # Detect pinkish regions that could be conjunctiva
        conjunctiva_mask = cv2.inRange(
            hsv,
            np.array([0, 30, 100]),
            np.array([20, 150, 255])
        )

        conjunctiva_pixels = np.sum(conjunctiva_mask > 0)
        if conjunctiva_pixels > 20:
            conjunctiva_rgb = rgb[conjunctiva_mask > 0]
            conjunctiva_lab = lab[conjunctiva_mask > 0]

            # Anemia causes pallor - reduced redness in conjunctiva
            mean_r = np.mean(conjunctiva_rgb[:, 0])
            mean_g = np.mean(conjunctiva_rgb[:, 1])
            mean_conj_l = np.mean(conjunctiva_lab[:, 0])
            mean_conj_a = np.mean(conjunctiva_lab[:, 1])

            # Normal conjunctiva has good red color (high R, high a in LAB)
            # Pale conjunctiva has reduced red (lower R-G difference, lower a)
            rg_diff = mean_r - mean_g
            expected_rg_diff = 40  # Normal healthy conjunctiva
            expected_a = 145  # Normal a value in LAB

            pallor_from_rg = max(0, (expected_rg_diff - rg_diff) / expected_rg_diff)
            pallor_from_a = max(0, (expected_a - mean_conj_a) / 30)

            anemia_index = (pallor_from_rg * 0.6 + pallor_from_a * 0.4)
            anemia_index = min(1.0, max(0, anemia_index))
        else:
            # Use sclera color as fallback
            mean_conj_a = np.mean(sclera_lab[:, 1])
            anemia_index = max(0, min(1.0, (140 - mean_conj_a) / 30))

        # === JAUNDICE INDEX (JECI - Jaundice Eye Color Index) ===
        # Based on sclera yellowness in CIE color space
        # Yellow is indicated by high b* in LAB
        mean_sclera_b = np.mean(sclera_lab[:, 2])
        mean_sclera_a = np.mean(sclera_lab[:, 1])

        # Calculate JECI-like index
        # Normal sclera: b around 128-135, a around 128
        # Jaundiced sclera: b > 140, potentially higher a
        jaundice_index = max(0, (mean_sclera_b - 132) / 35)
        jaundice_index = min(1.0, jaundice_index)

        # Boost if both a and b are elevated (more yellow-orange)
        if mean_sclera_a > 132 and mean_sclera_b > 138:
            jaundice_index = min(1.0, jaundice_index * 1.2)

        return {
            'yellowing': round(yellowing, 3),
            'redness': round(redness, 3),
            'clarity': round(clarity, 3),
            'anemia_index': round(anemia_index, 3),
            'jaundice_index': round(jaundice_index, 3),
            'sclera_pixels': sclera_pixels,
            'lab_values': {
                'L': round(float(mean_l), 2),
                'a': round(float(mean_sclera_a), 2),
                'b': round(float(mean_sclera_b), 2)
            }
        }

    def _classify_anemia(self, index: float) -> str:
        """Classify anemia severity based on index."""
        if index >= self.ANEMIA_THRESHOLDS['severe']:
            return 'severe'
        elif index >= self.ANEMIA_THRESHOLDS['moderate']:
            return 'moderate'
        elif index >= self.ANEMIA_THRESHOLDS['mild']:
            return 'mild'
        return 'normal'

    def _classify_jaundice(self, index: float) -> str:
        """Classify jaundice severity based on index."""
        if index >= self.JAUNDICE_THRESHOLDS['severe']:
            return 'severe'
        elif index >= self.JAUNDICE_THRESHOLDS['moderate']:
            return 'moderate'
        elif index >= self.JAUNDICE_THRESHOLDS['mild']:
            return 'mild'
        return 'normal'

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
