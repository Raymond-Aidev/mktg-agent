"""
Voice Analyzer Module

Core audio processing and feature extraction for speech analysis.
Uses librosa for audio processing and parselmouth for Praat-based analysis.
"""

import numpy as np
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any
from enum import Enum
from datetime import datetime

try:
    import librosa
    import librosa.display
    LIBROSA_AVAILABLE = True
except ImportError:
    LIBROSA_AVAILABLE = False

try:
    import parselmouth
    from parselmouth.praat import call
    PARSELMOUTH_AVAILABLE = True
except ImportError:
    PARSELMOUTH_AVAILABLE = False

try:
    import soundfile as sf
    SOUNDFILE_AVAILABLE = True
except ImportError:
    SOUNDFILE_AVAILABLE = False


class AnalysisQuality(Enum):
    """Quality level of the analysis."""
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"
    INVALID = "invalid"


@dataclass
class AudioMetadata:
    """Metadata about the audio recording."""
    duration: float  # seconds
    sample_rate: int
    channels: int
    bit_depth: Optional[int] = None
    format: Optional[str] = None
    quality_score: float = 0.0
    noise_level: float = 0.0
    clipping_detected: bool = False


@dataclass
class AcousticFeatures:
    """Low-level acoustic features extracted from audio."""
    # Fundamental frequency (F0) statistics
    f0_mean: float = 0.0
    f0_std: float = 0.0
    f0_min: float = 0.0
    f0_max: float = 0.0
    f0_range: float = 0.0

    # Formants (vowel quality)
    f1_mean: float = 0.0
    f2_mean: float = 0.0
    f3_mean: float = 0.0

    # Voice quality
    jitter: float = 0.0  # Pitch perturbation
    shimmer: float = 0.0  # Amplitude perturbation
    hnr: float = 0.0  # Harmonics-to-noise ratio

    # Energy/Intensity
    intensity_mean: float = 0.0
    intensity_std: float = 0.0

    # Spectral features
    spectral_centroid: float = 0.0
    spectral_bandwidth: float = 0.0
    mfcc_mean: Optional[np.ndarray] = None


@dataclass
class VoiceAnalysisResult:
    """Complete result of voice analysis."""
    success: bool
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())

    # Metadata
    audio_metadata: Optional[AudioMetadata] = None
    analysis_quality: AnalysisQuality = AnalysisQuality.INVALID

    # Features
    acoustic_features: Optional[AcousticFeatures] = None

    # Scores (0-100 scale)
    overall_score: float = 0.0
    pronunciation_score: float = 0.0
    fluency_score: float = 0.0
    prosody_score: float = 0.0

    # Detailed metrics
    metrics: Dict[str, float] = field(default_factory=dict)

    # Warnings and errors
    warnings: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)

    # Raw data for tracking
    raw_features: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage."""
        return {
            'success': self.success,
            'timestamp': self.timestamp,
            'analysis_quality': self.analysis_quality.value,
            'overall_score': self.overall_score,
            'pronunciation_score': self.pronunciation_score,
            'fluency_score': self.fluency_score,
            'prosody_score': self.prosody_score,
            'metrics': self.metrics,
            'warnings': self.warnings,
            'errors': self.errors,
        }


class VoiceAnalyzer:
    """
    Core voice analysis engine.

    Extracts acoustic features from audio recordings using librosa and Praat.
    Provides the foundation for prosodic and pronunciation analysis.

    Reference:
    - Librosa: https://librosa.org/
    - Parselmouth (Praat): https://parselmouth.readthedocs.io/
    """

    # Audio quality thresholds
    MIN_DURATION = 1.0  # Minimum recording duration in seconds
    MAX_DURATION = 120.0  # Maximum recording duration
    MIN_SAMPLE_RATE = 16000  # Minimum sample rate for analysis
    OPTIMAL_SAMPLE_RATE = 48000  # Optimal sample rate

    # F0 range for human speech (Hz)
    F0_MIN = 75
    F0_MAX = 500

    def __init__(self, sample_rate: int = 16000):
        """
        Initialize voice analyzer.

        Args:
            sample_rate: Target sample rate for analysis
        """
        self.sample_rate = sample_rate
        self._check_dependencies()

    def _check_dependencies(self):
        """Check if required libraries are available."""
        if not LIBROSA_AVAILABLE:
            raise ImportError(
                "librosa is required for voice analysis. "
                "Install with: pip install librosa"
            )

    def load_audio(
        self,
        file_path: str,
        normalize: bool = True
    ) -> Tuple[np.ndarray, int]:
        """
        Load audio file and return waveform.

        Args:
            file_path: Path to audio file
            normalize: Whether to normalize audio

        Returns:
            Tuple of (audio_data, sample_rate)
        """
        # Load with librosa (handles various formats)
        audio, sr = librosa.load(file_path, sr=self.sample_rate, mono=True)

        if normalize:
            # Normalize to [-1, 1]
            max_val = np.max(np.abs(audio))
            if max_val > 0:
                audio = audio / max_val

        return audio, sr

    def load_audio_bytes(
        self,
        audio_bytes: bytes,
        normalize: bool = True
    ) -> Tuple[np.ndarray, int]:
        """
        Load audio from bytes.

        Args:
            audio_bytes: Audio data as bytes
            normalize: Whether to normalize audio

        Returns:
            Tuple of (audio_data, sample_rate)
        """
        import io

        if SOUNDFILE_AVAILABLE:
            audio, sr = sf.read(io.BytesIO(audio_bytes))
            if sr != self.sample_rate:
                audio = librosa.resample(audio, orig_sr=sr, target_sr=self.sample_rate)
                sr = self.sample_rate
        else:
            # Fallback to librosa
            audio, sr = librosa.load(io.BytesIO(audio_bytes), sr=self.sample_rate, mono=True)

        if len(audio.shape) > 1:
            audio = np.mean(audio, axis=1)  # Convert to mono

        if normalize:
            max_val = np.max(np.abs(audio))
            if max_val > 0:
                audio = audio / max_val

        return audio, sr

    def get_audio_metadata(self, audio: np.ndarray, sr: int) -> AudioMetadata:
        """
        Extract metadata from audio.

        Args:
            audio: Audio waveform
            sr: Sample rate

        Returns:
            AudioMetadata object
        """
        duration = len(audio) / sr

        # Estimate noise level (using silence detection)
        rms = librosa.feature.rms(y=audio)[0]
        noise_level = float(np.percentile(rms, 10))

        # Check for clipping
        clipping = np.any(np.abs(audio) > 0.99)

        # Quality score based on various factors
        quality = 100.0
        if duration < self.MIN_DURATION:
            quality -= 30
        if duration > self.MAX_DURATION:
            quality -= 20
        if sr < self.MIN_SAMPLE_RATE:
            quality -= 20
        if clipping:
            quality -= 15
        if noise_level > 0.1:
            quality -= min(20, noise_level * 100)

        return AudioMetadata(
            duration=duration,
            sample_rate=sr,
            channels=1,
            quality_score=max(0, quality),
            noise_level=noise_level,
            clipping_detected=clipping
        )

    def extract_acoustic_features(
        self,
        audio: np.ndarray,
        sr: int
    ) -> AcousticFeatures:
        """
        Extract acoustic features from audio.

        Args:
            audio: Audio waveform
            sr: Sample rate

        Returns:
            AcousticFeatures object
        """
        features = AcousticFeatures()

        # === Fundamental Frequency (F0) using librosa ===
        f0, voiced_flag, voiced_probs = librosa.pyin(
            audio,
            fmin=self.F0_MIN,
            fmax=self.F0_MAX,
            sr=sr
        )

        # Filter out unvoiced frames
        f0_voiced = f0[~np.isnan(f0)]

        if len(f0_voiced) > 0:
            features.f0_mean = float(np.mean(f0_voiced))
            features.f0_std = float(np.std(f0_voiced))
            features.f0_min = float(np.min(f0_voiced))
            features.f0_max = float(np.max(f0_voiced))
            features.f0_range = features.f0_max - features.f0_min

        # === Spectral Features ===
        # Spectral centroid
        spec_cent = librosa.feature.spectral_centroid(y=audio, sr=sr)[0]
        features.spectral_centroid = float(np.mean(spec_cent))

        # Spectral bandwidth
        spec_bw = librosa.feature.spectral_bandwidth(y=audio, sr=sr)[0]
        features.spectral_bandwidth = float(np.mean(spec_bw))

        # === MFCC ===
        mfcc = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=13)
        features.mfcc_mean = np.mean(mfcc, axis=1)

        # === Intensity/Energy ===
        rms = librosa.feature.rms(y=audio)[0]
        features.intensity_mean = float(np.mean(rms))
        features.intensity_std = float(np.std(rms))

        # === Voice Quality (using Parselmouth if available) ===
        if PARSELMOUTH_AVAILABLE:
            try:
                sound = parselmouth.Sound(audio, sampling_frequency=sr)

                # F0 with Praat (more accurate)
                pitch = call(sound, "To Pitch", 0.0, self.F0_MIN, self.F0_MAX)

                # Jitter
                point_process = call(sound, "To PointProcess (periodic, cc)", self.F0_MIN, self.F0_MAX)
                features.jitter = call(point_process, "Get jitter (local)", 0, 0, 0.0001, 0.02, 1.3)

                # Shimmer
                features.shimmer = call(
                    [sound, point_process], "Get shimmer (local)",
                    0, 0, 0.0001, 0.02, 1.3, 1.6
                )

                # HNR (Harmonics-to-Noise Ratio)
                harmonicity = call(sound, "To Harmonicity (cc)", 0.01, self.F0_MIN, 0.1, 1.0)
                features.hnr = call(harmonicity, "Get mean", 0, 0)

                # Formants
                formant = call(sound, "To Formant (burg)", 0.0, 5, 5500, 0.025, 50)
                features.f1_mean = call(formant, "Get mean", 1, 0, 0, "Hertz")
                features.f2_mean = call(formant, "Get mean", 2, 0, 0, "Hertz")
                features.f3_mean = call(formant, "Get mean", 3, 0, 0, "Hertz")

            except Exception:
                # Fallback if Praat analysis fails
                pass

        return features

    def analyze(
        self,
        file_path: Optional[str] = None,
        audio_bytes: Optional[bytes] = None,
        audio_array: Optional[np.ndarray] = None,
        sr: Optional[int] = None
    ) -> VoiceAnalysisResult:
        """
        Perform complete voice analysis.

        Args:
            file_path: Path to audio file
            audio_bytes: Audio data as bytes
            audio_array: Pre-loaded audio array
            sr: Sample rate (required if audio_array provided)

        Returns:
            VoiceAnalysisResult with extracted features
        """
        result = VoiceAnalysisResult(success=False)

        try:
            # Load audio
            if file_path is not None:
                audio, sr = self.load_audio(file_path)
            elif audio_bytes is not None:
                audio, sr = self.load_audio_bytes(audio_bytes)
            elif audio_array is not None and sr is not None:
                audio = audio_array
            else:
                result.errors.append("No audio input provided")
                return result

            # Get metadata
            metadata = self.get_audio_metadata(audio, sr)
            result.audio_metadata = metadata

            # Validate audio
            if metadata.duration < self.MIN_DURATION:
                result.errors.append(f"Audio too short: {metadata.duration:.2f}s")
                result.analysis_quality = AnalysisQuality.INVALID
                return result

            if metadata.quality_score < 30:
                result.warnings.append("Low audio quality may affect accuracy")
                result.analysis_quality = AnalysisQuality.POOR
            elif metadata.quality_score < 60:
                result.analysis_quality = AnalysisQuality.FAIR
            elif metadata.quality_score < 85:
                result.analysis_quality = AnalysisQuality.GOOD
            else:
                result.analysis_quality = AnalysisQuality.EXCELLENT

            # Extract features
            acoustic = self.extract_acoustic_features(audio, sr)
            result.acoustic_features = acoustic

            # Store raw features for tracking
            result.raw_features = {
                'f0_mean': acoustic.f0_mean,
                'f0_std': acoustic.f0_std,
                'f0_range': acoustic.f0_range,
                'jitter': acoustic.jitter,
                'shimmer': acoustic.shimmer,
                'hnr': acoustic.hnr,
                'intensity_mean': acoustic.intensity_mean,
                'spectral_centroid': acoustic.spectral_centroid,
            }

            result.success = True

        except Exception as e:
            result.errors.append(f"Analysis failed: {str(e)}")

        return result

    def detect_voice_activity(
        self,
        audio: np.ndarray,
        sr: int,
        threshold_db: float = -40
    ) -> np.ndarray:
        """
        Detect voiced segments in audio.

        Args:
            audio: Audio waveform
            sr: Sample rate
            threshold_db: Energy threshold in dB

        Returns:
            Boolean array indicating voiced frames
        """
        # Compute short-time energy
        hop_length = int(sr * 0.01)  # 10ms hop
        frame_length = int(sr * 0.025)  # 25ms frame

        rms = librosa.feature.rms(
            y=audio,
            frame_length=frame_length,
            hop_length=hop_length
        )[0]

        # Convert to dB
        rms_db = librosa.amplitude_to_db(rms, ref=np.max)

        # Apply threshold
        voiced = rms_db > threshold_db

        return voiced

    def segment_speech(
        self,
        audio: np.ndarray,
        sr: int,
        min_silence_duration: float = 0.2
    ) -> List[Tuple[float, float]]:
        """
        Segment speech into utterances based on pauses.

        Args:
            audio: Audio waveform
            sr: Sample rate
            min_silence_duration: Minimum silence duration to split (seconds)

        Returns:
            List of (start_time, end_time) tuples for each segment
        """
        hop_length = int(sr * 0.01)

        # Detect voice activity
        voiced = self.detect_voice_activity(audio, sr)

        # Find segment boundaries
        segments = []
        in_speech = False
        start_frame = 0
        silence_frames = 0
        min_silence_frames = int(min_silence_duration / 0.01)

        for i, v in enumerate(voiced):
            if v and not in_speech:
                # Start of speech
                in_speech = True
                start_frame = i
                silence_frames = 0
            elif not v and in_speech:
                silence_frames += 1
                if silence_frames >= min_silence_frames:
                    # End of speech segment
                    end_frame = i - silence_frames
                    start_time = start_frame * hop_length / sr
                    end_time = end_frame * hop_length / sr
                    if end_time > start_time:
                        segments.append((start_time, end_time))
                    in_speech = False
            elif v and in_speech:
                silence_frames = 0

        # Handle final segment
        if in_speech:
            end_frame = len(voiced)
            start_time = start_frame * hop_length / sr
            end_time = end_frame * hop_length / sr
            if end_time > start_time:
                segments.append((start_time, end_time))

        return segments
