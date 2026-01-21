"""
Image Preprocessing Module

Handles image loading, normalization, and preparation for analysis.
Optimized for smartphone photo characteristics.
"""

import cv2
import numpy as np
from typing import Tuple, Optional, Dict, Any
from dataclasses import dataclass


@dataclass
class ImageMetadata:
    """Metadata about the processed image."""
    original_size: Tuple[int, int]
    processed_size: Tuple[int, int]
    brightness: float
    contrast: float
    sharpness: float
    quality_score: float


class ImagePreprocessor:
    """
    Preprocesses smartphone photos for health analysis.

    Handles common issues with smartphone photos:
    - Varying lighting conditions
    - Different resolutions
    - Color cast from different light sources
    - Motion blur
    """

    # Standard processing size
    TARGET_SIZE = (640, 480)

    # Quality thresholds
    MIN_BRIGHTNESS = 40
    MAX_BRIGHTNESS = 220
    MIN_CONTRAST = 30
    MIN_SHARPNESS = 100

    def __init__(self):
        self._face_cascade = None

    @property
    def face_cascade(self):
        """Lazy load face cascade classifier."""
        if self._face_cascade is None:
            self._face_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            )
        return self._face_cascade

    def load_image(self, image_path: str) -> np.ndarray:
        """Load image from file path."""
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Could not load image: {image_path}")
        return image

    def load_from_bytes(self, image_bytes: bytes) -> np.ndarray:
        """Load image from bytes (for mobile app integration)."""
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Could not decode image from bytes")
        return image

    def assess_quality(self, image: np.ndarray) -> ImageMetadata:
        """
        Assess image quality and extract metadata.

        Returns metrics about image suitability for analysis.
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Calculate brightness (mean pixel value)
        brightness = np.mean(gray)

        # Calculate contrast (standard deviation)
        contrast = np.std(gray)

        # Calculate sharpness using Laplacian variance
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        sharpness = laplacian.var()

        # Overall quality score (0-100)
        quality_score = self._calculate_quality_score(
            brightness, contrast, sharpness
        )

        return ImageMetadata(
            original_size=(image.shape[1], image.shape[0]),
            processed_size=self.TARGET_SIZE,
            brightness=brightness,
            contrast=contrast,
            sharpness=sharpness,
            quality_score=quality_score
        )

    def _calculate_quality_score(
        self,
        brightness: float,
        contrast: float,
        sharpness: float
    ) -> float:
        """Calculate overall quality score from individual metrics."""
        score = 100.0

        # Brightness penalty
        if brightness < self.MIN_BRIGHTNESS:
            score -= (self.MIN_BRIGHTNESS - brightness) * 0.5
        elif brightness > self.MAX_BRIGHTNESS:
            score -= (brightness - self.MAX_BRIGHTNESS) * 0.5

        # Contrast penalty
        if contrast < self.MIN_CONTRAST:
            score -= (self.MIN_CONTRAST - contrast) * 0.5

        # Sharpness penalty
        if sharpness < self.MIN_SHARPNESS:
            score -= (self.MIN_SHARPNESS - sharpness) * 0.1

        return max(0, min(100, score))

    def normalize(self, image: np.ndarray) -> np.ndarray:
        """
        Normalize image for consistent analysis.

        - Resize to standard size
        - Apply histogram equalization for lighting normalization
        - Remove color cast
        """
        # Resize maintaining aspect ratio
        resized = self._resize_with_aspect(image, self.TARGET_SIZE)

        # Convert to LAB color space for better color manipulation
        lab = cv2.cvtColor(resized, cv2.COLOR_BGR2LAB)

        # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        lab[:, :, 0] = clahe.apply(lab[:, :, 0])

        # Convert back to BGR
        normalized = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

        return normalized

    def _resize_with_aspect(
        self,
        image: np.ndarray,
        target_size: Tuple[int, int]
    ) -> np.ndarray:
        """Resize image maintaining aspect ratio with padding."""
        h, w = image.shape[:2]
        target_w, target_h = target_size

        # Calculate scaling factor
        scale = min(target_w / w, target_h / h)
        new_w, new_h = int(w * scale), int(h * scale)

        # Resize
        resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)

        # Create padded image
        padded = np.zeros((target_h, target_w, 3), dtype=np.uint8)

        # Center the image
        x_offset = (target_w - new_w) // 2
        y_offset = (target_h - new_h) // 2
        padded[y_offset:y_offset+new_h, x_offset:x_offset+new_w] = resized

        return padded

    def white_balance(self, image: np.ndarray) -> np.ndarray:
        """Apply automatic white balance correction."""
        result = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        avg_a = np.average(result[:, :, 1])
        avg_b = np.average(result[:, :, 2])

        result[:, :, 1] = result[:, :, 1] - (
            (avg_a - 128) * (result[:, :, 0] / 255.0) * 1.1
        )
        result[:, :, 2] = result[:, :, 2] - (
            (avg_b - 128) * (result[:, :, 0] / 255.0) * 1.1
        )

        return cv2.cvtColor(result, cv2.COLOR_LAB2BGR)

    def detect_face(self, image: np.ndarray) -> Optional[Tuple[int, int, int, int]]:
        """
        Detect face region in image.

        Returns (x, y, width, height) of the largest detected face,
        or None if no face is detected.
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(100, 100)
        )

        if len(faces) == 0:
            return None

        # Return the largest face
        largest = max(faces, key=lambda f: f[2] * f[3])
        return tuple(largest)

    def extract_roi(
        self,
        image: np.ndarray,
        region: Tuple[int, int, int, int],
        padding: float = 0.0
    ) -> np.ndarray:
        """
        Extract region of interest with optional padding.

        Args:
            image: Source image
            region: (x, y, width, height) tuple
            padding: Percentage of padding to add (0.0 to 1.0)
        """
        x, y, w, h = region

        # Apply padding
        if padding > 0:
            pad_x = int(w * padding)
            pad_y = int(h * padding)
            x = max(0, x - pad_x)
            y = max(0, y - pad_y)
            w = min(image.shape[1] - x, w + 2 * pad_x)
            h = min(image.shape[0] - y, h + 2 * pad_y)

        return image[y:y+h, x:x+w].copy()

    def preprocess_for_analysis(
        self,
        image_path: str
    ) -> Tuple[np.ndarray, ImageMetadata]:
        """
        Complete preprocessing pipeline for analysis.

        Returns the processed image and its metadata.
        """
        # Load image
        image = self.load_image(image_path)

        # Assess quality
        metadata = self.assess_quality(image)

        # Apply preprocessing
        processed = self.normalize(image)
        processed = self.white_balance(processed)

        return processed, metadata
