"""
Color Analysis Utilities

Provides color space conversions and analysis functions
for health indicator detection.
"""

import cv2
import numpy as np
from typing import Tuple, List, Dict, Optional
from dataclasses import dataclass
from enum import Enum


class SkinTone(Enum):
    """Fitzpatrick skin tone classification."""
    TYPE_I = "Very Fair"
    TYPE_II = "Fair"
    TYPE_III = "Medium"
    TYPE_IV = "Olive"
    TYPE_V = "Brown"
    TYPE_VI = "Dark Brown/Black"


@dataclass
class ColorStats:
    """Statistical information about color distribution."""
    mean: Tuple[float, float, float]
    std: Tuple[float, float, float]
    median: Tuple[float, float, float]
    dominant_colors: List[Tuple[int, int, int]]


class ColorAnalyzer:
    """
    Analyzes color information for health indicators.

    Key health-related color indicators:
    - Yellowing (jaundice indicator)
    - Pallor (anemia indicator)
    - Cyanosis (blue tint - oxygen issues)
    - Redness (inflammation/fever)
    - Skin tone variations
    """

    # Reference color ranges in HSV
    YELLOW_RANGE = ((15, 50, 50), (35, 255, 255))  # Jaundice
    BLUE_RANGE = ((100, 50, 50), (130, 255, 255))  # Cyanosis
    RED_RANGE = ((0, 100, 100), (10, 255, 255))    # Inflammation

    # Healthy skin tone ranges (HSV)
    HEALTHY_SKIN_HSV = {
        SkinTone.TYPE_I: ((0, 10, 180), (20, 80, 255)),
        SkinTone.TYPE_II: ((0, 20, 160), (25, 100, 255)),
        SkinTone.TYPE_III: ((0, 30, 130), (25, 120, 240)),
        SkinTone.TYPE_IV: ((0, 40, 100), (25, 140, 220)),
        SkinTone.TYPE_V: ((0, 50, 60), (25, 160, 180)),
        SkinTone.TYPE_VI: ((0, 40, 30), (25, 150, 120)),
    }

    def __init__(self):
        pass

    def get_color_stats(self, image: np.ndarray, mask: Optional[np.ndarray] = None) -> ColorStats:
        """
        Calculate color statistics for an image region.

        Args:
            image: BGR image
            mask: Optional binary mask for region of interest
        """
        if mask is not None:
            pixels = image[mask > 0]
        else:
            pixels = image.reshape(-1, 3)

        if len(pixels) == 0:
            return ColorStats(
                mean=(0, 0, 0),
                std=(0, 0, 0),
                median=(0, 0, 0),
                dominant_colors=[]
            )

        mean = tuple(np.mean(pixels, axis=0))
        std = tuple(np.std(pixels, axis=0))
        median = tuple(np.median(pixels, axis=0))
        dominant = self._find_dominant_colors(pixels, n_colors=3)

        return ColorStats(
            mean=mean,
            std=std,
            median=median,
            dominant_colors=dominant
        )

    def _find_dominant_colors(
        self,
        pixels: np.ndarray,
        n_colors: int = 3
    ) -> List[Tuple[int, int, int]]:
        """Find dominant colors using k-means clustering."""
        if len(pixels) < n_colors:
            return [tuple(p) for p in pixels]

        # Simple k-means implementation
        pixels_float = np.float32(pixels)
        criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 100, 0.2)

        try:
            _, labels, centers = cv2.kmeans(
                pixels_float,
                n_colors,
                None,
                criteria,
                10,
                cv2.KMEANS_RANDOM_CENTERS
            )
            centers = np.uint8(centers)
            return [tuple(c) for c in centers]
        except cv2.error:
            return [tuple(np.mean(pixels, axis=0).astype(int))]

    def detect_skin_tone(self, image: np.ndarray, skin_mask: np.ndarray) -> SkinTone:
        """
        Classify skin tone based on Fitzpatrick scale.

        Uses HSV color space analysis of detected skin regions.
        """
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        skin_pixels = hsv[skin_mask > 0]

        if len(skin_pixels) == 0:
            return SkinTone.TYPE_III  # Default to medium

        mean_v = np.mean(skin_pixels[:, 2])  # Value channel
        mean_s = np.mean(skin_pixels[:, 1])  # Saturation channel

        # Classify based on brightness (V) and saturation (S)
        if mean_v > 200:
            return SkinTone.TYPE_I if mean_s < 50 else SkinTone.TYPE_II
        elif mean_v > 160:
            return SkinTone.TYPE_II if mean_s < 60 else SkinTone.TYPE_III
        elif mean_v > 120:
            return SkinTone.TYPE_III if mean_s < 80 else SkinTone.TYPE_IV
        elif mean_v > 80:
            return SkinTone.TYPE_IV if mean_s < 100 else SkinTone.TYPE_V
        else:
            return SkinTone.TYPE_VI

    def detect_yellowing(self, image: np.ndarray, mask: Optional[np.ndarray] = None) -> float:
        """
        Detect yellowing in skin/eyes (jaundice indicator).

        Returns a score from 0 (no yellowing) to 1 (significant yellowing).
        """
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

        # Create yellow detection mask
        lower_yellow = np.array(self.YELLOW_RANGE[0])
        upper_yellow = np.array(self.YELLOW_RANGE[1])
        yellow_mask = cv2.inRange(hsv, lower_yellow, upper_yellow)

        if mask is not None:
            yellow_mask = cv2.bitwise_and(yellow_mask, mask)
            total_pixels = np.sum(mask > 0)
        else:
            total_pixels = image.shape[0] * image.shape[1]

        if total_pixels == 0:
            return 0.0

        yellow_pixels = np.sum(yellow_mask > 0)
        return min(1.0, yellow_pixels / total_pixels * 2)  # Scale factor for sensitivity

    def detect_pallor(self, image: np.ndarray, skin_mask: np.ndarray, skin_tone: SkinTone) -> float:
        """
        Detect pallor (paleness) indicating possible anemia.

        Compares skin color to expected healthy range for the detected skin tone.
        Returns score from 0 (normal) to 1 (significant pallor).
        """
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        skin_pixels = hsv[skin_mask > 0]

        if len(skin_pixels) == 0:
            return 0.0

        mean_s = np.mean(skin_pixels[:, 1])  # Saturation
        mean_v = np.mean(skin_pixels[:, 2])  # Value

        # Get expected ranges for skin tone
        expected_range = self.HEALTHY_SKIN_HSV.get(skin_tone, self.HEALTHY_SKIN_HSV[SkinTone.TYPE_III])
        min_s, max_s = expected_range[0][1], expected_range[1][1]
        min_v, max_v = expected_range[0][2], expected_range[1][2]

        # Calculate deviation from healthy range
        # Pallor typically shows as low saturation and potentially higher value
        pallor_score = 0.0

        if mean_s < min_s:
            pallor_score += (min_s - mean_s) / min_s * 0.7

        if mean_v > max_v:
            pallor_score += (mean_v - max_v) / (255 - max_v) * 0.3

        return min(1.0, pallor_score)

    def detect_cyanosis(self, image: np.ndarray, mask: Optional[np.ndarray] = None) -> float:
        """
        Detect cyanosis (blue tint) indicating oxygen issues.

        Best detected in lips and nail beds.
        Returns score from 0 (normal) to 1 (significant cyanosis).
        """
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

        # Create blue detection mask
        lower_blue = np.array(self.BLUE_RANGE[0])
        upper_blue = np.array(self.BLUE_RANGE[1])
        blue_mask = cv2.inRange(hsv, lower_blue, upper_blue)

        if mask is not None:
            blue_mask = cv2.bitwise_and(blue_mask, mask)
            total_pixels = np.sum(mask > 0)
        else:
            total_pixels = image.shape[0] * image.shape[1]

        if total_pixels == 0:
            return 0.0

        blue_pixels = np.sum(blue_mask > 0)
        return min(1.0, blue_pixels / total_pixels * 3)  # Higher sensitivity

    def detect_redness(self, image: np.ndarray, mask: Optional[np.ndarray] = None) -> float:
        """
        Detect excessive redness indicating inflammation or fever.

        Returns score from 0 (normal) to 1 (significant redness).
        """
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

        # Create red detection mask (red wraps around in HSV)
        lower_red1 = np.array([0, 100, 100])
        upper_red1 = np.array([10, 255, 255])
        lower_red2 = np.array([160, 100, 100])
        upper_red2 = np.array([180, 255, 255])

        red_mask1 = cv2.inRange(hsv, lower_red1, upper_red1)
        red_mask2 = cv2.inRange(hsv, lower_red2, upper_red2)
        red_mask = cv2.bitwise_or(red_mask1, red_mask2)

        if mask is not None:
            red_mask = cv2.bitwise_and(red_mask, mask)
            total_pixels = np.sum(mask > 0)
        else:
            total_pixels = image.shape[0] * image.shape[1]

        if total_pixels == 0:
            return 0.0

        red_pixels = np.sum(red_mask > 0)
        return min(1.0, red_pixels / total_pixels * 2)

    def analyze_uniformity(self, image: np.ndarray, mask: Optional[np.ndarray] = None) -> float:
        """
        Analyze color uniformity of skin region.

        Low uniformity may indicate skin conditions.
        Returns score from 0 (very uneven) to 1 (very uniform).
        """
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)

        if mask is not None:
            pixels = lab[mask > 0]
        else:
            pixels = lab.reshape(-1, 3)

        if len(pixels) < 10:
            return 0.5

        # Calculate coefficient of variation for each channel
        cv_l = np.std(pixels[:, 0]) / (np.mean(pixels[:, 0]) + 1e-6)
        cv_a = np.std(pixels[:, 1]) / (np.mean(pixels[:, 1]) + 1e-6)
        cv_b = np.std(pixels[:, 2]) / (np.mean(pixels[:, 2]) + 1e-6)

        # Average CV (lower is more uniform)
        avg_cv = (cv_l + cv_a + cv_b) / 3

        # Convert to uniformity score
        return max(0.0, min(1.0, 1.0 - avg_cv * 2))
