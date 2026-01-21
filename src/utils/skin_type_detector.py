"""
Skin Type Detector Module

Detects Fitzpatrick skin type for calibration and accuracy improvement.
"""

import cv2
import numpy as np
from typing import Dict, Any, Optional, Tuple
from enum import Enum
from dataclasses import dataclass


class FitzpatrickType(Enum):
    """Fitzpatrick Skin Type Scale."""
    TYPE_I = 1      # Very fair, always burns, never tans
    TYPE_II = 2     # Fair, usually burns, tans minimally
    TYPE_III = 3    # Medium, sometimes burns, tans uniformly
    TYPE_IV = 4     # Olive, rarely burns, tans easily
    TYPE_V = 5      # Brown, very rarely burns, tans very easily
    TYPE_VI = 6     # Dark brown/black, never burns


@dataclass
class SkinTypeResult:
    """Result of skin type detection."""
    fitzpatrick_type: FitzpatrickType
    confidence: float
    ita_angle: float  # Individual Typology Angle
    lab_values: Dict[str, float]
    calibration_factors: Dict[str, float]


class SkinTypeDetector:
    """
    Detects skin type using ITA (Individual Typology Angle) method.

    ITA is calculated from LAB color space:
    ITA = arctan((L* - 50) / b*) * 180 / pi

    Fitzpatrick mapping based on ITA:
    - Type I: ITA > 55
    - Type II: 41 < ITA <= 55
    - Type III: 28 < ITA <= 41
    - Type IV: 10 < ITA <= 28
    - Type V: -30 < ITA <= 10
    - Type VI: ITA <= -30
    """

    # ITA thresholds for Fitzpatrick types
    ITA_THRESHOLDS = {
        FitzpatrickType.TYPE_I: 55,
        FitzpatrickType.TYPE_II: 41,
        FitzpatrickType.TYPE_III: 28,
        FitzpatrickType.TYPE_IV: 10,
        FitzpatrickType.TYPE_V: -30,
        FitzpatrickType.TYPE_VI: float('-inf'),
    }

    # Calibration factors for each skin type
    # These adjust detection thresholds for better accuracy
    CALIBRATION_FACTORS = {
        FitzpatrickType.TYPE_I: {
            'pallor_threshold': 0.85,
            'redness_sensitivity': 1.2,
            'yellowing_threshold': 0.1,
            'cyanosis_threshold': 0.08,
        },
        FitzpatrickType.TYPE_II: {
            'pallor_threshold': 0.8,
            'redness_sensitivity': 1.15,
            'yellowing_threshold': 0.12,
            'cyanosis_threshold': 0.1,
        },
        FitzpatrickType.TYPE_III: {
            'pallor_threshold': 0.7,
            'redness_sensitivity': 1.0,
            'yellowing_threshold': 0.15,
            'cyanosis_threshold': 0.12,
        },
        FitzpatrickType.TYPE_IV: {
            'pallor_threshold': 0.6,
            'redness_sensitivity': 0.9,
            'yellowing_threshold': 0.18,
            'cyanosis_threshold': 0.15,
        },
        FitzpatrickType.TYPE_V: {
            'pallor_threshold': 0.5,
            'redness_sensitivity': 0.8,
            'yellowing_threshold': 0.22,
            'cyanosis_threshold': 0.18,
        },
        FitzpatrickType.TYPE_VI: {
            'pallor_threshold': 0.4,
            'redness_sensitivity': 0.7,
            'yellowing_threshold': 0.25,
            'cyanosis_threshold': 0.2,
        },
    }

    def __init__(self):
        pass

    def detect(
        self,
        image: np.ndarray,
        face_region: Optional[Tuple[int, int, int, int]] = None
    ) -> SkinTypeResult:
        """
        Detect skin type from image.

        Args:
            image: BGR image
            face_region: Optional (x, y, w, h) of face region

        Returns:
            SkinTypeResult with detected type and calibration factors
        """
        # Extract skin region
        skin_mask, skin_lab = self._extract_skin(image, face_region)

        if skin_lab is None or len(skin_lab) < 100:
            # Default to Type III if detection fails
            return SkinTypeResult(
                fitzpatrick_type=FitzpatrickType.TYPE_III,
                confidence=0.3,
                ita_angle=30.0,
                lab_values={'L': 0, 'a': 0, 'b': 0},
                calibration_factors=self.CALIBRATION_FACTORS[FitzpatrickType.TYPE_III]
            )

        # Calculate mean LAB values
        mean_l = np.mean(skin_lab[:, 0])
        mean_a = np.mean(skin_lab[:, 1])
        mean_b = np.mean(skin_lab[:, 2])

        # Calculate ITA
        ita_angle = self._calculate_ita(mean_l, mean_b)

        # Classify Fitzpatrick type
        skin_type = self._classify_fitzpatrick(ita_angle)

        # Calculate confidence based on sample size and consistency
        std_l = np.std(skin_lab[:, 0])
        confidence = self._calculate_confidence(len(skin_lab), std_l)

        return SkinTypeResult(
            fitzpatrick_type=skin_type,
            confidence=confidence,
            ita_angle=ita_angle,
            lab_values={
                'L': round(float(mean_l), 2),
                'a': round(float(mean_a), 2),
                'b': round(float(mean_b), 2),
            },
            calibration_factors=self.CALIBRATION_FACTORS[skin_type]
        )

    def _extract_skin(
        self,
        image: np.ndarray,
        face_region: Optional[Tuple[int, int, int, int]] = None
    ) -> Tuple[np.ndarray, Optional[np.ndarray]]:
        """Extract skin pixels from image."""
        # Convert to different color spaces
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        ycrcb = cv2.cvtColor(image, cv2.COLOR_BGR2YCrCb)
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)

        # If face region provided, focus on forehead/cheek area
        if face_region is not None:
            x, y, w, h = face_region
            # Forehead region (upper third of face)
            forehead_y = y + int(h * 0.1)
            forehead_h = int(h * 0.25)
            forehead_x = x + int(w * 0.25)
            forehead_w = int(w * 0.5)

            roi = image[forehead_y:forehead_y+forehead_h, forehead_x:forehead_x+forehead_w]
            hsv_roi = hsv[forehead_y:forehead_y+forehead_h, forehead_x:forehead_x+forehead_w]
            lab_roi = lab[forehead_y:forehead_y+forehead_h, forehead_x:forehead_x+forehead_w]
        else:
            roi = image
            hsv_roi = hsv
            lab_roi = lab

        # Skin detection using YCrCb + HSV
        # YCrCb skin range
        ycrcb_roi = cv2.cvtColor(roi, cv2.COLOR_BGR2YCrCb)
        mask_ycrcb = cv2.inRange(ycrcb_roi, np.array([0, 133, 77]), np.array([255, 173, 127]))

        # HSV skin range
        mask_hsv = cv2.inRange(hsv_roi, np.array([0, 20, 70]), np.array([25, 255, 255]))

        # Combine masks
        skin_mask = cv2.bitwise_and(mask_ycrcb, mask_hsv)

        # Clean up
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        skin_mask = cv2.morphologyEx(skin_mask, cv2.MORPH_OPEN, kernel)
        skin_mask = cv2.morphologyEx(skin_mask, cv2.MORPH_CLOSE, kernel)

        # Extract LAB values of skin pixels
        if np.sum(skin_mask > 0) > 100:
            skin_lab = lab_roi[skin_mask > 0]
            return skin_mask, skin_lab

        return skin_mask, None

    def _calculate_ita(self, l_value: float, b_value: float) -> float:
        """
        Calculate Individual Typology Angle (ITA).

        ITA = arctan((L* - 50) / b*) * 180 / pi
        """
        if b_value == 0:
            b_value = 0.001  # Avoid division by zero

        # L* is in range 0-255 from OpenCV, convert to 0-100 scale
        l_normalized = l_value * 100 / 255

        # b* is in range 0-255 from OpenCV, convert to -128 to 127
        b_normalized = b_value - 128

        if b_normalized == 0:
            b_normalized = 0.001

        ita = np.arctan((l_normalized - 50) / b_normalized) * 180 / np.pi

        return round(ita, 2)

    def _classify_fitzpatrick(self, ita: float) -> FitzpatrickType:
        """Classify Fitzpatrick skin type based on ITA angle."""
        if ita > self.ITA_THRESHOLDS[FitzpatrickType.TYPE_I]:
            return FitzpatrickType.TYPE_I
        elif ita > self.ITA_THRESHOLDS[FitzpatrickType.TYPE_II]:
            return FitzpatrickType.TYPE_II
        elif ita > self.ITA_THRESHOLDS[FitzpatrickType.TYPE_III]:
            return FitzpatrickType.TYPE_III
        elif ita > self.ITA_THRESHOLDS[FitzpatrickType.TYPE_IV]:
            return FitzpatrickType.TYPE_IV
        elif ita > self.ITA_THRESHOLDS[FitzpatrickType.TYPE_V]:
            return FitzpatrickType.TYPE_V
        else:
            return FitzpatrickType.TYPE_VI

    def _calculate_confidence(self, sample_size: int, std_l: float) -> float:
        """Calculate confidence based on sample size and color consistency."""
        # Sample size factor
        size_factor = min(1.0, sample_size / 5000)

        # Consistency factor (lower std = more consistent)
        consistency_factor = max(0.5, 1.0 - std_l / 50)

        return round(size_factor * 0.6 + consistency_factor * 0.4, 3)

    def get_calibration_advice(self, skin_type: FitzpatrickType) -> Dict[str, str]:
        """Get calibration advice for the detected skin type."""
        advice = {
            FitzpatrickType.TYPE_I: {
                'lighting': 'Use diffused lighting to avoid overexposure',
                'redness': 'Redness detection is highly sensitive',
                'pallor': 'Pallor may be less noticeable, watch for subtle changes',
            },
            FitzpatrickType.TYPE_II: {
                'lighting': 'Standard lighting works well',
                'redness': 'Redness detection is reliable',
                'pallor': 'Monitor for pale or grayish undertones',
            },
            FitzpatrickType.TYPE_III: {
                'lighting': 'Ensure good even lighting',
                'redness': 'Redness may appear as darker patches',
                'pallor': 'Look for ashen or grayish tones',
            },
            FitzpatrickType.TYPE_IV: {
                'lighting': 'Ensure bright, even lighting',
                'redness': 'Redness may appear purplish',
                'pallor': 'Pallor appears as gray or ashen tone',
            },
            FitzpatrickType.TYPE_V: {
                'lighting': 'Use bright lighting without glare',
                'redness': 'Check mucous membranes for redness',
                'pallor': 'Monitor nail beds and mucous membranes',
            },
            FitzpatrickType.TYPE_VI: {
                'lighting': 'Use very bright, even lighting',
                'redness': 'Best detected in mucous membranes',
                'pallor': 'Monitor conjunctiva and nail beds primarily',
            },
        }
        return advice.get(skin_type, advice[FitzpatrickType.TYPE_III])
