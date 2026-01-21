"""
Prosodic Analyzer Module

Analyzes prosodic features: speech rate, pauses, rhythm, and intonation patterns.
Based on research showing pause patterns and speech rate are significant markers
for cognitive impairment detection.

References:
- Cambridge Meta-analysis on speech pause and speech rate for MCI/AD evaluation
- Frontiers 2024: Automatic speech analysis for detecting cognitive decline
"""

import numpy as np
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any
from enum import Enum

try:
    import librosa
    LIBROSA_AVAILABLE = True
except ImportError:
    LIBROSA_AVAILABLE = False


class PauseType(Enum):
    """Types of pauses in speech."""
    SHORT = "short"          # < 200ms - normal breathing/articulation
    MEDIUM = "medium"        # 200-500ms - phrase boundary
    LONG = "long"            # 500-1000ms - sentence boundary or hesitation
    EXTENDED = "extended"    # > 1000ms - cognitive processing difficulty


class RhythmPattern(Enum):
    """Speech rhythm patterns."""
    REGULAR = "regular"           # Consistent rhythm
    SLIGHTLY_IRREGULAR = "slightly_irregular"  # Minor variations
    IRREGULAR = "irregular"       # Significant variations
    HIGHLY_IRREGULAR = "highly_irregular"  # Very inconsistent


@dataclass
class PauseInfo:
    """Information about a detected pause."""
    start_time: float  # seconds
    end_time: float
    duration: float
    pause_type: PauseType
    position: str  # "initial", "medial", "final"


@dataclass
class ProsodicFeatures:
    """Comprehensive prosodic features."""
    # Speech timing (seconds)
    total_duration: float = 0.0
    speech_duration: float = 0.0  # Time spent speaking
    silence_duration: float = 0.0  # Time in pauses

    # Speech rate metrics
    speech_rate: float = 0.0  # syllables per second (estimated)
    articulation_rate: float = 0.0  # syllables per second excluding pauses
    phonation_ratio: float = 0.0  # speech_duration / total_duration

    # Pause metrics
    pause_count: int = 0
    pause_rate: float = 0.0  # pauses per minute
    mean_pause_duration: float = 0.0
    max_pause_duration: float = 0.0
    pause_duration_std: float = 0.0

    # Pause type distribution
    short_pause_count: int = 0
    medium_pause_count: int = 0
    long_pause_count: int = 0
    extended_pause_count: int = 0

    # Rhythm metrics
    rhythm_regularity: float = 0.0  # 0-1, higher = more regular
    rhythm_pattern: RhythmPattern = RhythmPattern.REGULAR
    inter_pause_interval_mean: float = 0.0
    inter_pause_interval_std: float = 0.0

    # Intonation/Pitch dynamics
    pitch_variation: float = 0.0  # F0 coefficient of variation
    pitch_range_used: float = 0.0  # Actual range / expected range

    # Fluency indicators
    fluency_score: float = 0.0  # 0-100
    hesitation_ratio: float = 0.0  # (long + extended pauses) / total pauses

    # Raw pause data for tracking
    pauses: List[PauseInfo] = field(default_factory=list)


class ProsodicAnalyzer:
    """
    Analyzes prosodic features from speech audio.

    Key metrics analyzed:
    1. Speech rate and articulation rate
    2. Pause frequency, duration, and patterns
    3. Rhythm regularity
    4. Pitch variation and intonation

    Research shows that:
    - Longer pauses correlate with cognitive impairment (1.20 SD for AD)
    - Reduced speech rate indicates processing difficulties
    - Irregular rhythm patterns may indicate cognitive decline
    """

    # Pause duration thresholds (seconds)
    PAUSE_THRESHOLDS = {
        'short': 0.2,      # < 200ms
        'medium': 0.5,     # 200-500ms
        'long': 1.0,       # 500-1000ms
        'extended': 1.0,   # > 1000ms
    }

    # Reference values (based on healthy adult speakers)
    REFERENCE_VALUES = {
        'speech_rate': 4.0,  # syllables/second
        'articulation_rate': 5.0,
        'pause_rate': 12.0,  # pauses/minute
        'mean_pause_duration': 0.4,  # seconds
        'phonation_ratio': 0.65,
        'rhythm_cv': 0.3,  # coefficient of variation
    }

    # Weights for fluency score calculation
    FLUENCY_WEIGHTS = {
        'speech_rate': 0.20,
        'pause_pattern': 0.25,
        'rhythm': 0.20,
        'phonation': 0.15,
        'hesitation': 0.20,
    }

    def __init__(
        self,
        min_pause_duration: float = 0.15,
        silence_threshold_db: float = -35
    ):
        """
        Initialize prosodic analyzer.

        Args:
            min_pause_duration: Minimum duration to consider as pause (seconds)
            silence_threshold_db: Energy threshold for silence detection (dB)
        """
        self.min_pause_duration = min_pause_duration
        self.silence_threshold_db = silence_threshold_db

    def analyze(
        self,
        audio: np.ndarray,
        sr: int,
        expected_syllables: Optional[int] = None
    ) -> ProsodicFeatures:
        """
        Analyze prosodic features from audio.

        Args:
            audio: Audio waveform
            sr: Sample rate
            expected_syllables: Expected number of syllables (if known from text)

        Returns:
            ProsodicFeatures object with all metrics
        """
        features = ProsodicFeatures()

        # Get total duration
        features.total_duration = len(audio) / sr

        # Detect pauses
        pauses = self._detect_pauses(audio, sr)
        features.pauses = pauses

        # Calculate speech/silence durations
        features.silence_duration = sum(p.duration for p in pauses)
        features.speech_duration = features.total_duration - features.silence_duration

        # Phonation ratio
        if features.total_duration > 0:
            features.phonation_ratio = features.speech_duration / features.total_duration

        # Pause statistics
        features.pause_count = len(pauses)
        if features.total_duration > 0:
            features.pause_rate = (features.pause_count / features.total_duration) * 60

        if pauses:
            durations = [p.duration for p in pauses]
            features.mean_pause_duration = float(np.mean(durations))
            features.max_pause_duration = float(np.max(durations))
            features.pause_duration_std = float(np.std(durations))

            # Count by type
            for p in pauses:
                if p.pause_type == PauseType.SHORT:
                    features.short_pause_count += 1
                elif p.pause_type == PauseType.MEDIUM:
                    features.medium_pause_count += 1
                elif p.pause_type == PauseType.LONG:
                    features.long_pause_count += 1
                elif p.pause_type == PauseType.EXTENDED:
                    features.extended_pause_count += 1

        # Hesitation ratio
        hesitation_count = features.long_pause_count + features.extended_pause_count
        if features.pause_count > 0:
            features.hesitation_ratio = hesitation_count / features.pause_count

        # Estimate syllable count and speech rate
        estimated_syllables = self._estimate_syllable_count(audio, sr)
        if expected_syllables is not None:
            syllables = expected_syllables
        else:
            syllables = estimated_syllables

        if features.total_duration > 0:
            features.speech_rate = syllables / features.total_duration

        if features.speech_duration > 0:
            features.articulation_rate = syllables / features.speech_duration

        # Rhythm analysis
        rhythm_features = self._analyze_rhythm(audio, sr, pauses)
        features.rhythm_regularity = rhythm_features['regularity']
        features.rhythm_pattern = rhythm_features['pattern']
        features.inter_pause_interval_mean = rhythm_features['ipi_mean']
        features.inter_pause_interval_std = rhythm_features['ipi_std']

        # Pitch variation
        pitch_features = self._analyze_pitch_dynamics(audio, sr)
        features.pitch_variation = pitch_features['cv']
        features.pitch_range_used = pitch_features['range_ratio']

        # Calculate fluency score
        features.fluency_score = self._calculate_fluency_score(features)

        return features

    def _detect_pauses(
        self,
        audio: np.ndarray,
        sr: int
    ) -> List[PauseInfo]:
        """
        Detect pauses in speech.

        Args:
            audio: Audio waveform
            sr: Sample rate

        Returns:
            List of detected pauses
        """
        pauses = []

        # Frame parameters
        hop_length = int(sr * 0.01)  # 10ms
        frame_length = int(sr * 0.025)  # 25ms

        # Compute RMS energy
        rms = librosa.feature.rms(
            y=audio,
            frame_length=frame_length,
            hop_length=hop_length
        )[0]

        # Convert to dB
        rms_db = librosa.amplitude_to_db(rms, ref=np.max)

        # Find silence regions
        is_silence = rms_db < self.silence_threshold_db

        # Track pause regions
        in_pause = False
        pause_start = 0

        for i, silence in enumerate(is_silence):
            if silence and not in_pause:
                # Start of pause
                in_pause = True
                pause_start = i
            elif not silence and in_pause:
                # End of pause
                in_pause = False
                pause_end = i

                # Calculate duration
                start_time = pause_start * hop_length / sr
                end_time = pause_end * hop_length / sr
                duration = end_time - start_time

                if duration >= self.min_pause_duration:
                    # Classify pause type
                    if duration < self.PAUSE_THRESHOLDS['short']:
                        pause_type = PauseType.SHORT
                    elif duration < self.PAUSE_THRESHOLDS['medium']:
                        pause_type = PauseType.MEDIUM
                    elif duration < self.PAUSE_THRESHOLDS['long']:
                        pause_type = PauseType.LONG
                    else:
                        pause_type = PauseType.EXTENDED

                    # Determine position
                    relative_pos = start_time / (len(audio) / sr)
                    if relative_pos < 0.1:
                        position = "initial"
                    elif relative_pos > 0.9:
                        position = "final"
                    else:
                        position = "medial"

                    pauses.append(PauseInfo(
                        start_time=start_time,
                        end_time=end_time,
                        duration=duration,
                        pause_type=pause_type,
                        position=position
                    ))

        return pauses

    def _estimate_syllable_count(
        self,
        audio: np.ndarray,
        sr: int
    ) -> int:
        """
        Estimate syllable count using onset detection.

        This is an approximation based on acoustic events.

        Args:
            audio: Audio waveform
            sr: Sample rate

        Returns:
            Estimated syllable count
        """
        # Use onset strength for syllable estimation
        onset_env = librosa.onset.onset_strength(y=audio, sr=sr)
        onsets = librosa.onset.onset_detect(
            onset_envelope=onset_env,
            sr=sr,
            backtrack=True
        )

        # Each onset roughly corresponds to a syllable
        # This is a simplification - actual syllable detection is more complex
        return len(onsets)

    def _analyze_rhythm(
        self,
        audio: np.ndarray,
        sr: int,
        pauses: List[PauseInfo]
    ) -> Dict[str, Any]:
        """
        Analyze speech rhythm patterns.

        Args:
            audio: Audio waveform
            sr: Sample rate
            pauses: Detected pauses

        Returns:
            Dict with rhythm metrics
        """
        result = {
            'regularity': 0.5,
            'pattern': RhythmPattern.REGULAR,
            'ipi_mean': 0.0,
            'ipi_std': 0.0,
        }

        if len(pauses) < 2:
            return result

        # Calculate inter-pause intervals
        intervals = []
        for i in range(len(pauses) - 1):
            interval = pauses[i + 1].start_time - pauses[i].end_time
            if interval > 0:
                intervals.append(interval)

        if not intervals:
            return result

        ipi_mean = float(np.mean(intervals))
        ipi_std = float(np.std(intervals))
        result['ipi_mean'] = ipi_mean
        result['ipi_std'] = ipi_std

        # Calculate coefficient of variation
        if ipi_mean > 0:
            cv = ipi_std / ipi_mean
        else:
            cv = 1.0

        # Regularity score (lower CV = more regular)
        # Reference: healthy speakers have CV around 0.3
        regularity = max(0, 1 - (cv / self.REFERENCE_VALUES['rhythm_cv']))
        result['regularity'] = min(1.0, max(0.0, regularity))

        # Classify pattern
        if cv < 0.25:
            result['pattern'] = RhythmPattern.REGULAR
        elif cv < 0.5:
            result['pattern'] = RhythmPattern.SLIGHTLY_IRREGULAR
        elif cv < 0.8:
            result['pattern'] = RhythmPattern.IRREGULAR
        else:
            result['pattern'] = RhythmPattern.HIGHLY_IRREGULAR

        return result

    def _analyze_pitch_dynamics(
        self,
        audio: np.ndarray,
        sr: int
    ) -> Dict[str, float]:
        """
        Analyze pitch variation and dynamics.

        Args:
            audio: Audio waveform
            sr: Sample rate

        Returns:
            Dict with pitch metrics
        """
        result = {
            'cv': 0.0,
            'range_ratio': 0.0,
        }

        try:
            # Extract F0 using pyin
            f0, voiced_flag, _ = librosa.pyin(
                audio,
                fmin=75,
                fmax=500,
                sr=sr
            )

            f0_voiced = f0[~np.isnan(f0)]

            if len(f0_voiced) > 10:
                f0_mean = np.mean(f0_voiced)
                f0_std = np.std(f0_voiced)

                # Coefficient of variation
                if f0_mean > 0:
                    result['cv'] = float(f0_std / f0_mean)

                # Range ratio (actual range vs expected for natural speech)
                actual_range = np.max(f0_voiced) - np.min(f0_voiced)
                expected_range = f0_mean * 0.5  # ~50% of mean is typical
                if expected_range > 0:
                    result['range_ratio'] = min(2.0, actual_range / expected_range)

        except Exception:
            pass

        return result

    def _calculate_fluency_score(self, features: ProsodicFeatures) -> float:
        """
        Calculate overall fluency score.

        Based on multiple prosodic indicators compared to reference values.

        Args:
            features: Extracted prosodic features

        Returns:
            Fluency score (0-100)
        """
        scores = {}

        # 1. Speech rate score
        ref_rate = self.REFERENCE_VALUES['speech_rate']
        rate_deviation = abs(features.speech_rate - ref_rate) / ref_rate
        scores['speech_rate'] = max(0, 100 * (1 - rate_deviation))

        # 2. Pause pattern score
        ref_pause = self.REFERENCE_VALUES['mean_pause_duration']
        pause_deviation = abs(features.mean_pause_duration - ref_pause) / ref_pause if ref_pause > 0 else 1
        # Penalize longer pauses more
        if features.mean_pause_duration > ref_pause:
            pause_deviation *= 1.5
        scores['pause_pattern'] = max(0, 100 * (1 - min(1, pause_deviation)))

        # 3. Rhythm score
        scores['rhythm'] = features.rhythm_regularity * 100

        # 4. Phonation ratio score
        ref_phonation = self.REFERENCE_VALUES['phonation_ratio']
        phonation_deviation = abs(features.phonation_ratio - ref_phonation) / ref_phonation
        scores['phonation'] = max(0, 100 * (1 - phonation_deviation))

        # 5. Hesitation score (inverse of hesitation ratio)
        scores['hesitation'] = max(0, 100 * (1 - features.hesitation_ratio))

        # Weighted average
        total_score = sum(
            scores[k] * self.FLUENCY_WEIGHTS[k]
            for k in self.FLUENCY_WEIGHTS
        )

        return round(total_score, 1)

    def compare_to_reference(
        self,
        features: ProsodicFeatures
    ) -> Dict[str, Dict[str, Any]]:
        """
        Compare features to reference values.

        Args:
            features: Extracted prosodic features

        Returns:
            Dict with comparison for each metric
        """
        comparisons = {}

        metrics = [
            ('speech_rate', features.speech_rate, 'syllables/sec'),
            ('articulation_rate', features.articulation_rate, 'syllables/sec'),
            ('pause_rate', features.pause_rate, 'pauses/min'),
            ('mean_pause_duration', features.mean_pause_duration, 'seconds'),
            ('phonation_ratio', features.phonation_ratio, 'ratio'),
        ]

        for name, value, unit in metrics:
            ref = self.REFERENCE_VALUES.get(name)
            if ref is not None and ref > 0:
                deviation = (value - ref) / ref
                if deviation > 0.2:
                    status = "above_normal"
                elif deviation < -0.2:
                    status = "below_normal"
                else:
                    status = "normal"

                comparisons[name] = {
                    'value': round(value, 3),
                    'reference': ref,
                    'deviation_percent': round(deviation * 100, 1),
                    'status': status,
                    'unit': unit,
                }

        return comparisons
