"""
Face Analyzer Module

Analyzes overall facial health indicators.
"""

import cv2
import numpy as np
from typing import List, Optional, Tuple, Dict, Any
from .base_analyzer import BaseAnalyzer, AnalysisResult


class FaceAnalyzer(BaseAnalyzer):
    """
    Analyzes overall facial health indicators.

    Detects:
    - Facial symmetry
    - Overall complexion
    - Swelling/puffiness
    - General wellness indicators
    """

    def __init__(self):
        super().__init__()
        self._face_cascade = None

    @property
    def face_cascade(self):
        """Lazy load face cascade classifier."""
        if self._face_cascade is None:
            self._face_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            )
        return self._face_cascade

    def get_required_regions(self) -> List[str]:
        return ['face']

    def analyze(
        self,
        image: np.ndarray,
        face_region: Optional[Tuple[int, int, int, int]] = None,
        **kwargs
    ) -> AnalysisResult:
        """
        Analyze facial health indicators.

        Args:
            image: BGR image
            face_region: Optional (x, y, w, h) of face region
        """
        if not self.validate_input(image):
            return self.create_error_result("Invalid input image")

        try:
            # Detect face if not provided
            if face_region is None:
                face_region = self._detect_face(image)

            if face_region is None:
                return self.create_error_result("No face detected in image")

            x, y, w, h = face_region
            face_roi = image[y:y+h, x:x+w]

            indicators = {}
            details = {}

            # Symmetry analysis
            symmetry_result = self._analyze_symmetry(face_roi)
            indicators['facial_symmetry'] = symmetry_result['score']
            details['symmetry'] = symmetry_result['details']

            # Complexion analysis
            complexion_result = self._analyze_complexion(face_roi)
            indicators.update(complexion_result['indicators'])
            details['complexion'] = complexion_result['details']

            # Puffiness/swelling detection
            puffiness_result = self._analyze_puffiness(face_roi)
            indicators['facial_puffiness'] = puffiness_result['score']
            details['puffiness'] = puffiness_result['details']

            # Overall wellness score
            wellness = self._calculate_wellness_score(indicators)
            indicators['facial_wellness'] = wellness

            # Face detection details
            details['face_region'] = {
                'x': x, 'y': y, 'width': w, 'height': h
            }

            # Calculate confidence
            confidence = self.calculate_confidence(
                image_quality=kwargs.get('image_quality', 70),
                region_detected=True,
                sample_size=w * h,
                min_samples=10000
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

    def _detect_face(self, image: np.ndarray) -> Optional[Tuple[int, int, int, int]]:
        """Detect face region in image."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(100, 100)
        )

        if len(faces) == 0:
            return None

        # Return largest face
        largest = max(faces, key=lambda f: f[2] * f[3])
        return tuple(largest)

    def _analyze_symmetry(self, face_roi: np.ndarray) -> dict:
        """
        Analyze facial symmetry.

        Compares left and right halves of the face.
        High asymmetry can indicate various conditions.
        """
        h, w = face_roi.shape[:2]
        mid = w // 2

        # Split face into left and right halves
        left_half = face_roi[:, :mid]
        right_half = face_roi[:, mid:]

        # Flip right half for comparison
        right_flipped = cv2.flip(right_half, 1)

        # Resize to match (in case of odd width)
        min_w = min(left_half.shape[1], right_flipped.shape[1])
        left_half = left_half[:, :min_w]
        right_flipped = right_flipped[:, :min_w]

        # Convert to grayscale for comparison
        left_gray = cv2.cvtColor(left_half, cv2.COLOR_BGR2GRAY)
        right_gray = cv2.cvtColor(right_flipped, cv2.COLOR_BGR2GRAY)

        # Calculate structural similarity
        # Using mean squared error as simple metric
        mse = np.mean((left_gray.astype(float) - right_gray.astype(float)) ** 2)

        # Normalize MSE to similarity score (0-1)
        # Lower MSE = higher similarity
        max_mse = 255 ** 2
        similarity = 1 - (mse / max_mse)

        # Also check color symmetry
        left_lab = cv2.cvtColor(left_half, cv2.COLOR_BGR2LAB)
        right_lab = cv2.cvtColor(right_flipped, cv2.COLOR_BGR2LAB)

        color_diff = np.mean(np.abs(
            left_lab.astype(float) - right_lab.astype(float)
        ))
        color_similarity = 1 - (color_diff / 255)

        # Combined symmetry score
        symmetry_score = (similarity * 0.6 + color_similarity * 0.4)

        return {
            'score': round(symmetry_score, 3),
            'details': {
                'structural_similarity': round(similarity, 3),
                'color_similarity': round(color_similarity, 3),
                'mse': round(float(mse), 2),
            }
        }

    def _analyze_complexion(self, face_roi: np.ndarray) -> dict:
        """Analyze overall facial complexion."""
        hsv = cv2.cvtColor(face_roi, cv2.COLOR_BGR2HSV)
        lab = cv2.cvtColor(face_roi, cv2.COLOR_BGR2LAB)

        # Create skin mask for face
        skin_mask = cv2.inRange(
            hsv,
            np.array([0, 20, 70]),
            np.array([25, 255, 255])
        )

        skin_pixels = np.sum(skin_mask > 0)
        if skin_pixels < 100:
            return {
                'indicators': {'complexion_score': 0.5},
                'details': {'skin_detected': False}
            }

        # Analyze skin areas
        skin_lab = lab[skin_mask > 0]
        skin_hsv = hsv[skin_mask > 0]

        mean_l = np.mean(skin_lab[:, 0])
        mean_a = np.mean(skin_lab[:, 1])
        mean_b = np.mean(skin_lab[:, 2])
        std_l = np.std(skin_lab[:, 0])

        # Evenness score (lower std = more even)
        evenness = 1 - min(1.0, std_l / 50)

        # Healthy glow (moderate values, not too pale or flushed)
        # Ideal: slight warmth (a slightly above 128, b slightly above 128)
        glow = 1.0
        if mean_a < 125 or mean_a > 145:
            glow -= abs(mean_a - 135) / 50
        if mean_b < 125 or mean_b > 145:
            glow -= abs(mean_b - 135) / 50
        glow = max(0, glow)

        complexion_score = (evenness * 0.5 + glow * 0.5)

        return {
            'indicators': {
                'complexion_score': round(complexion_score, 3),
                'skin_evenness': round(evenness, 3),
            },
            'details': {
                'skin_detected': True,
                'mean_lightness': round(float(mean_l), 2),
                'mean_a': round(float(mean_a), 2),
                'mean_b': round(float(mean_b), 2),
                'lightness_std': round(float(std_l), 2),
            }
        }

    def _analyze_puffiness(self, face_roi: np.ndarray) -> dict:
        """
        Analyze facial puffiness/swelling.

        Uses edge detection and contour analysis to detect
        unusual swelling patterns.
        """
        gray = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape

        # Focus on under-eye and cheek areas (middle third of face)
        mid_region = gray[int(h*0.3):int(h*0.6), :]

        # Use blur difference to detect puffiness
        blurred = cv2.GaussianBlur(mid_region, (15, 15), 0)
        diff = cv2.absdiff(mid_region, blurred)

        # High values in puffed areas due to shadows
        mean_diff = np.mean(diff)

        # Analyze contours in the region
        edges = cv2.Canny(mid_region, 30, 100)
        contours, _ = cv2.findContours(
            edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        # Count rounded contours (potential puffiness)
        rounded_count = 0
        for contour in contours:
            if len(contour) < 5:
                continue
            perimeter = cv2.arcLength(contour, True)
            area = cv2.contourArea(contour)
            if perimeter > 0:
                circularity = 4 * np.pi * area / (perimeter ** 2)
                if circularity > 0.5:  # More circular
                    rounded_count += 1

        # Puffiness score (higher = more puffy)
        puffiness = min(1.0, (mean_diff / 30 + rounded_count / 20) / 2)

        return {
            'score': round(puffiness, 3),
            'details': {
                'mean_diff': round(float(mean_diff), 2),
                'rounded_contours': rounded_count,
            }
        }

    def _calculate_wellness_score(self, indicators: Dict[str, float]) -> float:
        """Calculate overall facial wellness score."""
        weights = {
            'facial_symmetry': 0.25,
            'complexion_score': 0.35,
            'skin_evenness': 0.2,
            'facial_puffiness': -0.2,  # Negative weight
        }

        score = 0.5  # Base score
        total_weight = 0

        for indicator, weight in weights.items():
            if indicator in indicators:
                if weight > 0:
                    score += weight * indicators[indicator]
                else:
                    score += weight * indicators[indicator]  # Reduces score
                total_weight += abs(weight)

        # Normalize
        if total_weight > 0:
            score = score / total_weight + 0.5

        return round(max(0.0, min(1.0, score)), 3)
