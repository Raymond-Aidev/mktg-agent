"""
GoldenCheck Health Analyzer Engine

Main entry point for health analysis from smartphone photos.
Integrates all analyzer modules and generates comprehensive reports.

Features:
- Multi-region face analysis (skin, eyes, lips, tongue, face)
- Skin type detection and calibration
- Health indicator tracking over time
- Change evaluation and trend analysis
"""

import cv2
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum

from .analyzers import (
    SkinAnalyzer,
    EyeAnalyzer,
    LipAnalyzer,
    NailAnalyzer,
    FaceAnalyzer,
    TongueAnalyzer,
    AnalysisResult
)
from .utils.image_preprocessing import ImagePreprocessor, ImageMetadata
from .utils.color_utils import ColorAnalyzer, SkinTone
from .utils.skin_type_detector import SkinTypeDetector, FitzpatrickType
from .utils.report_generator import (
    ReportGenerator,
    HealthIndicator,
    IndicatorLevel,
    AnalysisReport
)
from .tracking import HealthTracker, HealthRecord, ChangeEvaluator, HealthTrendReport


class AnalysisMode(Enum):
    """Analysis mode selection."""
    FACE = "face"           # Full face analysis (skin, eyes, lips, face)
    TONGUE = "tongue"       # Include tongue analysis
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
    enable_tongue: bool = False
    enable_nails: bool = False
    enable_tracking: bool = True
    enable_skin_type_detection: bool = True
    min_confidence: float = 0.3
    generate_html_report: bool = False
    user_id: str = "default_user"
    storage_path: str = "~/.goldencheck/health_data"


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
        # Skin indicators
        'skin_yellowing': "Yellowing detected in skin",
        'skin_redness': "Redness level in skin",
        'skin_pallor': "Paleness detected in skin",
        'skin_uniformity': "Skin color uniformity",
        'skin_texture_score': "Skin texture quality",
        'skin_spot_score': "Skin spot/blemish assessment",
        # Eye indicators
        'eye_yellowing': "Yellowing in eye whites (sclera)",
        'eye_redness': "Redness in eyes",
        'eye_clarity': "Eye clarity and brightness",
        'dark_circles': "Dark circles under eyes",
        'anemia_index': "Anemia indicator from conjunctiva pallor",
        'jaundice_index': "Jaundice indicator from sclera color",
        # Lip indicators
        'lip_cyanosis': "Bluish tint in lips (low oxygen)",
        'lip_pallor': "Paleness in lips",
        'lip_dryness': "Lip dryness level",
        'lip_moisture': "Lip moisture level",
        'lip_health_score': "Overall lip health",
        'oxygen_saturation_index': "Oxygen saturation indicator",
        'circulation_index': "Circulation quality indicator",
        'dehydration_index': "Dehydration indicator",
        # Tongue indicators
        'tongue_color_score': "Tongue body color health",
        'tongue_pallor': "Paleness in tongue",
        'tongue_redness': "Redness in tongue",
        'tongue_purple': "Purple/bluish tint in tongue",
        'coating_thickness': "Tongue coating thickness",
        'coating_yellow': "Yellow coating on tongue",
        'tongue_moisture': "Tongue moisture level",
        'tongue_crack_index': "Tongue crack/fissure level",
        'tongue_health_score': "Overall tongue health",
        # Nail indicators
        'nail_cyanosis': "Bluish tint in nails",
        'nail_pallor': "Paleness in nails",
        'nail_yellowing': "Yellowing in nails",
        'nail_health_score': "Overall nail health",
        # Face indicators
        'facial_symmetry': "Facial symmetry score",
        'complexion_score': "Overall complexion quality",
        'facial_puffiness': "Facial puffiness/swelling",
        'facial_wellness': "Overall facial wellness",
        'skin_evenness': "Skin color evenness",
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
        self.skin_type_detector = SkinTypeDetector()

        # Initialize tracking system
        if self.config.enable_tracking:
            self.tracker = HealthTracker(storage_path=self.config.storage_path)
            self.change_evaluator = ChangeEvaluator(self.tracker)
        else:
            self.tracker = None
            self.change_evaluator = None

        # Detected skin type (set during analysis)
        self.detected_skin_type: Optional[FitzpatrickType] = None
        self.calibration_factors: Dict[str, float] = {}

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

        if self.config.enable_tongue:
            self.analyzers['tongue'] = TongueAnalyzer()

        if self.config.enable_nails:
            self.analyzers['nails'] = NailAnalyzer()

    def analyze(
        self,
        image_path: str,
        mode: Optional[AnalysisMode] = None,
        save_record: bool = True
    ) -> AnalysisReport:
        """
        Perform health analysis on an image.

        Args:
            image_path: Path to the image file
            mode: Optional override for analysis mode
            save_record: Whether to save the record for tracking

        Returns:
            AnalysisReport with all health indicators
        """
        mode = mode or self.config.mode

        # Preprocess image
        image, metadata = self.preprocessor.preprocess_for_analysis(image_path)

        # Detect face region
        face_region = self.preprocessor.detect_face(image)

        # Detect skin type for calibration
        if self.config.enable_skin_type_detection and face_region:
            skin_type_result = self.skin_type_detector.detect(image, face_region)
            self.detected_skin_type = skin_type_result.fitzpatrick_type
            self.calibration_factors = skin_type_result.calibration_factors

        # Run analysis based on mode
        if mode == AnalysisMode.NAILS:
            results = self._analyze_nails(image, metadata)
        elif mode == AnalysisMode.QUICK:
            results = self._analyze_quick(image, metadata)
        elif mode == AnalysisMode.TONGUE:
            results = self._analyze_with_tongue(image, metadata, face_region)
        elif mode == AnalysisMode.FULL:
            results = self._analyze_full(image, metadata, face_region)
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

        # Save record for tracking
        if save_record and self.tracker and self.config.enable_tracking:
            self._save_analysis_record(report, metadata)

        return report

    def _save_analysis_record(self, report: AnalysisReport, metadata: ImageMetadata):
        """Save analysis record for tracking."""
        # Extract indicator values
        indicator_values = {
            ind.name.lower().replace(' ', '_'): ind.value
            for ind in report.indicators
        }

        record = HealthRecord(
            timestamp=datetime.now().isoformat(),
            user_id=self.config.user_id,
            indicators=indicator_values,
            image_quality=metadata.quality_score,
            confidence=np.mean([ind.confidence for ind in report.indicators]) if report.indicators else 0,
            skin_type=self.detected_skin_type.value if self.detected_skin_type else None,
        )

        self.tracker.save_record(record)

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

    def _analyze_with_tongue(
        self,
        image: np.ndarray,
        metadata: ImageMetadata,
        face_region: Optional[Tuple[int, int, int, int]] = None
    ) -> Dict[str, AnalysisResult]:
        """Run face analysis including tongue."""
        results = self._analyze_face(image, metadata)

        kwargs = {
            'face_region': face_region,
            'image_quality': metadata.quality_score
        }

        # Add tongue analysis
        if 'tongue' not in self.analyzers:
            self.analyzers['tongue'] = TongueAnalyzer()

        results['tongue'] = self.analyzers['tongue'].analyze(image, **kwargs)

        return results

    def _analyze_full(
        self,
        image: np.ndarray,
        metadata: ImageMetadata,
        face_region: Optional[Tuple[int, int, int, int]] = None
    ) -> Dict[str, AnalysisResult]:
        """Run complete analysis with all analyzers."""
        results = self._analyze_with_tongue(image, metadata, face_region)

        # Add nails if present in image
        if 'nails' not in self.analyzers:
            self.analyzers['nails'] = NailAnalyzer()

        nail_result = self.analyzers['nails'].analyze(
            image,
            image_quality=metadata.quality_score
        )
        if nail_result.success:
            results['nails'] = nail_result

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

    # === Tracking Methods ===

    def get_health_history(
        self,
        days: int = 30,
        indicator: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get health history for the current user.

        Args:
            days: Number of days to retrieve
            indicator: Optional specific indicator to get history for

        Returns:
            List of historical records or indicator values
        """
        if not self.tracker:
            return []

        if indicator:
            return self.tracker.get_indicator_history(
                self.config.user_id, indicator, days
            )
        else:
            records = self.tracker.get_records(
                self.config.user_id,
                limit=100
            )
            return [r.to_dict() for r in records]

    def get_trend_report(self, days: int = 30) -> Optional[HealthTrendReport]:
        """
        Get comprehensive trend analysis report.

        Args:
            days: Analysis period in days

        Returns:
            HealthTrendReport with trends and recommendations
        """
        if not self.change_evaluator:
            return None

        return self.change_evaluator.generate_report(
            self.config.user_id, days
        )

    def get_indicator_statistics(
        self,
        indicator: str,
        days: int = 30
    ) -> Dict[str, float]:
        """
        Get statistics for a specific indicator.

        Args:
            indicator: Indicator name
            days: Analysis period

        Returns:
            Dict with min, max, mean, std, trend
        """
        if not self.tracker:
            return {}

        return self.tracker.get_statistics(
            self.config.user_id, indicator, days
        )

    def compare_with_baseline(
        self,
        current_report: AnalysisReport
    ) -> Dict[str, Any]:
        """
        Compare current analysis with historical baseline.

        Args:
            current_report: Current analysis report

        Returns:
            Comparison with improvements and declines
        """
        if not self.tracker:
            return {'error': 'Tracking not enabled'}

        # Get statistics for comparison
        comparison = {
            'timestamp': datetime.now().isoformat(),
            'indicators': {},
            'improved': [],
            'declined': [],
            'new_concerns': [],
        }

        for indicator in current_report.indicators:
            ind_name = indicator.name.lower().replace(' ', '_')
            stats = self.tracker.get_statistics(
                self.config.user_id, ind_name, 30
            )

            if stats['count'] == 0:
                continue

            current_val = indicator.value
            baseline = stats['mean']
            trend = stats['trend']

            deviation = current_val - baseline
            deviation_percent = deviation / baseline if baseline != 0 else 0

            comparison['indicators'][ind_name] = {
                'current': round(current_val, 4),
                'baseline': round(baseline, 4),
                'deviation': round(deviation, 4),
                'deviation_percent': round(deviation_percent, 4),
                'trend': round(trend, 6),
                'trend_direction': 'improving' if trend < 0 else 'declining' if trend > 0 else 'stable'
            }

            # Categorize change
            if abs(deviation_percent) > 0.1:  # 10% threshold
                if ind_name in self.change_evaluator.NEGATIVE_INDICATORS if self.change_evaluator else set():
                    if deviation > 0:
                        comparison['declined'].append(ind_name)
                    else:
                        comparison['improved'].append(ind_name)
                else:
                    if deviation < 0:
                        comparison['declined'].append(ind_name)
                    else:
                        comparison['improved'].append(ind_name)

        return comparison

    def export_health_data(self, format: str = 'json') -> str:
        """
        Export all health data for current user.

        Args:
            format: Export format ('json' or 'csv')

        Returns:
            Exported data as string
        """
        if not self.tracker:
            return ''

        return self.tracker.export_data(self.config.user_id, format)

    def get_alerts(self) -> List[Dict[str, Any]]:
        """
        Get current health alerts based on recent changes.

        Returns:
            List of alerts with severity and recommendations
        """
        if not self.change_evaluator:
            return []

        latest = self.tracker.get_latest_record(self.config.user_id)
        if not latest:
            return []

        alerts = self.change_evaluator.detect_changes(
            self.config.user_id, latest
        )

        return [
            {
                'indicator': a.indicator_name,
                'severity': a.severity.value,
                'change_type': a.change_type.value,
                'message': a.message,
                'change_percent': a.change_percent,
                'recommendation': a.recommendation,
            }
            for a in alerts
        ]


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
