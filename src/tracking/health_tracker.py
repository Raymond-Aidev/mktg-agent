"""
Health Tracker Module

Stores and manages health indicator records over time.
Enables tracking changes and trends in health indicators.
"""

import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict, field
from pathlib import Path
import sqlite3
from enum import Enum


@dataclass
class HealthRecord:
    """Single health analysis record."""
    timestamp: str
    user_id: str
    indicators: Dict[str, float]
    image_quality: float
    confidence: float
    skin_type: Optional[int] = None
    details: Dict[str, Any] = field(default_factory=dict)
    notes: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'HealthRecord':
        return cls(**data)


class StorageBackend(Enum):
    """Storage backend types."""
    JSON = "json"
    SQLITE = "sqlite"


class HealthTracker:
    """
    Tracks health indicators over time.

    Features:
    - Store analysis results with timestamps
    - Retrieve historical data
    - Query by date range
    - Support multiple users
    - Export/import functionality
    """

    def __init__(
        self,
        storage_path: str = "~/.goldencheck/health_data",
        backend: StorageBackend = StorageBackend.SQLITE
    ):
        """
        Initialize health tracker.

        Args:
            storage_path: Path for data storage
            backend: Storage backend type (JSON or SQLITE)
        """
        self.storage_path = Path(os.path.expanduser(storage_path))
        self.storage_path.mkdir(parents=True, exist_ok=True)
        self.backend = backend

        if backend == StorageBackend.SQLITE:
            self._init_sqlite()
        else:
            self._init_json()

    def _init_sqlite(self):
        """Initialize SQLite database."""
        self.db_path = self.storage_path / "health_records.db"
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        # Create main records table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS health_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                user_id TEXT NOT NULL,
                image_quality REAL,
                confidence REAL,
                skin_type INTEGER,
                notes TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Create indicators table (one-to-many with records)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS health_indicators (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                record_id INTEGER NOT NULL,
                indicator_name TEXT NOT NULL,
                indicator_value REAL NOT NULL,
                FOREIGN KEY (record_id) REFERENCES health_records(id)
            )
        ''')

        # Create index for faster queries
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_records_user_time
            ON health_records(user_id, timestamp)
        ''')

        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_indicators_record
            ON health_indicators(record_id)
        ''')

        conn.commit()
        conn.close()

    def _init_json(self):
        """Initialize JSON storage."""
        self.json_path = self.storage_path / "health_records.json"
        if not self.json_path.exists():
            with open(self.json_path, 'w') as f:
                json.dump({"records": []}, f)

    def save_record(self, record: HealthRecord) -> int:
        """
        Save a health record.

        Args:
            record: HealthRecord to save

        Returns:
            Record ID
        """
        if self.backend == StorageBackend.SQLITE:
            return self._save_sqlite(record)
        else:
            return self._save_json(record)

    def _save_sqlite(self, record: HealthRecord) -> int:
        """Save record to SQLite."""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        # Insert main record
        cursor.execute('''
            INSERT INTO health_records
            (timestamp, user_id, image_quality, confidence, skin_type, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            record.timestamp,
            record.user_id,
            record.image_quality,
            record.confidence,
            record.skin_type,
            record.notes
        ))

        record_id = cursor.lastrowid

        # Insert indicators
        for name, value in record.indicators.items():
            cursor.execute('''
                INSERT INTO health_indicators (record_id, indicator_name, indicator_value)
                VALUES (?, ?, ?)
            ''', (record_id, name, value))

        conn.commit()
        conn.close()

        return record_id

    def _save_json(self, record: HealthRecord) -> int:
        """Save record to JSON file."""
        with open(self.json_path, 'r') as f:
            data = json.load(f)

        record_dict = record.to_dict()
        record_dict['id'] = len(data['records']) + 1

        data['records'].append(record_dict)

        with open(self.json_path, 'w') as f:
            json.dump(data, f, indent=2)

        return record_dict['id']

    def get_records(
        self,
        user_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100
    ) -> List[HealthRecord]:
        """
        Get health records for a user.

        Args:
            user_id: User identifier
            start_date: Optional start date filter
            end_date: Optional end date filter
            limit: Maximum records to return

        Returns:
            List of HealthRecord objects
        """
        if self.backend == StorageBackend.SQLITE:
            return self._get_sqlite(user_id, start_date, end_date, limit)
        else:
            return self._get_json(user_id, start_date, end_date, limit)

    def _get_sqlite(
        self,
        user_id: str,
        start_date: Optional[datetime],
        end_date: Optional[datetime],
        limit: int
    ) -> List[HealthRecord]:
        """Get records from SQLite."""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        query = '''
            SELECT id, timestamp, user_id, image_quality, confidence, skin_type, notes
            FROM health_records
            WHERE user_id = ?
        '''
        params = [user_id]

        if start_date:
            query += ' AND timestamp >= ?'
            params.append(start_date.isoformat())
        if end_date:
            query += ' AND timestamp <= ?'
            params.append(end_date.isoformat())

        query += ' ORDER BY timestamp DESC LIMIT ?'
        params.append(limit)

        cursor.execute(query, params)
        rows = cursor.fetchall()

        records = []
        for row in rows:
            record_id, timestamp, user_id, quality, confidence, skin_type, notes = row

            # Get indicators for this record
            cursor.execute('''
                SELECT indicator_name, indicator_value
                FROM health_indicators
                WHERE record_id = ?
            ''', (record_id,))

            indicators = {name: value for name, value in cursor.fetchall()}

            records.append(HealthRecord(
                timestamp=timestamp,
                user_id=user_id,
                indicators=indicators,
                image_quality=quality,
                confidence=confidence,
                skin_type=skin_type,
                notes=notes or ""
            ))

        conn.close()
        return records

    def _get_json(
        self,
        user_id: str,
        start_date: Optional[datetime],
        end_date: Optional[datetime],
        limit: int
    ) -> List[HealthRecord]:
        """Get records from JSON."""
        with open(self.json_path, 'r') as f:
            data = json.load(f)

        filtered = []
        for record_dict in data['records']:
            if record_dict['user_id'] != user_id:
                continue

            record_time = datetime.fromisoformat(record_dict['timestamp'])

            if start_date and record_time < start_date:
                continue
            if end_date and record_time > end_date:
                continue

            filtered.append(HealthRecord.from_dict(record_dict))

        # Sort by timestamp descending
        filtered.sort(key=lambda r: r.timestamp, reverse=True)

        return filtered[:limit]

    def get_indicator_history(
        self,
        user_id: str,
        indicator_name: str,
        days: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Get history of a specific indicator.

        Args:
            user_id: User identifier
            indicator_name: Name of the indicator
            days: Number of days to look back

        Returns:
            List of {timestamp, value, confidence} dicts
        """
        start_date = datetime.now() - timedelta(days=days)
        records = self.get_records(user_id, start_date=start_date)

        history = []
        for record in records:
            if indicator_name in record.indicators:
                history.append({
                    'timestamp': record.timestamp,
                    'value': record.indicators[indicator_name],
                    'confidence': record.confidence
                })

        # Sort chronologically
        history.sort(key=lambda x: x['timestamp'])
        return history

    def get_latest_record(self, user_id: str) -> Optional[HealthRecord]:
        """Get the most recent record for a user."""
        records = self.get_records(user_id, limit=1)
        return records[0] if records else None

    def get_statistics(
        self,
        user_id: str,
        indicator_name: str,
        days: int = 30
    ) -> Dict[str, float]:
        """
        Calculate statistics for an indicator.

        Args:
            user_id: User identifier
            indicator_name: Name of the indicator
            days: Number of days to analyze

        Returns:
            Dict with min, max, mean, std, trend
        """
        history = self.get_indicator_history(user_id, indicator_name, days)

        if not history:
            return {
                'min': 0, 'max': 0, 'mean': 0, 'std': 0,
                'count': 0, 'trend': 0
            }

        values = [h['value'] for h in history]
        import numpy as np

        stats = {
            'min': round(float(np.min(values)), 4),
            'max': round(float(np.max(values)), 4),
            'mean': round(float(np.mean(values)), 4),
            'std': round(float(np.std(values)), 4),
            'count': len(values),
        }

        # Calculate trend (slope of linear regression)
        if len(values) >= 2:
            x = np.arange(len(values))
            slope, _ = np.polyfit(x, values, 1)
            stats['trend'] = round(float(slope), 6)
        else:
            stats['trend'] = 0

        return stats

    def delete_records(
        self,
        user_id: str,
        before_date: Optional[datetime] = None
    ) -> int:
        """
        Delete records for a user.

        Args:
            user_id: User identifier
            before_date: Optional date to delete records before

        Returns:
            Number of records deleted
        """
        if self.backend == StorageBackend.SQLITE:
            return self._delete_sqlite(user_id, before_date)
        else:
            return self._delete_json(user_id, before_date)

    def _delete_sqlite(self, user_id: str, before_date: Optional[datetime]) -> int:
        """Delete records from SQLite."""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        # Get record IDs to delete
        if before_date:
            cursor.execute('''
                SELECT id FROM health_records
                WHERE user_id = ? AND timestamp < ?
            ''', (user_id, before_date.isoformat()))
        else:
            cursor.execute('''
                SELECT id FROM health_records WHERE user_id = ?
            ''', (user_id,))

        record_ids = [row[0] for row in cursor.fetchall()]

        if not record_ids:
            conn.close()
            return 0

        # Delete indicators
        cursor.execute(f'''
            DELETE FROM health_indicators
            WHERE record_id IN ({','.join('?' * len(record_ids))})
        ''', record_ids)

        # Delete records
        cursor.execute(f'''
            DELETE FROM health_records
            WHERE id IN ({','.join('?' * len(record_ids))})
        ''', record_ids)

        conn.commit()
        deleted = len(record_ids)
        conn.close()

        return deleted

    def _delete_json(self, user_id: str, before_date: Optional[datetime]) -> int:
        """Delete records from JSON."""
        with open(self.json_path, 'r') as f:
            data = json.load(f)

        original_count = len(data['records'])

        if before_date:
            data['records'] = [
                r for r in data['records']
                if r['user_id'] != user_id or
                datetime.fromisoformat(r['timestamp']) >= before_date
            ]
        else:
            data['records'] = [
                r for r in data['records']
                if r['user_id'] != user_id
            ]

        with open(self.json_path, 'w') as f:
            json.dump(data, f, indent=2)

        return original_count - len(data['records'])

    def export_data(self, user_id: str, format: str = 'json') -> str:
        """
        Export user data.

        Args:
            user_id: User identifier
            format: Export format ('json' or 'csv')

        Returns:
            Exported data as string
        """
        records = self.get_records(user_id, limit=10000)

        if format == 'json':
            return json.dumps([r.to_dict() for r in records], indent=2)
        elif format == 'csv':
            if not records:
                return "timestamp,indicator_name,value,confidence\n"

            lines = ["timestamp,indicator_name,value,confidence"]
            for record in records:
                for name, value in record.indicators.items():
                    lines.append(f"{record.timestamp},{name},{value},{record.confidence}")
            return "\n".join(lines)
        else:
            raise ValueError(f"Unsupported format: {format}")

    def import_data(self, data: str, format: str = 'json') -> int:
        """
        Import data from string.

        Args:
            data: Data string
            format: Import format ('json')

        Returns:
            Number of records imported
        """
        if format != 'json':
            raise ValueError(f"Unsupported format: {format}")

        records = json.loads(data)
        count = 0

        for record_dict in records:
            record = HealthRecord.from_dict(record_dict)
            self.save_record(record)
            count += 1

        return count
