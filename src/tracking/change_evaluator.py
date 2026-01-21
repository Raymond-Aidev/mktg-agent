"""
Change Evaluator Module

Evaluates changes in health indicators over time.
Provides trend analysis, alerts, and health recommendations.
"""

import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum

from .health_tracker import HealthTracker, HealthRecord


class TrendDirection(Enum):
    """Direction of indicator trend."""
    IMPROVING = "improving"
    STABLE = "stable"
    DECLINING = "declining"
    FLUCTUATING = "fluctuating"
    INSUFFICIENT_DATA = "insufficient_data"


class AlertSeverity(Enum):
    """Severity level of health alerts."""
    INFO = "info"
    WARNING = "warning"
    ATTENTION = "attention"
    URGENT = "urgent"


class ChangeType(Enum):
    """Type of change detected."""
    GRADUAL_INCREASE = "gradual_increase"
    GRADUAL_DECREASE = "gradual_decrease"
    SUDDEN_INCREASE = "sudden_increase"
    SUDDEN_DECREASE = "sudden_decrease"
    STABLE = "stable"
    NEW_ABNORMALITY = "new_abnormality"
    RECOVERED = "recovered"


@dataclass
class TrendAnalysis:
    """Analysis of indicator trend over time."""
    indicator_name: str
    direction: TrendDirection
    slope: float  # Rate of change per day
    confidence: float
    period_days: int
    start_value: float
    end_value: float
    change_percent: float
    volatility: float  # Standard deviation of changes
    prediction_7d: Optional[float] = None  # Predicted value in 7 days


@dataclass
class ChangeAlert:
    """Alert for significant health indicator change."""
    indicator_name: str
    severity: AlertSeverity
    change_type: ChangeType
    message: str
    current_value: float
    previous_value: float
    change_amount: float
    change_percent: float
    recommendation: str
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class HealthTrendReport:
    """Comprehensive health trend report."""
    user_id: str
    analysis_period: int  # Days
    overall_trend: TrendDirection
    overall_score_change: float
    indicator_trends: List[TrendAnalysis]
    alerts: List[ChangeAlert]
    improving_indicators: List[str]
    declining_indicators: List[str]
    stable_indicators: List[str]
    recommendations: List[str]
    generated_at: str = field(default_factory=lambda: datetime.now().isoformat())


class ChangeEvaluator:
    """
    Evaluates changes in health indicators over time.

    Features:
    - Trend analysis (improving/declining/stable)
    - Change detection (sudden vs gradual)
    - Alert generation for significant changes
    - Health recommendations based on trends
    - Predictive analysis
    """

    # Thresholds for change detection
    THRESHOLDS = {
        # Percentage change thresholds
        'significant_change_percent': 0.15,  # 15% change is significant
        'sudden_change_percent': 0.25,       # 25% change is sudden

        # Slope thresholds (per day)
        'significant_slope': 0.01,   # 1% per day
        'rapid_slope': 0.03,         # 3% per day

        # Minimum data points for analysis
        'min_data_points': 3,

        # Volatility threshold
        'high_volatility': 0.1,
    }

    # Indicator-specific thresholds (some indicators are more critical)
    INDICATOR_SENSITIVITY = {
        'eye_yellowing': 1.5,
        'jaundice_index': 1.5,
        'anemia_index': 1.3,
        'lip_cyanosis': 1.4,
        'oxygen_saturation_index': 1.5,
        'skin_pallor': 1.2,
        'tongue_purple': 1.3,
    }

    # Indicators where higher values are worse
    NEGATIVE_INDICATORS = {
        'eye_yellowing', 'eye_redness', 'jaundice_index', 'anemia_index',
        'lip_cyanosis', 'lip_pallor', 'lip_dryness', 'dehydration_index',
        'skin_yellowing', 'skin_redness', 'skin_pallor',
        'dark_circles', 'facial_puffiness',
        'tongue_pallor', 'tongue_purple', 'tongue_crack_index',
        'coating_thickness', 'coating_yellow',
        'nail_cyanosis', 'nail_pallor', 'nail_yellowing',
    }

    def __init__(self, tracker: HealthTracker):
        """
        Initialize change evaluator.

        Args:
            tracker: HealthTracker instance for data access
        """
        self.tracker = tracker

    def analyze_trend(
        self,
        user_id: str,
        indicator_name: str,
        days: int = 30
    ) -> TrendAnalysis:
        """
        Analyze trend for a specific indicator.

        Args:
            user_id: User identifier
            indicator_name: Name of indicator
            days: Number of days to analyze

        Returns:
            TrendAnalysis with trend details
        """
        history = self.tracker.get_indicator_history(user_id, indicator_name, days)

        if len(history) < self.THRESHOLDS['min_data_points']:
            return TrendAnalysis(
                indicator_name=indicator_name,
                direction=TrendDirection.INSUFFICIENT_DATA,
                slope=0,
                confidence=0,
                period_days=days,
                start_value=history[0]['value'] if history else 0,
                end_value=history[-1]['value'] if history else 0,
                change_percent=0,
                volatility=0,
            )

        values = np.array([h['value'] for h in history])
        confidences = np.array([h['confidence'] for h in history])

        # Calculate weighted statistics
        weights = confidences / np.sum(confidences)

        # Linear regression for trend
        x = np.arange(len(values))
        slope, intercept = np.polyfit(x, values, 1, w=weights)

        # Calculate volatility (standard deviation of changes)
        changes = np.diff(values)
        volatility = float(np.std(changes)) if len(changes) > 0 else 0

        # Determine direction
        direction = self._determine_direction(
            slope, values, indicator_name, volatility
        )

        # Calculate change percentage
        start_value = values[0]
        end_value = values[-1]
        if start_value != 0:
            change_percent = (end_value - start_value) / start_value
        else:
            change_percent = 0 if end_value == 0 else 1.0

        # Confidence based on data quality and consistency
        confidence = float(np.mean(confidences)) * (1 - min(1, volatility * 2))

        # Prediction for 7 days ahead
        prediction = intercept + slope * (len(values) + 7)
        prediction = max(0, min(1, prediction))  # Clamp to valid range

        return TrendAnalysis(
            indicator_name=indicator_name,
            direction=direction,
            slope=round(float(slope), 6),
            confidence=round(confidence, 3),
            period_days=days,
            start_value=round(float(start_value), 4),
            end_value=round(float(end_value), 4),
            change_percent=round(float(change_percent), 4),
            volatility=round(float(volatility), 4),
            prediction_7d=round(float(prediction), 4),
        )

    def _determine_direction(
        self,
        slope: float,
        values: np.ndarray,
        indicator_name: str,
        volatility: float
    ) -> TrendDirection:
        """Determine trend direction based on slope and volatility."""
        # Adjust threshold based on indicator sensitivity
        sensitivity = self.INDICATOR_SENSITIVITY.get(indicator_name, 1.0)
        threshold = self.THRESHOLDS['significant_slope'] / sensitivity

        # Check for high volatility (fluctuating)
        if volatility > self.THRESHOLDS['high_volatility']:
            return TrendDirection.FLUCTUATING

        # Determine direction based on slope
        is_negative_indicator = indicator_name in self.NEGATIVE_INDICATORS

        if abs(slope) < threshold:
            return TrendDirection.STABLE
        elif slope > 0:
            # Positive slope
            return TrendDirection.DECLINING if is_negative_indicator else TrendDirection.IMPROVING
        else:
            # Negative slope
            return TrendDirection.IMPROVING if is_negative_indicator else TrendDirection.DECLINING

    def detect_changes(
        self,
        user_id: str,
        current_record: HealthRecord,
        comparison_days: int = 7
    ) -> List[ChangeAlert]:
        """
        Detect significant changes from recent history.

        Args:
            user_id: User identifier
            current_record: Current analysis record
            comparison_days: Days to compare against

        Returns:
            List of ChangeAlert for significant changes
        """
        alerts = []

        # Get recent records for comparison
        start_date = datetime.now() - timedelta(days=comparison_days)
        recent_records = self.tracker.get_records(
            user_id, start_date=start_date, limit=10
        )

        if not recent_records:
            return alerts

        # Calculate average values from recent records
        recent_averages = self._calculate_averages(recent_records)

        # Compare current values to recent averages
        for indicator, current_value in current_record.indicators.items():
            if indicator not in recent_averages:
                # New indicator - check if abnormal
                alert = self._check_new_abnormality(indicator, current_value)
                if alert:
                    alerts.append(alert)
                continue

            prev_avg = recent_averages[indicator]['mean']
            prev_std = recent_averages[indicator]['std']

            # Calculate change
            change_amount = current_value - prev_avg
            change_percent = change_amount / prev_avg if prev_avg != 0 else 0

            # Determine if change is significant
            alert = self._evaluate_change(
                indicator, current_value, prev_avg, prev_std,
                change_amount, change_percent
            )

            if alert:
                alerts.append(alert)

        return alerts

    def _calculate_averages(
        self,
        records: List[HealthRecord]
    ) -> Dict[str, Dict[str, float]]:
        """Calculate average values from records."""
        indicator_values: Dict[str, List[float]] = {}

        for record in records:
            for name, value in record.indicators.items():
                if name not in indicator_values:
                    indicator_values[name] = []
                indicator_values[name].append(value)

        averages = {}
        for name, values in indicator_values.items():
            averages[name] = {
                'mean': float(np.mean(values)),
                'std': float(np.std(values)),
                'count': len(values),
            }

        return averages

    def _evaluate_change(
        self,
        indicator: str,
        current: float,
        previous: float,
        prev_std: float,
        change_amount: float,
        change_percent: float
    ) -> Optional[ChangeAlert]:
        """Evaluate if a change is significant enough to alert."""
        sensitivity = self.INDICATOR_SENSITIVITY.get(indicator, 1.0)
        is_negative = indicator in self.NEGATIVE_INDICATORS

        # Threshold adjustments
        sig_threshold = self.THRESHOLDS['significant_change_percent'] / sensitivity
        sudden_threshold = self.THRESHOLDS['sudden_change_percent'] / sensitivity

        abs_change = abs(change_percent)

        # Check if change is significant
        if abs_change < sig_threshold:
            return None

        # Determine change type and severity
        if abs_change >= sudden_threshold:
            if change_amount > 0:
                change_type = ChangeType.SUDDEN_INCREASE
            else:
                change_type = ChangeType.SUDDEN_DECREASE

            # Determine severity
            if is_negative:
                severity = AlertSeverity.URGENT if change_amount > 0 else AlertSeverity.INFO
            else:
                severity = AlertSeverity.INFO if change_amount > 0 else AlertSeverity.URGENT
        else:
            if change_amount > 0:
                change_type = ChangeType.GRADUAL_INCREASE
            else:
                change_type = ChangeType.GRADUAL_DECREASE

            if is_negative:
                severity = AlertSeverity.WARNING if change_amount > 0 else AlertSeverity.INFO
            else:
                severity = AlertSeverity.INFO if change_amount > 0 else AlertSeverity.WARNING

        # Generate message and recommendation
        message = self._generate_alert_message(
            indicator, change_type, change_percent, is_negative
        )
        recommendation = self._generate_recommendation(
            indicator, change_type, severity, is_negative
        )

        return ChangeAlert(
            indicator_name=indicator,
            severity=severity,
            change_type=change_type,
            message=message,
            current_value=round(current, 4),
            previous_value=round(previous, 4),
            change_amount=round(change_amount, 4),
            change_percent=round(change_percent, 4),
            recommendation=recommendation,
        )

    def _check_new_abnormality(
        self,
        indicator: str,
        value: float
    ) -> Optional[ChangeAlert]:
        """Check if a new indicator shows abnormal value."""
        is_negative = indicator in self.NEGATIVE_INDICATORS

        # Abnormal threshold
        abnormal_threshold = 0.3 if is_negative else 0.7

        if is_negative and value > abnormal_threshold:
            return ChangeAlert(
                indicator_name=indicator,
                severity=AlertSeverity.ATTENTION,
                change_type=ChangeType.NEW_ABNORMALITY,
                message=f"New indicator '{indicator}' shows elevated value",
                current_value=round(value, 4),
                previous_value=0,
                change_amount=round(value, 4),
                change_percent=1.0,
                recommendation=f"Monitor '{indicator}' in future analyses",
            )
        elif not is_negative and value < (1 - abnormal_threshold):
            return ChangeAlert(
                indicator_name=indicator,
                severity=AlertSeverity.ATTENTION,
                change_type=ChangeType.NEW_ABNORMALITY,
                message=f"New indicator '{indicator}' shows low value",
                current_value=round(value, 4),
                previous_value=0,
                change_amount=round(value, 4),
                change_percent=1.0,
                recommendation=f"Monitor '{indicator}' in future analyses",
            )

        return None

    def _generate_alert_message(
        self,
        indicator: str,
        change_type: ChangeType,
        change_percent: float,
        is_negative: bool
    ) -> str:
        """Generate human-readable alert message."""
        indicator_display = indicator.replace('_', ' ').title()
        percent_str = f"{abs(change_percent)*100:.1f}%"

        messages = {
            ChangeType.SUDDEN_INCREASE: f"{indicator_display} increased suddenly by {percent_str}",
            ChangeType.SUDDEN_DECREASE: f"{indicator_display} decreased suddenly by {percent_str}",
            ChangeType.GRADUAL_INCREASE: f"{indicator_display} has been increasing ({percent_str})",
            ChangeType.GRADUAL_DECREASE: f"{indicator_display} has been decreasing ({percent_str})",
            ChangeType.NEW_ABNORMALITY: f"New abnormality detected in {indicator_display}",
            ChangeType.RECOVERED: f"{indicator_display} has returned to normal range",
        }

        base_message = messages.get(change_type, f"Change detected in {indicator_display}")

        # Add interpretation
        if is_negative:
            if change_type in [ChangeType.SUDDEN_INCREASE, ChangeType.GRADUAL_INCREASE]:
                base_message += " (potentially concerning)"
            else:
                base_message += " (positive change)"
        else:
            if change_type in [ChangeType.SUDDEN_DECREASE, ChangeType.GRADUAL_DECREASE]:
                base_message += " (potentially concerning)"
            else:
                base_message += " (positive change)"

        return base_message

    def _generate_recommendation(
        self,
        indicator: str,
        change_type: ChangeType,
        severity: AlertSeverity,
        is_negative: bool
    ) -> str:
        """Generate recommendation based on change."""
        recommendations = {
            AlertSeverity.URGENT: (
                "Consider consulting a healthcare professional. "
                "Continue monitoring and take another measurement soon."
            ),
            AlertSeverity.ATTENTION: (
                "Monitor this indicator closely. "
                "Take measurements more frequently over the next few days."
            ),
            AlertSeverity.WARNING: (
                "Keep an eye on this trend. "
                "Consider lifestyle factors that might be contributing."
            ),
            AlertSeverity.INFO: (
                "Continue regular monitoring. "
                "This change appears to be positive."
            ),
        }

        # Add indicator-specific recommendations
        specific_recommendations = {
            'eye_yellowing': "Ensure adequate hydration and monitor for other symptoms.",
            'jaundice_index': "Consider having liver function tests if persists.",
            'anemia_index': "Consider iron-rich foods and possible iron supplementation.",
            'lip_cyanosis': "Monitor oxygen levels and respiratory function.",
            'oxygen_saturation_index': "Ensure good ventilation and deep breathing exercises.",
            'dehydration_index': "Increase fluid intake and monitor urine color.",
        }

        base_rec = recommendations.get(severity, "Continue monitoring.")
        specific_rec = specific_recommendations.get(indicator, "")

        if specific_rec:
            return f"{base_rec} {specific_rec}"
        return base_rec

    def generate_report(
        self,
        user_id: str,
        days: int = 30
    ) -> HealthTrendReport:
        """
        Generate comprehensive health trend report.

        Args:
            user_id: User identifier
            days: Analysis period in days

        Returns:
            HealthTrendReport with all trends and alerts
        """
        # Get all records for the period
        start_date = datetime.now() - timedelta(days=days)
        records = self.tracker.get_records(user_id, start_date=start_date)

        if not records:
            return HealthTrendReport(
                user_id=user_id,
                analysis_period=days,
                overall_trend=TrendDirection.INSUFFICIENT_DATA,
                overall_score_change=0,
                indicator_trends=[],
                alerts=[],
                improving_indicators=[],
                declining_indicators=[],
                stable_indicators=[],
                recommendations=["Not enough data for analysis. Continue regular monitoring."],
            )

        # Get all indicator names
        all_indicators = set()
        for record in records:
            all_indicators.update(record.indicators.keys())

        # Analyze each indicator
        trends = []
        improving = []
        declining = []
        stable = []

        for indicator in all_indicators:
            trend = self.analyze_trend(user_id, indicator, days)
            trends.append(trend)

            if trend.direction == TrendDirection.IMPROVING:
                improving.append(indicator)
            elif trend.direction == TrendDirection.DECLINING:
                declining.append(indicator)
            elif trend.direction == TrendDirection.STABLE:
                stable.append(indicator)

        # Detect changes from most recent record
        latest_record = records[0]
        alerts = self.detect_changes(user_id, latest_record)

        # Calculate overall trend
        improving_count = len(improving)
        declining_count = len(declining)

        if improving_count > declining_count * 2:
            overall_trend = TrendDirection.IMPROVING
        elif declining_count > improving_count * 2:
            overall_trend = TrendDirection.DECLINING
        elif declining_count > 0 or improving_count > 0:
            overall_trend = TrendDirection.FLUCTUATING
        else:
            overall_trend = TrendDirection.STABLE

        # Calculate overall score change
        overall_score_change = 0
        score_trends = [t for t in trends if 'health_score' in t.indicator_name.lower()]
        if score_trends:
            overall_score_change = sum(t.change_percent for t in score_trends) / len(score_trends)

        # Generate recommendations
        recommendations = self._generate_overall_recommendations(
            overall_trend, trends, alerts
        )

        return HealthTrendReport(
            user_id=user_id,
            analysis_period=days,
            overall_trend=overall_trend,
            overall_score_change=round(overall_score_change, 4),
            indicator_trends=trends,
            alerts=alerts,
            improving_indicators=improving,
            declining_indicators=declining,
            stable_indicators=stable,
            recommendations=recommendations,
        )

    def _generate_overall_recommendations(
        self,
        overall_trend: TrendDirection,
        trends: List[TrendAnalysis],
        alerts: List[ChangeAlert]
    ) -> List[str]:
        """Generate overall recommendations based on analysis."""
        recommendations = []

        # Trend-based recommendations
        if overall_trend == TrendDirection.IMPROVING:
            recommendations.append(
                "Your health indicators are generally improving. "
                "Continue your current healthy habits."
            )
        elif overall_trend == TrendDirection.DECLINING:
            recommendations.append(
                "Some health indicators are showing decline. "
                "Consider reviewing your lifestyle and consulting a healthcare provider."
            )
        elif overall_trend == TrendDirection.FLUCTUATING:
            recommendations.append(
                "Your health indicators show some variability. "
                "Try to maintain consistent measurement conditions for accurate tracking."
            )

        # Alert-based recommendations
        urgent_alerts = [a for a in alerts if a.severity == AlertSeverity.URGENT]
        if urgent_alerts:
            recommendations.append(
                f"IMPORTANT: {len(urgent_alerts)} indicator(s) require immediate attention. "
                "Please review the alerts and consider consulting a healthcare professional."
            )

        # Specific indicator recommendations
        negative_trends = [t for t in trends if t.direction == TrendDirection.DECLINING]
        for trend in negative_trends[:3]:  # Top 3 declining
            recommendations.append(
                f"Monitor '{trend.indicator_name.replace('_', ' ')}' closely "
                f"(declining {abs(trend.change_percent)*100:.1f}% over {trend.period_days} days)."
            )

        # General recommendation
        recommendations.append(
            "Continue regular health monitoring for best tracking results. "
            "Consistent timing and lighting conditions improve accuracy."
        )

        return recommendations

    def compare_records(
        self,
        record1: HealthRecord,
        record2: HealthRecord
    ) -> Dict[str, Any]:
        """
        Compare two health records.

        Args:
            record1: First record (usually older)
            record2: Second record (usually newer)

        Returns:
            Dict with comparison results
        """
        comparison = {
            'timestamp1': record1.timestamp,
            'timestamp2': record2.timestamp,
            'indicators': {},
            'improved': [],
            'declined': [],
            'unchanged': [],
            'new_in_record2': [],
        }

        all_indicators = set(record1.indicators.keys()) | set(record2.indicators.keys())

        for indicator in all_indicators:
            val1 = record1.indicators.get(indicator)
            val2 = record2.indicators.get(indicator)

            if val1 is None:
                comparison['new_in_record2'].append(indicator)
                comparison['indicators'][indicator] = {
                    'value1': None,
                    'value2': val2,
                    'change': None,
                }
                continue

            if val2 is None:
                comparison['indicators'][indicator] = {
                    'value1': val1,
                    'value2': None,
                    'change': None,
                }
                continue

            change = val2 - val1
            change_percent = change / val1 if val1 != 0 else 0

            is_negative = indicator in self.NEGATIVE_INDICATORS

            comparison['indicators'][indicator] = {
                'value1': round(val1, 4),
                'value2': round(val2, 4),
                'change': round(change, 4),
                'change_percent': round(change_percent, 4),
            }

            # Classify change
            if abs(change_percent) < 0.05:
                comparison['unchanged'].append(indicator)
            elif (change > 0 and is_negative) or (change < 0 and not is_negative):
                comparison['declined'].append(indicator)
            else:
                comparison['improved'].append(indicator)

        return comparison
