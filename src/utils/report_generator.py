"""
Report Generator Module

Generates health analysis reports in various formats.
"""

import json
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum


class HealthStatus(Enum):
    """Overall health status categories."""
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    ATTENTION_NEEDED = "attention_needed"
    CONSULT_DOCTOR = "consult_doctor"


class IndicatorLevel(Enum):
    """Individual indicator severity levels."""
    NORMAL = "normal"
    MILD = "mild"
    MODERATE = "moderate"
    SIGNIFICANT = "significant"


@dataclass
class HealthIndicator:
    """Single health indicator result."""
    name: str
    value: float
    level: IndicatorLevel
    description: str
    recommendation: str
    confidence: float


@dataclass
class AnalysisReport:
    """Complete health analysis report."""
    timestamp: str
    image_quality_score: float
    overall_status: HealthStatus
    overall_score: float
    indicators: List[HealthIndicator]
    warnings: List[str]
    recommendations: List[str]
    disclaimer: str


class ReportGenerator:
    """
    Generates formatted health analysis reports.

    Supports multiple output formats:
    - JSON
    - Plain text
    - HTML
    """

    DISCLAIMER = (
        "This analysis is for informational purposes only and should not be "
        "considered medical advice. Consult a healthcare professional for "
        "proper medical diagnosis and treatment. Results may be affected by "
        "image quality, lighting conditions, and other factors."
    )

    INDICATOR_THRESHOLDS = {
        'yellowing': (0.1, 0.25, 0.4),      # mild, moderate, significant
        'pallor': (0.15, 0.3, 0.5),
        'cyanosis': (0.05, 0.15, 0.3),
        'redness': (0.2, 0.35, 0.5),
        'eye_redness': (0.1, 0.25, 0.4),
        'skin_uniformity': (0.7, 0.5, 0.3),  # Inverted: lower is worse
    }

    def __init__(self):
        pass

    def classify_indicator(
        self,
        name: str,
        value: float,
        inverted: bool = False
    ) -> IndicatorLevel:
        """
        Classify indicator value into severity level.

        Args:
            name: Indicator name
            value: Indicator value (0-1)
            inverted: If True, lower values are worse
        """
        thresholds = self.INDICATOR_THRESHOLDS.get(
            name,
            (0.15, 0.3, 0.5)  # Default thresholds
        )

        if inverted:
            if value >= thresholds[0]:
                return IndicatorLevel.NORMAL
            elif value >= thresholds[1]:
                return IndicatorLevel.MILD
            elif value >= thresholds[2]:
                return IndicatorLevel.MODERATE
            else:
                return IndicatorLevel.SIGNIFICANT
        else:
            if value <= thresholds[0]:
                return IndicatorLevel.NORMAL
            elif value <= thresholds[1]:
                return IndicatorLevel.MILD
            elif value <= thresholds[2]:
                return IndicatorLevel.MODERATE
            else:
                return IndicatorLevel.SIGNIFICANT

    def generate_recommendation(self, indicator: str, level: IndicatorLevel) -> str:
        """Generate recommendation based on indicator and level."""
        recommendations = {
            'yellowing': {
                IndicatorLevel.NORMAL: "Skin and eye color appear normal.",
                IndicatorLevel.MILD: "Slight yellowing detected. Monitor and ensure good hydration.",
                IndicatorLevel.MODERATE: "Noticeable yellowing. Consider consulting a healthcare provider.",
                IndicatorLevel.SIGNIFICANT: "Significant yellowing detected. Please consult a doctor promptly.",
            },
            'pallor': {
                IndicatorLevel.NORMAL: "Skin color appears healthy.",
                IndicatorLevel.MILD: "Slightly pale appearance. Ensure adequate iron intake and rest.",
                IndicatorLevel.MODERATE: "Noticeable pallor. Consider a blood test for anemia.",
                IndicatorLevel.SIGNIFICANT: "Significant pallor detected. Please consult a healthcare provider.",
            },
            'cyanosis': {
                IndicatorLevel.NORMAL: "No bluish discoloration detected.",
                IndicatorLevel.MILD: "Minor bluish tint. Check circulation and warmth.",
                IndicatorLevel.MODERATE: "Noticeable bluish tint. Monitor oxygen levels if possible.",
                IndicatorLevel.SIGNIFICANT: "Significant cyanosis detected. Seek medical attention.",
            },
            'redness': {
                IndicatorLevel.NORMAL: "Normal skin coloration.",
                IndicatorLevel.MILD: "Slight redness detected. May be temporary from activity or environment.",
                IndicatorLevel.MODERATE: "Moderate redness. Monitor for signs of inflammation or fever.",
                IndicatorLevel.SIGNIFICANT: "Significant redness detected. Consider consulting a healthcare provider.",
            },
            'eye_redness': {
                IndicatorLevel.NORMAL: "Eyes appear clear.",
                IndicatorLevel.MILD: "Slight eye redness. May be due to fatigue or dry eyes.",
                IndicatorLevel.MODERATE: "Moderate eye redness. Rest eyes and use lubricating drops if needed.",
                IndicatorLevel.SIGNIFICANT: "Significant eye redness. Consider consulting an eye doctor.",
            },
            'skin_uniformity': {
                IndicatorLevel.NORMAL: "Skin appears even and healthy.",
                IndicatorLevel.MILD: "Minor skin unevenness detected.",
                IndicatorLevel.MODERATE: "Noticeable skin variations. Consider dermatological evaluation.",
                IndicatorLevel.SIGNIFICANT: "Significant skin irregularities. Please consult a dermatologist.",
            },
        }

        default_rec = {
            IndicatorLevel.NORMAL: "Indicator appears normal.",
            IndicatorLevel.MILD: "Minor variation detected. Continue monitoring.",
            IndicatorLevel.MODERATE: "Moderate variation detected. Consider professional evaluation.",
            IndicatorLevel.SIGNIFICANT: "Significant variation detected. Please consult a healthcare provider.",
        }

        return recommendations.get(indicator, default_rec).get(level, default_rec[level])

    def calculate_overall_score(self, indicators: List[HealthIndicator]) -> float:
        """
        Calculate overall health score from individual indicators.

        Returns score from 0 (poor) to 100 (excellent).
        """
        if not indicators:
            return 50.0

        # Weight by confidence and severity
        total_score = 0.0
        total_weight = 0.0

        level_scores = {
            IndicatorLevel.NORMAL: 100,
            IndicatorLevel.MILD: 75,
            IndicatorLevel.MODERATE: 50,
            IndicatorLevel.SIGNIFICANT: 25,
        }

        for indicator in indicators:
            score = level_scores.get(indicator.level, 50)
            weight = indicator.confidence
            total_score += score * weight
            total_weight += weight

        if total_weight == 0:
            return 50.0

        return total_score / total_weight

    def determine_overall_status(self, score: float, indicators: List[HealthIndicator]) -> HealthStatus:
        """Determine overall health status from score and indicators."""
        # Check for any significant indicators
        has_significant = any(i.level == IndicatorLevel.SIGNIFICANT for i in indicators)
        has_moderate = any(i.level == IndicatorLevel.MODERATE for i in indicators)

        if has_significant:
            return HealthStatus.CONSULT_DOCTOR
        elif has_moderate or score < 60:
            return HealthStatus.ATTENTION_NEEDED
        elif score < 75:
            return HealthStatus.FAIR
        elif score < 90:
            return HealthStatus.GOOD
        else:
            return HealthStatus.EXCELLENT

    def generate_report(
        self,
        indicators: List[HealthIndicator],
        image_quality: float,
        warnings: Optional[List[str]] = None
    ) -> AnalysisReport:
        """Generate complete analysis report."""
        overall_score = self.calculate_overall_score(indicators)
        overall_status = self.determine_overall_status(overall_score, indicators)

        # Collect recommendations
        recommendations = []
        for indicator in indicators:
            if indicator.level != IndicatorLevel.NORMAL:
                recommendations.append(indicator.recommendation)

        # Add quality warning if needed
        if warnings is None:
            warnings = []

        if image_quality < 50:
            warnings.append(
                "Image quality is low, which may affect accuracy. "
                "Try taking photos in better lighting conditions."
            )

        return AnalysisReport(
            timestamp=datetime.now().isoformat(),
            image_quality_score=image_quality,
            overall_status=overall_status,
            overall_score=overall_score,
            indicators=indicators,
            warnings=warnings,
            recommendations=recommendations,
            disclaimer=self.DISCLAIMER
        )

    def to_json(self, report: AnalysisReport) -> str:
        """Convert report to JSON string."""
        def serialize(obj):
            if isinstance(obj, Enum):
                return obj.value
            elif hasattr(obj, '__dict__'):
                return {k: serialize(v) for k, v in obj.__dict__.items()}
            elif isinstance(obj, list):
                return [serialize(item) for item in obj]
            return obj

        data = serialize(report)
        return json.dumps(data, indent=2, ensure_ascii=False)

    def to_text(self, report: AnalysisReport) -> str:
        """Convert report to plain text format."""
        lines = []
        lines.append("=" * 60)
        lines.append("GOLDENCHECK HEALTH ANALYSIS REPORT")
        lines.append("=" * 60)
        lines.append(f"\nAnalysis Date: {report.timestamp}")
        lines.append(f"Image Quality: {report.image_quality_score:.1f}/100")
        lines.append(f"\nOverall Status: {report.overall_status.value.upper()}")
        lines.append(f"Overall Score: {report.overall_score:.1f}/100")

        if report.warnings:
            lines.append("\n--- WARNINGS ---")
            for warning in report.warnings:
                lines.append(f"  ! {warning}")

        lines.append("\n--- HEALTH INDICATORS ---")
        for indicator in report.indicators:
            status_symbol = {
                IndicatorLevel.NORMAL: "[OK]",
                IndicatorLevel.MILD: "[!]",
                IndicatorLevel.MODERATE: "[!!]",
                IndicatorLevel.SIGNIFICANT: "[!!!]",
            }.get(indicator.level, "[?]")

            lines.append(f"\n{indicator.name}")
            lines.append(f"  Status: {status_symbol} {indicator.level.value}")
            lines.append(f"  Value: {indicator.value:.2f}")
            lines.append(f"  Confidence: {indicator.confidence:.0%}")
            lines.append(f"  {indicator.description}")

        if report.recommendations:
            lines.append("\n--- RECOMMENDATIONS ---")
            for i, rec in enumerate(report.recommendations, 1):
                lines.append(f"  {i}. {rec}")

        lines.append("\n" + "-" * 60)
        lines.append("DISCLAIMER:")
        lines.append(report.disclaimer)
        lines.append("-" * 60)

        return "\n".join(lines)

    def to_html(self, report: AnalysisReport) -> str:
        """Convert report to HTML format."""
        status_colors = {
            HealthStatus.EXCELLENT: "#28a745",
            HealthStatus.GOOD: "#6cb85c",
            HealthStatus.FAIR: "#ffc107",
            HealthStatus.ATTENTION_NEEDED: "#fd7e14",
            HealthStatus.CONSULT_DOCTOR: "#dc3545",
        }

        level_colors = {
            IndicatorLevel.NORMAL: "#28a745",
            IndicatorLevel.MILD: "#ffc107",
            IndicatorLevel.MODERATE: "#fd7e14",
            IndicatorLevel.SIGNIFICANT: "#dc3545",
        }

        html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>GoldenCheck Health Report</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; background: #f5f5f5; }}
        .container {{ max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
        h1 {{ color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }}
        .overall {{ background: {status_colors[report.overall_status]}; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }}
        .indicator {{ background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid; }}
        .warning {{ background: #fff3cd; padding: 10px; border-radius: 5px; margin: 5px 0; }}
        .disclaimer {{ font-size: 0.85em; color: #666; margin-top: 30px; padding: 15px; background: #f8f9fa; border-radius: 5px; }}
        .score {{ font-size: 2em; font-weight: bold; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>GoldenCheck Health Analysis Report</h1>
        <p><strong>Analysis Date:</strong> {report.timestamp}</p>
        <p><strong>Image Quality:</strong> {report.image_quality_score:.1f}/100</p>

        <div class="overall">
            <h2>Overall Status: {report.overall_status.value.replace('_', ' ').title()}</h2>
            <div class="score">{report.overall_score:.0f}/100</div>
        </div>
"""

        if report.warnings:
            html += "<h3>Warnings</h3>"
            for warning in report.warnings:
                html += f'<div class="warning">⚠️ {warning}</div>'

        html += "<h3>Health Indicators</h3>"
        for indicator in report.indicators:
            color = level_colors[indicator.level]
            html += f"""
        <div class="indicator" style="border-color: {color};">
            <h4>{indicator.name}</h4>
            <p><strong>Status:</strong> <span style="color: {color};">{indicator.level.value.title()}</span></p>
            <p><strong>Value:</strong> {indicator.value:.2f} | <strong>Confidence:</strong> {indicator.confidence:.0%}</p>
            <p>{indicator.description}</p>
            <p><em>{indicator.recommendation}</em></p>
        </div>
"""

        if report.recommendations:
            html += "<h3>Recommendations</h3><ul>"
            for rec in report.recommendations:
                html += f"<li>{rec}</li>"
            html += "</ul>"

        html += f"""
        <div class="disclaimer">
            <strong>Disclaimer:</strong> {report.disclaimer}
        </div>
    </div>
</body>
</html>
"""
        return html
