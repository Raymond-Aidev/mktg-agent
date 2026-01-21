"""
Base Analyzer Module

Provides the base class for all health analyzers.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
import numpy as np


@dataclass
class AnalysisResult:
    """Result from a single analyzer."""
    analyzer_name: str
    success: bool
    indicators: Dict[str, float] = field(default_factory=dict)
    confidence: float = 0.0
    details: Dict[str, Any] = field(default_factory=dict)
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


class BaseAnalyzer(ABC):
    """
    Base class for all health analyzers.

    Each analyzer focuses on a specific aspect of health assessment
    from smartphone photos.
    """

    def __init__(self):
        self.name = self.__class__.__name__

    @abstractmethod
    def analyze(self, image: np.ndarray, **kwargs) -> AnalysisResult:
        """
        Perform analysis on the given image.

        Args:
            image: Preprocessed BGR image
            **kwargs: Additional parameters specific to the analyzer

        Returns:
            AnalysisResult with indicators and metadata
        """
        pass

    @abstractmethod
    def get_required_regions(self) -> List[str]:
        """
        Get list of image regions required for this analyzer.

        Possible regions: 'face', 'eyes', 'lips', 'skin', 'nails', 'tongue'
        """
        pass

    def validate_input(self, image: np.ndarray) -> bool:
        """Validate that input image is suitable for analysis."""
        if image is None:
            return False
        if len(image.shape) != 3:
            return False
        if image.shape[2] != 3:
            return False
        if image.shape[0] < 50 or image.shape[1] < 50:
            return False
        return True

    def create_error_result(self, error_message: str) -> AnalysisResult:
        """Create an error result when analysis cannot be performed."""
        return AnalysisResult(
            analyzer_name=self.name,
            success=False,
            errors=[error_message]
        )

    def calculate_confidence(
        self,
        image_quality: float,
        region_detected: bool,
        sample_size: int,
        min_samples: int = 100
    ) -> float:
        """
        Calculate confidence score for analysis results.

        Args:
            image_quality: Image quality score (0-100)
            region_detected: Whether the required region was detected
            sample_size: Number of pixels/points analyzed
            min_samples: Minimum samples for full confidence
        """
        if not region_detected:
            return 0.0

        # Base confidence from image quality
        quality_factor = image_quality / 100.0

        # Sample size factor
        sample_factor = min(1.0, sample_size / min_samples)

        # Combined confidence
        confidence = quality_factor * 0.6 + sample_factor * 0.4

        return round(confidence, 3)
