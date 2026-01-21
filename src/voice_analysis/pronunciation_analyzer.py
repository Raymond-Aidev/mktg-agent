"""
Pronunciation Analyzer Module

Analyzes pronunciation quality including articulation clarity,
formant patterns, and speech intelligibility.

Based on research showing pronunciation changes can indicate
cognitive and motor control decline in elderly populations.
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

try:
    import parselmouth
    from parselmouth.praat import call
    PARSELMOUTH_AVAILABLE = True
except ImportError:
    PARSELMOUTH_AVAILABLE = False


class ArticulationLevel(Enum):
    """Articulation quality levels."""
    EXCELLENT = "excellent"  # 90-100
    GOOD = "good"           # 75-89
    FAIR = "fair"           # 60-74
    POOR = "poor"           # 40-59
    VERY_POOR = "very_poor" # <40


class VoiceQualityLevel(Enum):
    """Voice quality assessment levels."""
    HEALTHY = "healthy"
    SLIGHTLY_IMPAIRED = "slightly_impaired"
    MODERATELY_IMPAIRED = "moderately_impaired"
    SIGNIFICANTLY_IMPAIRED = "significantly_impaired"


@dataclass
class FormantAnalysis:
    """Formant analysis results."""
    # Mean formant frequencies (Hz)
    f1_mean: float = 0.0  # First formant (vowel height)
    f2_mean: float = 0.0  # Second formant (vowel frontness)
    f3_mean: float = 0.0  # Third formant (speaker characteristics)

    # Formant stability (standard deviation)
    f1_std: float = 0.0
    f2_std: float = 0.0
    f3_std: float = 0.0

    # Formant space (vowel articulation precision)
    vowel_space_area: float = 0.0
    formant_centralization_ratio: float = 0.0


@dataclass
class VoiceQualityAnalysis:
    """Voice quality metrics."""
    # Perturbation measures
    jitter_percent: float = 0.0  # Pitch perturbation
    shimmer_percent: float = 0.0  # Amplitude perturbation

    # Noise measures
    hnr: float = 0.0  # Harmonics-to-noise ratio (dB)
    nhr: float = 0.0  # Noise-to-harmonics ratio

    # Voice breaks
    voice_break_count: int = 0
    voice_break_percent: float = 0.0

    # Quality assessment
    quality_level: VoiceQualityLevel = VoiceQualityLevel.HEALTHY


@dataclass
class PronunciationResult:
    """Complete pronunciation analysis result."""
    # Overall scores (0-100)
    pronunciation_score: float = 0.0
    articulation_score: float = 0.0
    clarity_score: float = 0.0
    consistency_score: float = 0.0

    # Level classification
    articulation_level: ArticulationLevel = ArticulationLevel.FAIR

    # Detailed analysis
    formant_analysis: FormantAnalysis = field(default_factory=FormantAnalysis)
    voice_quality: VoiceQualityAnalysis = field(default_factory=VoiceQualityAnalysis)

    # Spectral features
    spectral_clarity: float = 0.0
    spectral_tilt: float = 0.0

    # Comparison to reference
    deviation_from_standard: float = 0.0

    # Detailed metrics for tracking
    metrics: Dict[str, float] = field(default_factory=dict)

    # Warnings
    warnings: List[str] = field(default_factory=list)


class PronunciationAnalyzer:
    """
    Analyzes pronunciation quality and articulation.

    Key aspects analyzed:
    1. Formant patterns (vowel production quality)
    2. Voice quality (jitter, shimmer, HNR)
    3. Spectral characteristics (clarity, resonance)
    4. Articulation consistency

    Research basis:
    - Reduced vowel space indicates less precise articulation
    - Higher jitter/shimmer may indicate motor control issues
    - Lower HNR suggests voice quality degradation
    """

    # Reference values for healthy adult speech
    REFERENCE_VALUES = {
        # Voice quality (healthy ranges)
        'jitter_max': 1.04,      # % (pathological threshold)
        'shimmer_max': 3.81,     # % (pathological threshold)
        'hnr_min': 20.0,         # dB (below this is concerning)

        # Formant references (adult speaker averages)
        'f1_mean': 500,   # Hz
        'f2_mean': 1500,  # Hz
        'f3_mean': 2500,  # Hz

        # Spectral
        'spectral_tilt_normal': -6,  # dB/octave
    }

    # Weights for scoring
    SCORE_WEIGHTS = {
        'voice_quality': 0.25,
        'formant_stability': 0.25,
        'spectral_clarity': 0.25,
        'consistency': 0.25,
    }

    def __init__(self):
        """Initialize pronunciation analyzer."""
        pass

    def analyze(
        self,
        audio: np.ndarray,
        sr: int,
        reference_text: Optional[str] = None
    ) -> PronunciationResult:
        """
        Analyze pronunciation from audio.

        Args:
            audio: Audio waveform
            sr: Sample rate
            reference_text: Expected text (for future phoneme comparison)

        Returns:
            PronunciationResult with all metrics
        """
        result = PronunciationResult()

        # Voice quality analysis
        voice_quality = self._analyze_voice_quality(audio, sr)
        result.voice_quality = voice_quality

        # Formant analysis
        formant_analysis = self._analyze_formants(audio, sr)
        result.formant_analysis = formant_analysis

        # Spectral analysis
        spectral = self._analyze_spectral_features(audio, sr)
        result.spectral_clarity = spectral['clarity']
        result.spectral_tilt = spectral['tilt']

        # Calculate component scores
        voice_quality_score = self._score_voice_quality(voice_quality)
        formant_score = self._score_formant_stability(formant_analysis)
        spectral_score = self._score_spectral_clarity(spectral)
        consistency_score = self._calculate_consistency(audio, sr)

        result.articulation_score = (
            voice_quality_score * self.SCORE_WEIGHTS['voice_quality'] +
            formant_score * self.SCORE_WEIGHTS['formant_stability'] +
            spectral_score * self.SCORE_WEIGHTS['spectral_clarity'] +
            consistency_score * self.SCORE_WEIGHTS['consistency']
        )

        # Clarity score based on HNR and spectral features
        result.clarity_score = (voice_quality.hnr / 30 * 50 + spectral['clarity'] * 50)
        result.clarity_score = min(100, max(0, result.clarity_score))

        # Consistency score
        result.consistency_score = consistency_score

        # Overall pronunciation score
        result.pronunciation_score = (
            result.articulation_score * 0.4 +
            result.clarity_score * 0.3 +
            result.consistency_score * 0.3
        )

        # Classify articulation level
        result.articulation_level = self._classify_articulation(result.articulation_score)

        # Store detailed metrics
        result.metrics = {
            'jitter': voice_quality.jitter_percent,
            'shimmer': voice_quality.shimmer_percent,
            'hnr': voice_quality.hnr,
            'f1_stability': formant_analysis.f1_std,
            'f2_stability': formant_analysis.f2_std,
            'spectral_clarity': spectral['clarity'],
            'spectral_tilt': spectral['tilt'],
        }

        # Add warnings
        if voice_quality.jitter_percent > self.REFERENCE_VALUES['jitter_max']:
            result.warnings.append("Elevated pitch perturbation detected")
        if voice_quality.shimmer_percent > self.REFERENCE_VALUES['shimmer_max']:
            result.warnings.append("Elevated amplitude perturbation detected")
        if voice_quality.hnr < self.REFERENCE_VALUES['hnr_min']:
            result.warnings.append("Voice clarity below normal range")

        return result

    def _analyze_voice_quality(
        self,
        audio: np.ndarray,
        sr: int
    ) -> VoiceQualityAnalysis:
        """
        Analyze voice quality using Praat algorithms.

        Args:
            audio: Audio waveform
            sr: Sample rate

        Returns:
            VoiceQualityAnalysis object
        """
        result = VoiceQualityAnalysis()

        if PARSELMOUTH_AVAILABLE:
            try:
                sound = parselmouth.Sound(audio, sampling_frequency=sr)

                # Create point process for perturbation analysis
                pitch = call(sound, "To Pitch", 0.0, 75, 500)
                point_process = call(sound, "To PointProcess (periodic, cc)", 75, 500)

                # Jitter
                result.jitter_percent = call(
                    point_process, "Get jitter (local)", 0, 0, 0.0001, 0.02, 1.3
                ) * 100

                # Shimmer
                result.shimmer_percent = call(
                    [sound, point_process], "Get shimmer (local)",
                    0, 0, 0.0001, 0.02, 1.3, 1.6
                ) * 100

                # HNR
                harmonicity = call(sound, "To Harmonicity (cc)", 0.01, 75, 0.1, 1.0)
                result.hnr = call(harmonicity, "Get mean", 0, 0)
                if result.hnr > 0:
                    result.nhr = 1 / (10 ** (result.hnr / 10))

                # Voice breaks
                result.voice_break_percent = call(
                    [sound, pitch], "Count voiced frames"
                )

            except Exception:
                # Fallback to librosa-based estimation
                result = self._estimate_voice_quality_librosa(audio, sr)
        else:
            result = self._estimate_voice_quality_librosa(audio, sr)

        # Classify quality level
        result.quality_level = self._classify_voice_quality(result)

        return result

    def _estimate_voice_quality_librosa(
        self,
        audio: np.ndarray,
        sr: int
    ) -> VoiceQualityAnalysis:
        """
        Estimate voice quality using librosa (fallback).

        Args:
            audio: Audio waveform
            sr: Sample rate

        Returns:
            VoiceQualityAnalysis object
        """
        result = VoiceQualityAnalysis()

        try:
            # Estimate F0 for jitter calculation
            f0, voiced_flag, _ = librosa.pyin(audio, fmin=75, fmax=500, sr=sr)
            f0_voiced = f0[~np.isnan(f0)]

            if len(f0_voiced) > 10:
                # Approximate jitter as F0 variability
                f0_diff = np.abs(np.diff(f0_voiced))
                result.jitter_percent = float(np.mean(f0_diff) / np.mean(f0_voiced) * 100)

            # Estimate shimmer from amplitude variations
            rms = librosa.feature.rms(y=audio)[0]
            if len(rms) > 10:
                rms_diff = np.abs(np.diff(rms))
                result.shimmer_percent = float(np.mean(rms_diff) / np.mean(rms) * 100)

            # Estimate HNR from spectral flatness
            flatness = librosa.feature.spectral_flatness(y=audio)[0]
            mean_flatness = np.mean(flatness)
            if mean_flatness > 0:
                # Convert flatness to approximate HNR
                result.hnr = float(-10 * np.log10(mean_flatness))

        except Exception:
            pass

        return result

    def _analyze_formants(
        self,
        audio: np.ndarray,
        sr: int
    ) -> FormantAnalysis:
        """
        Analyze formant patterns.

        Args:
            audio: Audio waveform
            sr: Sample rate

        Returns:
            FormantAnalysis object
        """
        result = FormantAnalysis()

        if PARSELMOUTH_AVAILABLE:
            try:
                sound = parselmouth.Sound(audio, sampling_frequency=sr)

                # Extract formants
                formant = call(sound, "To Formant (burg)", 0.0, 5, 5500, 0.025, 50)

                # Get formant statistics
                result.f1_mean = call(formant, "Get mean", 1, 0, 0, "Hertz")
                result.f2_mean = call(formant, "Get mean", 2, 0, 0, "Hertz")
                result.f3_mean = call(formant, "Get mean", 3, 0, 0, "Hertz")

                result.f1_std = call(formant, "Get standard deviation", 1, 0, 0, "Hertz")
                result.f2_std = call(formant, "Get standard deviation", 2, 0, 0, "Hertz")
                result.f3_std = call(formant, "Get standard deviation", 3, 0, 0, "Hertz")

                # Calculate formant centralization ratio
                # Higher values indicate more centralized (less distinct) vowels
                if result.f1_mean > 0 and result.f2_mean > 0:
                    # Distance from schwa-like central vowel
                    f1_dist = abs(result.f1_mean - 500)
                    f2_dist = abs(result.f2_mean - 1500)
                    result.formant_centralization_ratio = 1 / (1 + (f1_dist + f2_dist) / 1000)

            except Exception:
                pass

        return result

    def _analyze_spectral_features(
        self,
        audio: np.ndarray,
        sr: int
    ) -> Dict[str, float]:
        """
        Analyze spectral characteristics.

        Args:
            audio: Audio waveform
            sr: Sample rate

        Returns:
            Dict with spectral metrics
        """
        result = {
            'clarity': 0.5,
            'tilt': 0.0,
            'centroid': 0.0,
            'bandwidth': 0.0,
        }

        try:
            # Spectral centroid (brightness)
            centroid = librosa.feature.spectral_centroid(y=audio, sr=sr)[0]
            result['centroid'] = float(np.mean(centroid))

            # Spectral bandwidth
            bandwidth = librosa.feature.spectral_bandwidth(y=audio, sr=sr)[0]
            result['bandwidth'] = float(np.mean(bandwidth))

            # Spectral contrast (clarity indicator)
            contrast = librosa.feature.spectral_contrast(y=audio, sr=sr)
            result['clarity'] = float(np.mean(contrast)) / 30  # Normalize

            # Spectral rolloff (energy distribution)
            rolloff = librosa.feature.spectral_rolloff(y=audio, sr=sr)[0]
            mean_rolloff = np.mean(rolloff)

            # Estimate spectral tilt
            if result['centroid'] > 0:
                result['tilt'] = float(-20 * np.log10(mean_rolloff / result['centroid']))

        except Exception:
            pass

        return result

    def _calculate_consistency(
        self,
        audio: np.ndarray,
        sr: int
    ) -> float:
        """
        Calculate speech consistency score.

        Measures how consistent the speech production is across the recording.

        Args:
            audio: Audio waveform
            sr: Sample rate

        Returns:
            Consistency score (0-100)
        """
        try:
            # Split audio into segments
            segment_length = int(sr * 0.5)  # 500ms segments
            n_segments = len(audio) // segment_length

            if n_segments < 2:
                return 50.0

            segment_features = []
            for i in range(n_segments):
                start = i * segment_length
                end = start + segment_length
                segment = audio[start:end]

                # Extract features per segment
                mfcc = librosa.feature.mfcc(y=segment, sr=sr, n_mfcc=13)
                segment_features.append(np.mean(mfcc, axis=1))

            # Calculate variance across segments
            features_array = np.array(segment_features)
            feature_std = np.mean(np.std(features_array, axis=0))

            # Lower variance = higher consistency
            # Normalize to 0-100 scale
            consistency = max(0, 100 - feature_std * 10)

            return float(consistency)

        except Exception:
            return 50.0

    def _score_voice_quality(self, quality: VoiceQualityAnalysis) -> float:
        """Calculate score from voice quality metrics."""
        score = 100.0

        # Penalize high jitter
        if quality.jitter_percent > self.REFERENCE_VALUES['jitter_max']:
            score -= min(30, (quality.jitter_percent - self.REFERENCE_VALUES['jitter_max']) * 10)

        # Penalize high shimmer
        if quality.shimmer_percent > self.REFERENCE_VALUES['shimmer_max']:
            score -= min(30, (quality.shimmer_percent - self.REFERENCE_VALUES['shimmer_max']) * 5)

        # Penalize low HNR
        if quality.hnr < self.REFERENCE_VALUES['hnr_min']:
            score -= min(30, (self.REFERENCE_VALUES['hnr_min'] - quality.hnr) * 2)

        return max(0, score)

    def _score_formant_stability(self, formants: FormantAnalysis) -> float:
        """Calculate score from formant stability."""
        # Lower standard deviation = more stable = better
        # Typical F1 std for healthy speech is around 50-100 Hz
        score = 100.0

        if formants.f1_std > 150:
            score -= min(25, (formants.f1_std - 150) / 10)
        if formants.f2_std > 200:
            score -= min(25, (formants.f2_std - 200) / 10)

        # Penalize very centralized vowels
        if formants.formant_centralization_ratio > 0.7:
            score -= (formants.formant_centralization_ratio - 0.7) * 50

        return max(0, score)

    def _score_spectral_clarity(self, spectral: Dict[str, float]) -> float:
        """Calculate score from spectral features."""
        # Higher clarity = better
        return min(100, spectral['clarity'] * 100)

    def _classify_articulation(self, score: float) -> ArticulationLevel:
        """Classify articulation level from score."""
        if score >= 90:
            return ArticulationLevel.EXCELLENT
        elif score >= 75:
            return ArticulationLevel.GOOD
        elif score >= 60:
            return ArticulationLevel.FAIR
        elif score >= 40:
            return ArticulationLevel.POOR
        else:
            return ArticulationLevel.VERY_POOR

    def _classify_voice_quality(
        self,
        quality: VoiceQualityAnalysis
    ) -> VoiceQualityLevel:
        """Classify overall voice quality."""
        issues = 0

        if quality.jitter_percent > self.REFERENCE_VALUES['jitter_max']:
            issues += 1
        if quality.shimmer_percent > self.REFERENCE_VALUES['shimmer_max']:
            issues += 1
        if quality.hnr < self.REFERENCE_VALUES['hnr_min']:
            issues += 1

        if issues == 0:
            return VoiceQualityLevel.HEALTHY
        elif issues == 1:
            return VoiceQualityLevel.SLIGHTLY_IMPAIRED
        elif issues == 2:
            return VoiceQualityLevel.MODERATELY_IMPAIRED
        else:
            return VoiceQualityLevel.SIGNIFICANTLY_IMPAIRED
