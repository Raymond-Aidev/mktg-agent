"""
GoldenCheck Health Analyzer Engine

Main entry point for health analysis from smartphone photos.
Integrates all analyzer modules and generates comprehensive reports.
"""

import cv2
import numpy as np
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum

from .analyzers import (
    SkinAnalyzer,
    EyeAnalyzer,
    LipAnalyzer,
    NailAnalyzer,
    FaceAnalyzer,
    AnalysisResult
)
from .utils.image_preprocessing import ImagePreprocessor, ImageMetadata
from .utils.color_utils import ColorAnalyzer, SkinTone
from .utils.report_generator import (
    ReportGenerator,
    HealthIndicator,
    IndicatorLevel,
    AnalysisReport
)


class AnalysisMode(Enum):
    """Analysis mode selection."""
    FACE = "face"           # Full face analysis (skin, eyes, lips, face)
    NAILS = "nails"         # Nail analysis only
    FULL = "full"           # All available analyses
    QUICK = "quick"         # Quick analysis (reduced indicators)


@dataclass
class AnalysisConfig:
    """Configuration for health analysis."""
    mode: AnalysisMode = AnalysisMode.FACE
    enable_skin: bool = True
    enable_eyes: bool = True
    enable_lips: bool = True
    enable_face: bool = True
    enable_nails: bool = False
    min_confidence: float = 0.3
    generate_html_report: bool = False


class HealthAnalyzer:
    """
    Main health analysis engine.

    Coordinates multiple analyzers to extract health indicators
    from smartphone photos.

    Usage:
        analyzer = HealthAnalyzer()
        report = analyzer.analyze("photo.jpg")
        print(report.to_text())
    """

    # Indicator descriptions
    INDICATOR_DESCRIPTIONS = {
        'skin_yellowing': "Yellowing detected in skin",
        'skin_redness': "Redness level in skin",
        'skin_pallor': "Paleness detected in skin",
        'skin_uniformity': "Skin color uniformity",
        'skin_texture_score': "Skin texture quality",
        'skin_spot_score': "Skin spot/blemish assessment",
        'eye_yellowing': "Yellowing in eye whites (sclera)",
        'eye_redness': "Redness in eyes",
        'eye_clarity': "Eye clarity and brightness",
        'dark_circles': "Dark circles under eyes",
        'lip_cyanosis': "Bluish tint in lips",
        'lip_pallor': "Paleness in lips",
        'lip_dryness': "Lip dryness level",
        'lip_health_score': "Overall lip health",
        'nail_cyanosis': "Bluish tint in nails",
        'nail_pallor': "Paleness in nails",
        'nail_yellowing': "Yellowing in nails",
        'nail_health_score': "Overall nail health",
        'facial_symmetry': "Facial symmetry score",
        'complexion_score': "Overall complexion quality",
        'facial_puffiness': "Facial puffiness/swelling",
        'facial_wellness': "Overall facial wellness",
    }

    def __init__(self, config: Optional[AnalysisConfig] = None):
        """
        Initialize the health analyzer.

        Args:
            config: Analysis configuration (uses defaults if not provided)
        """
        self.config = config or AnalysisConfig()

        # Initialize components
        self.preprocessor = ImagePreprocessor()
        self.color_analyzer = ColorAnalyzer()
        self.report_generator = ReportGenerator()

        # Initialize analyzers based on config
        self._init_analyzers()

    def _init_analyzers(self):
        """Initialize analyzer modules based on configuration."""
        self.analyzers = {}

        if self.config.enable_skin:
            self.analyzers['skin'] = SkinAnalyzer()

        if self.config.enable_eyes:
            self.analyzers['eyes'] = EyeAnalyzer()

        if self.config.enable_lips:
            self.analyzers['lips'] = LipAnalyzer()

        if self.config.enable_face:
            self.analyzers['face'] = FaceAnalyzer()

        if self.config.enable_nails:
            self.analyzers['nails'] = NailAnalyzer()

    def analyze(
        self,
        image_path: str,
        mode: Optional[AnalysisMode] = None
    ) -> AnalysisReport:
        """
        Perform health analysis on an image.

        Args:
            image_path: Path to the image file
            mode: Optional override for analysis mode

        Returns:
            AnalysisReport with all health indicators
        """
        mode = mode or self.config.mode

        # Preprocess image
        image, metadata = self.preprocessor.preprocess_for_analysis(image_path)

        # Run analysis based on mode
        if mode == AnalysisMode.NAILS:
            results = self._analyze_nails(image, metadata)
        elif mode == AnalysisMode.QUICK:
            results = self._analyze_quick(image, metadata)
        else:
            results = self._analyze_face(image, metadata)

        # Convert results to health indicators
        indicators = self._convert_to_indicators(results, metadata)

        # Generate report
        warnings = self._collect_warnings(results, metadata)
        report = self.report_generator.generate_report(
            indicators=indicators,
            image_quality=metadata.quality_score,
            warnings=warnings
        )

        return report

    def analyze_bytes(
        self,
        image_bytes: bytes,
        mode: Optional[AnalysisMode] = None
    ) -> AnalysisReport:
        """
        Perform health analysis on image bytes.

        Useful for mobile app integration where images come as bytes.

        Args:
            image_bytes: Image data as bytes
            mode: Optional override for analysis mode

        Returns:
            AnalysisReport with all health indicators
        """
        mode = mode or self.config.mode

        # Load from bytes
        image = self.preprocessor.load_from_bytes(image_bytes)
        metadata = self.preprocessor.assess_quality(image)

        # Normalize
        image = self.preprocessor.normalize(image)
        image = self.preprocessor.white_balance(image)

        # Run analysis
        if mode == AnalysisMode.NAILS:
            results = self._analyze_nails(image, metadata)
        elif mode == AnalysisMode.QUICK:
            results = self._analyze_quick(image, metadata)
        else:
            results = self._analyze_face(image, metadata)

        # Convert and generate report
        indicators = self._convert_to_indicators(results, metadata)
        warnings = self._collect_warnings(results, metadata)

        return self.report_generator.generate_report(
            indicators=indicators,
            image_quality=metadata.quality_score,
            warnings=warnings
        )

    def _analyze_face(
        self,
        image: np.ndarray,
        metadata: ImageMetadata
    ) -> Dict[str, AnalysisResult]:
        """Run full face analysis."""
        results = {}

        # Detect face first
        face_region = self.preprocessor.detect_face(image)

        # Run each enabled analyzer
        kwargs = {
            'face_region': face_region,
            'image_quality': metadata.quality_score
        }

        if 'face' in self.analyzers:
            results['face'] = self.analyzers['face'].analyze(image, **kwargs)

        if 'skin' in self.analyzers:
            results['skin'] = self.analyzers['skin'].analyze(image, **kwargs)

        if 'eyes' in self.analyzers:
            results['eyes'] = self.analyzers['eyes'].analyze(image, **kwargs)

        if 'lips' in self.analyzers:
            results['lips'] = self.analyzers['lips'].analyze(image, **kwargs)

        return results

    def _analyze_nails(
        self,
        image: np.ndarray,
        metadata: ImageMetadata
    ) -> Dict[str, AnalysisResult]:
        """Run nail-focused analysis."""
        results = {}

        if 'nails' not in self.analyzers:
            self.analyzers['nails'] = NailAnalyzer()

        results['nails'] = self.analyzers['nails'].analyze(
            image,
            image_quality=metadata.quality_score
        )

        return results

    def _analyze_quick(
        self,
        image: np.ndarray,
        metadata: ImageMetadata
    ) -> Dict[str, AnalysisResult]:
        """Run quick analysis with reduced indicators."""
        results = {}

        face_region = self.preprocessor.detect_face(image)
        kwargs = {
            'face_region': face_region,
            'image_quality': metadata.quality_score
        }

        # Only run face and skin analyzers for quick mode
        if 'face' in self.analyzers:
            results['face'] = self.analyzers['face'].analyze(image, **kwargs)

        if 'skin' in self.analyzers:
            results['skin'] = self.analyzers['skin'].analyze(image, **kwargs)

        return results

    def _convert_to_indicators(
        self,
        results: Dict[str, AnalysisResult],
        metadata: ImageMetadata
    ) -> List[HealthIndicator]:
        """Convert analysis results to HealthIndicator objects."""
        indicators = []

        for analyzer_name, result in results.items():
            if not result.success:
                continue

            for name, value in result.indicators.items():
                # Determine if indicator is inverted (higher = better)
                inverted = name in [
                    'skin_uniformity', 'skin_texture_score', 'skin_spot_score',
                    'eye_clarity', 'lip_health_score', 'lip_moisture',
                    'nail_health_score', 'facial_symmetry', 'complexion_score',
                    'facial_wellness', 'skin_evenness'
                ]

                # Classify the indicator
                level = self.report_generator.classify_indicator(
                    name, value, inverted=inverted
                )

                # Get description and recommendation
                description = self.INDICATOR_DESCRIPTIONS.get(
                    name,
                    f"Health indicator: {name}"
                )
                recommendation = self.report_generator.generate_recommendation(
                    name, level
                )

                # Skip if below confidence threshold
                if result.confidence < self.config.min_confidence:
                    continue

                indicator = HealthIndicator(
                    name=self._format_indicator_name(name),
                    value=value,
                    level=level,
                    description=description,
                    recommendation=recommendation,
                    confidence=result.confidence
                )
                indicators.append(indicator)

        return indicators

    def _format_indicator_name(self, name: str) -> str:
        """Format indicator name for display."""
        return name.replace('_', ' ').title()

    def _collect_warnings(
        self,
        results: Dict[str, AnalysisResult],
        metadata: ImageMetadata
    ) -> List[str]:
        """Collect warnings from all analyses."""
        warnings = []

        # Image quality warnings
        if metadata.quality_score < 50:
            warnings.append(
                "Image quality is low. Results may be less accurate. "
                "Try taking photos in better lighting."
            )
        elif metadata.quality_score < 70:
            warnings.append(
                "Image quality is moderate. "
                "Better lighting may improve accuracy."
            )

        if metadata.brightness < 50:
            warnings.append("Image appears too dark.")
        elif metadata.brightness > 200:
            warnings.append("Image appears overexposed.")

        if metadata.sharpness < 100:
            warnings.append("Image appears blurry. Try holding the camera steady.")

        # Collect analyzer warnings
        for result in results.values():
            warnings.extend(result.warnings)

        # Collect errors as warnings
        for analyzer_name, result in results.items():
            if not result.success:
                for error in result.errors:
                    warnings.append(f"{analyzer_name}: {error}")

        return warnings

    def get_supported_indicators(self) -> List[str]:
        """Get list of all supported health indicators."""
        return list(self.INDICATOR_DESCRIPTIONS.keys())

    def get_analysis_modes(self) -> List[str]:
        """Get list of available analysis modes."""
        return [mode.value for mode in AnalysisMode]


def analyze_image(
    image_path: str,
    mode: str = "face"
) -> Dict[str, Any]:
    """
    Convenience function for quick analysis.

    Args:
        image_path: Path to image file
        mode: Analysis mode ("face", "nails", "quick", "full")

    Returns:
        Dictionary with analysis results
    """
    mode_enum = AnalysisMode(mode)
    config = AnalysisConfig(mode=mode_enum)

    if mode_enum == AnalysisMode.NAILS:
        config.enable_nails = True

    analyzer = HealthAnalyzer(config)
    report = analyzer.analyze(image_path, mode_enum)

    return {
        'status': report.overall_status.value,
        'score': report.overall_score,
        'image_quality': report.image_quality_score,
        'indicators': [
            {
                'name': ind.name,
                'value': ind.value,
                'level': ind.level.value,
                'confidence': ind.confidence,
                'recommendation': ind.recommendation
            }
            for ind in report.indicators
        ],
        'warnings': report.warnings,
        'recommendations': report.recommendations
    }
