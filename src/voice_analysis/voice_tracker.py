"""
Voice Tracker Module

Stores and analyzes voice analysis records over time.
Provides trend analysis and change detection for cognitive monitoring.

Similar to health_tracker but specialized for voice/speech data.
"""

import json
import os
import sqlite3
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
from pathlib import Path

import numpy as np


class TrendDirection(Enum):
    """Direction of metric trend."""
    IMPROVING = "improving"
    STABLE = "stable"
    DECLINING = "declining"
    FLUCTUATING = "fluctuating"
    INSUFFICIENT_DATA = "insufficient_data"


class AlertLevel(Enum):
    """Alert severity levels."""
    INFO = "info"
    NOTICE = "notice"
    WARNING = "warning"
    ALERT = "alert"


@dataclass
class VoiceRecord:
    """A single voice analysis record."""
    timestamp: str
    user_id: str
    task_id: str

    # Core scores
    overall_score: float
    fluency_score: float
    articulation_score: float
    prosody_score: float
    timing_score: float

    # Key metrics
    speech_rate: float
    pause_burden_index: float
    rhythm_stability: float
    mean_pause_duration: float
    hesitation_ratio: float

    # Voice quality
    jitter: float = 0.0
    shimmer: float = 0.0
    hnr: float = 0.0

    # Metadata
    risk_level: str = "normal"
    confidence: float = 0.0
    audio_quality: float = 0.0

    # Additional metrics (flexible)
    extra_metrics: Dict[str, float] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        data = asdict(self)
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'VoiceRecord':
        """Create from dictionary."""
        return cls(**data)


@dataclass
class VoiceTrendAnalysis:
    """Trend analysis for a specific metric."""
    metric_name: str
    direction: TrendDirection
    slope: float  # Change per day
    current_value: float
    baseline_value: float
    change_percent: float
    confidence: float
    period_days: int
    data_points: int


@dataclass
class VoiceAlert:
    """Alert for significant changes."""
    timestamp: str
    metric_name: str
    level: AlertLevel
    message: str
    current_value: float
    previous_value: float
    change_percent: float
    recommendation: str


@dataclass
class VoiceTrendReport:
    """Comprehensive trend report."""
    user_id: str
    generated_at: str
    period_days: int
    record_count: int

    # Overall trends
    overall_trend: TrendDirection
    overall_score_change: float

    # Individual metric trends
    metric_trends: List[VoiceTrendAnalysis]

    # Categorized metrics
    improving_metrics: List[str]
    declining_metrics: List[str]
    stable_metrics: List[str]

    # Alerts
    alerts: List[VoiceAlert]

    # Recommendations
    recommendations: List[str]


class VoiceTracker:
    """
    Tracks voice analysis records over time.

    Features:
    - SQLite storage for persistent data
    - Trend analysis using linear regression
    - Change detection and alerting
    - Statistical analysis of metrics
    - Data export capabilities
    """

    # Metrics that should decrease over time for improvement
    NEGATIVE_METRICS = {
        'pause_burden_index', 'mean_pause_duration', 'hesitation_ratio',
        'jitter', 'shimmer',
    }

    # Thresholds for change detection
    CHANGE_THRESHOLDS = {
        'significant_change': 0.15,  # 15% change
        'warning_change': 0.25,      # 25% change
        'alert_change': 0.35,        # 35% change
    }

    def __init__(
        self,
        storage_path: str = "~/.goldencheck/voice_data",
        use_sqlite: bool = True
    ):
        """
        Initialize voice tracker.

        Args:
            storage_path: Directory for data storage
            use_sqlite: Use SQLite (True) or JSON (False) storage
        """
        self.storage_path = Path(os.path.expanduser(storage_path))
        self.storage_path.mkdir(parents=True, exist_ok=True)

        self.use_sqlite = use_sqlite

        if use_sqlite:
            self.db_path = self.storage_path / "voice_records.db"
            self._init_database()
        else:
            self.json_path = self.storage_path / "voice_records.json"
            self._records: List[VoiceRecord] = []
            self._load_json()

    def _init_database(self):
        """Initialize SQLite database."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS voice_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                user_id TEXT NOT NULL,
                task_id TEXT,
                overall_score REAL,
                fluency_score REAL,
                articulation_score REAL,
                prosody_score REAL,
                timing_score REAL,
                speech_rate REAL,
                pause_burden_index REAL,
                rhythm_stability REAL,
                mean_pause_duration REAL,
                hesitation_ratio REAL,
                jitter REAL,
                shimmer REAL,
                hnr REAL,
                risk_level TEXT,
                confidence REAL,
                audio_quality REAL,
                extra_metrics TEXT
            )
        ''')

        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_user_timestamp
            ON voice_records (user_id, timestamp)
        ''')

        conn.commit()
        conn.close()

    def _load_json(self):
        """Load records from JSON file."""
        if self.json_path.exists():
            with open(self.json_path, 'r') as f:
                data = json.load(f)
                self._records = [VoiceRecord.from_dict(r) for r in data]

    def _save_json(self):
        """Save records to JSON file."""
        with open(self.json_path, 'w') as f:
            json.dump([r.to_dict() for r in self._records], f, indent=2)

    def save_record(self, record: VoiceRecord):
        """
        Save a voice analysis record.

        Args:
            record: VoiceRecord to save
        """
        if self.use_sqlite:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute('''
                INSERT INTO voice_records (
                    timestamp, user_id, task_id,
                    overall_score, fluency_score, articulation_score,
                    prosody_score, timing_score,
                    speech_rate, pause_burden_index, rhythm_stability,
                    mean_pause_duration, hesitation_ratio,
                    jitter, shimmer, hnr,
                    risk_level, confidence, audio_quality,
                    extra_metrics
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                record.timestamp, record.user_id, record.task_id,
                record.overall_score, record.fluency_score, record.articulation_score,
                record.prosody_score, record.timing_score,
                record.speech_rate, record.pause_burden_index, record.rhythm_stability,
                record.mean_pause_duration, record.hesitation_ratio,
                record.jitter, record.shimmer, record.hnr,
                record.risk_level, record.confidence, record.audio_quality,
                json.dumps(record.extra_metrics)
            ))

            conn.commit()
            conn.close()
        else:
            self._records.append(record)
            self._save_json()

    def get_records(
        self,
        user_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        task_id: Optional[str] = None,
        limit: int = 100
    ) -> List[VoiceRecord]:
        """
        Get voice records for a user.

        Args:
            user_id: User identifier
            start_date: Start of date range
            end_date: End of date range
            task_id: Filter by specific task
            limit: Maximum records to return

        Returns:
            List of VoiceRecord objects
        """
        if self.use_sqlite:
            return self._get_records_sqlite(user_id, start_date, end_date, task_id, limit)
        else:
            return self._get_records_json(user_id, start_date, end_date, task_id, limit)

    def _get_records_sqlite(
        self,
        user_id: str,
        start_date: Optional[datetime],
        end_date: Optional[datetime],
        task_id: Optional[str],
        limit: int
    ) -> List[VoiceRecord]:
        """Get records from SQLite."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        query = "SELECT * FROM voice_records WHERE user_id = ?"
        params = [user_id]

        if start_date:
            query += " AND timestamp >= ?"
            params.append(start_date.isoformat())
        if end_date:
            query += " AND timestamp <= ?"
            params.append(end_date.isoformat())
        if task_id:
            query += " AND task_id = ?"
            params.append(task_id)

        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)

        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()

        records = []
        for row in rows:
            extra = json.loads(row['extra_metrics']) if row['extra_metrics'] else {}
            records.append(VoiceRecord(
                timestamp=row['timestamp'],
                user_id=row['user_id'],
                task_id=row['task_id'],
                overall_score=row['overall_score'],
                fluency_score=row['fluency_score'],
                articulation_score=row['articulation_score'],
                prosody_score=row['prosody_score'],
                timing_score=row['timing_score'],
                speech_rate=row['speech_rate'],
                pause_burden_index=row['pause_burden_index'],
                rhythm_stability=row['rhythm_stability'],
                mean_pause_duration=row['mean_pause_duration'],
                hesitation_ratio=row['hesitation_ratio'],
                jitter=row['jitter'],
                shimmer=row['shimmer'],
                hnr=row['hnr'],
                risk_level=row['risk_level'],
                confidence=row['confidence'],
                audio_quality=row['audio_quality'],
                extra_metrics=extra
            ))

        return records

    def _get_records_json(
        self,
        user_id: str,
        start_date: Optional[datetime],
        end_date: Optional[datetime],
        task_id: Optional[str],
        limit: int
    ) -> List[VoiceRecord]:
        """Get records from JSON storage."""
        filtered = [r for r in self._records if r.user_id == user_id]

        if start_date:
            filtered = [r for r in filtered if r.timestamp >= start_date.isoformat()]
        if end_date:
            filtered = [r for r in filtered if r.timestamp <= end_date.isoformat()]
        if task_id:
            filtered = [r for r in filtered if r.task_id == task_id]

        # Sort by timestamp descending
        filtered.sort(key=lambda r: r.timestamp, reverse=True)

        return filtered[:limit]

    def get_metric_history(
        self,
        user_id: str,
        metric_name: str,
        days: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Get history for a specific metric.

        Args:
            user_id: User identifier
            metric_name: Name of metric
            days: Number of days of history

        Returns:
            List of {timestamp, value, confidence} dicts
        """
        start_date = datetime.now() - timedelta(days=days)
        records = self.get_records(user_id, start_date=start_date, limit=1000)

        history = []
        for record in records:
            value = getattr(record, metric_name, None)
            if value is None and metric_name in record.extra_metrics:
                value = record.extra_metrics[metric_name]

            if value is not None:
                history.append({
                    'timestamp': record.timestamp,
                    'value': value,
                    'confidence': record.confidence,
                })

        # Sort by timestamp ascending for trend analysis
        history.sort(key=lambda x: x['timestamp'])
        return history

    def analyze_trend(
        self,
        user_id: str,
        metric_name: str,
        days: int = 30
    ) -> VoiceTrendAnalysis:
        """
        Analyze trend for a specific metric.

        Args:
            user_id: User identifier
            metric_name: Metric to analyze
            days: Analysis period

        Returns:
            VoiceTrendAnalysis object
        """
        history = self.get_metric_history(user_id, metric_name, days)

        if len(history) < 3:
            return VoiceTrendAnalysis(
                metric_name=metric_name,
                direction=TrendDirection.INSUFFICIENT_DATA,
                slope=0,
                current_value=history[-1]['value'] if history else 0,
                baseline_value=history[0]['value'] if history else 0,
                change_percent=0,
                confidence=0,
                period_days=days,
                data_points=len(history)
            )

        values = np.array([h['value'] for h in history])
        confidences = np.array([h['confidence'] for h in history])

        # Weighted linear regression
        weights = confidences / np.sum(confidences) if np.sum(confidences) > 0 else None
        x = np.arange(len(values))
        slope, intercept = np.polyfit(x, values, 1, w=weights)

        # Calculate statistics
        current_value = values[-1]
        baseline_value = values[0]
        change = current_value - baseline_value
        change_percent = change / baseline_value if baseline_value != 0 else 0

        # Determine direction
        is_negative = metric_name in self.NEGATIVE_METRICS
        volatility = np.std(np.diff(values)) if len(values) > 1 else 0

        if volatility > 0.1 * np.mean(values):
            direction = TrendDirection.FLUCTUATING
        elif abs(slope) < 0.01:
            direction = TrendDirection.STABLE
        elif slope > 0:
            direction = TrendDirection.DECLINING if is_negative else TrendDirection.IMPROVING
        else:
            direction = TrendDirection.IMPROVING if is_negative else TrendDirection.DECLINING

        return VoiceTrendAnalysis(
            metric_name=metric_name,
            direction=direction,
            slope=float(slope),
            current_value=float(current_value),
            baseline_value=float(baseline_value),
            change_percent=float(change_percent),
            confidence=float(np.mean(confidences)),
            period_days=days,
            data_points=len(history)
        )

    def detect_changes(
        self,
        user_id: str,
        current_record: VoiceRecord,
        comparison_days: int = 7
    ) -> List[VoiceAlert]:
        """
        Detect significant changes from recent history.

        Args:
            user_id: User identifier
            current_record: Current analysis record
            comparison_days: Days to compare against

        Returns:
            List of VoiceAlert for significant changes
        """
        alerts = []
        start_date = datetime.now() - timedelta(days=comparison_days)
        recent = self.get_records(user_id, start_date=start_date, limit=10)

        if not recent:
            return alerts

        # Metrics to check
        metrics = [
            'overall_score', 'fluency_score', 'articulation_score',
            'speech_rate', 'pause_burden_index', 'mean_pause_duration',
            'hesitation_ratio', 'jitter', 'shimmer'
        ]

        for metric in metrics:
            current_val = getattr(current_record, metric, None)
            if current_val is None:
                continue

            recent_vals = [getattr(r, metric, None) for r in recent]
            recent_vals = [v for v in recent_vals if v is not None]

            if not recent_vals:
                continue

            avg_recent = np.mean(recent_vals)
            change = current_val - avg_recent
            change_percent = abs(change / avg_recent) if avg_recent != 0 else 0

            if change_percent < self.CHANGE_THRESHOLDS['significant_change']:
                continue

            # Determine alert level
            if change_percent >= self.CHANGE_THRESHOLDS['alert_change']:
                level = AlertLevel.ALERT
            elif change_percent >= self.CHANGE_THRESHOLDS['warning_change']:
                level = AlertLevel.WARNING
            else:
                level = AlertLevel.NOTICE

            # Check if change is concerning
            is_negative = metric in self.NEGATIVE_METRICS
            is_concerning = (change > 0 and is_negative) or (change < 0 and not is_negative)

            if is_concerning:
                message = f"{metric.replace('_', ' ').title()} has {'increased' if change > 0 else 'decreased'} by {change_percent*100:.1f}%"
                recommendation = self._get_recommendation(metric, change, level)

                alerts.append(VoiceAlert(
                    timestamp=datetime.now().isoformat(),
                    metric_name=metric,
                    level=level,
                    message=message,
                    current_value=current_val,
                    previous_value=avg_recent,
                    change_percent=change_percent,
                    recommendation=recommendation
                ))

        return alerts

    def _get_recommendation(
        self,
        metric: str,
        change: float,
        level: AlertLevel
    ) -> str:
        """Generate recommendation for a metric change."""
        recommendations = {
            'overall_score': "Consider more frequent assessments to monitor this trend.",
            'fluency_score': "Practice reading exercises may help improve fluency.",
            'articulation_score': "Speaking exercises and reading aloud may help.",
            'speech_rate': "Try to maintain a comfortable, natural speaking pace.",
            'pause_burden_index': "Focus on continuous reading without long pauses.",
            'mean_pause_duration': "Practice phrase-based reading to reduce pause duration.",
            'hesitation_ratio': "Familiar text practice may reduce hesitations.",
            'jitter': "Stay hydrated and avoid speaking when fatigued.",
            'shimmer': "Proper breathing technique may help voice stability.",
        }

        base = recommendations.get(metric, "Monitor this metric in future assessments.")

        if level == AlertLevel.ALERT:
            base = "IMPORTANT: " + base + " Consider consulting a healthcare provider."

        return base

    def generate_trend_report(
        self,
        user_id: str,
        days: int = 30
    ) -> VoiceTrendReport:
        """
        Generate comprehensive trend report.

        Args:
            user_id: User identifier
            days: Analysis period

        Returns:
            VoiceTrendReport with complete analysis
        """
        records = self.get_records(user_id, limit=1000)
        start_date = datetime.now() - timedelta(days=days)
        period_records = [r for r in records if r.timestamp >= start_date.isoformat()]

        # Analyze all metrics
        metrics = [
            'overall_score', 'fluency_score', 'articulation_score',
            'prosody_score', 'timing_score', 'speech_rate',
            'pause_burden_index', 'rhythm_stability', 'mean_pause_duration'
        ]

        trends = []
        improving = []
        declining = []
        stable = []

        for metric in metrics:
            trend = self.analyze_trend(user_id, metric, days)
            trends.append(trend)

            if trend.direction == TrendDirection.IMPROVING:
                improving.append(metric)
            elif trend.direction == TrendDirection.DECLINING:
                declining.append(metric)
            elif trend.direction == TrendDirection.STABLE:
                stable.append(metric)

        # Overall trend
        if len(improving) > len(declining) * 2:
            overall = TrendDirection.IMPROVING
        elif len(declining) > len(improving) * 2:
            overall = TrendDirection.DECLINING
        elif len(declining) > 0 or len(improving) > 0:
            overall = TrendDirection.FLUCTUATING
        else:
            overall = TrendDirection.STABLE

        # Overall score change
        overall_trend = self.analyze_trend(user_id, 'overall_score', days)
        overall_change = overall_trend.change_percent

        # Get alerts from most recent record
        alerts = []
        if period_records:
            alerts = self.detect_changes(user_id, period_records[0])

        # Generate recommendations
        recommendations = self._generate_report_recommendations(
            overall, declining, alerts
        )

        return VoiceTrendReport(
            user_id=user_id,
            generated_at=datetime.now().isoformat(),
            period_days=days,
            record_count=len(period_records),
            overall_trend=overall,
            overall_score_change=overall_change,
            metric_trends=trends,
            improving_metrics=improving,
            declining_metrics=declining,
            stable_metrics=stable,
            alerts=alerts,
            recommendations=recommendations
        )

    def _generate_report_recommendations(
        self,
        overall: TrendDirection,
        declining: List[str],
        alerts: List[VoiceAlert]
    ) -> List[str]:
        """Generate report recommendations."""
        recs = []

        if overall == TrendDirection.IMPROVING:
            recs.append("Your speech patterns are showing positive trends. Continue your current activities.")
        elif overall == TrendDirection.DECLINING:
            recs.append("Some speech metrics are showing decline. Consider increasing practice frequency.")
        elif overall == TrendDirection.FLUCTUATING:
            recs.append("Your metrics show variability. Try to maintain consistent conditions for assessments.")

        if 'pause_burden_index' in declining:
            recs.append("Focus on continuous reading practice to improve pause patterns.")

        if any(a.level == AlertLevel.ALERT for a in alerts):
            recs.append("Review the alerts and consider discussing with a healthcare provider.")

        recs.append("Regular practice with reading tasks supports speech fluency maintenance.")

        return recs

    def export_data(
        self,
        user_id: str,
        format: str = 'json'
    ) -> str:
        """
        Export all data for a user.

        Args:
            user_id: User identifier
            format: 'json' or 'csv'

        Returns:
            Exported data as string
        """
        records = self.get_records(user_id, limit=10000)

        if format == 'json':
            return json.dumps([r.to_dict() for r in records], indent=2)
        elif format == 'csv':
            if not records:
                return ""

            headers = list(records[0].to_dict().keys())
            lines = [','.join(headers)]

            for record in records:
                data = record.to_dict()
                values = [str(data.get(h, '')) for h in headers]
                lines.append(','.join(values))

            return '\n'.join(lines)
        else:
            raise ValueError(f"Unsupported format: {format}")

    def get_statistics(
        self,
        user_id: str,
        metric: str,
        days: int = 30
    ) -> Dict[str, float]:
        """
        Get statistics for a metric.

        Args:
            user_id: User identifier
            metric: Metric name
            days: Analysis period

        Returns:
            Dict with min, max, mean, std, etc.
        """
        history = self.get_metric_history(user_id, metric, days)

        if not history:
            return {'count': 0}

        values = [h['value'] for h in history]

        return {
            'count': len(values),
            'min': float(np.min(values)),
            'max': float(np.max(values)),
            'mean': float(np.mean(values)),
            'std': float(np.std(values)),
            'median': float(np.median(values)),
            'latest': values[-1] if values else 0,
        }
