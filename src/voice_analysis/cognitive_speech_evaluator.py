"""
Cognitive Speech Evaluator Module

Integrates prosodic and pronunciation analysis to evaluate
cognitive function indicators from speech.

Based on research showing speech patterns can predict cognitive
impairment with 78%+ accuracy (NIA/NIH studies).

Key indicators:
- Speech rate changes
- Pause patterns (longer pauses correlate with cognitive decline)
- Articulation precision
- Fluency and rhythm regularity
"""

import numpy as np
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any
from enum import Enum
from datetime import datetime

from .voice_analyzer import VoiceAnalyzer, VoiceAnalysisResult
from .prosodic_analyzer import ProsodicAnalyzer, ProsodicFeatures
from .pronunciation_analyzer import PronunciationAnalyzer, PronunciationResult


class CognitiveRiskLevel(Enum):
    """Cognitive risk assessment levels."""
    NORMAL = "normal"                  # No significant indicators
    LOW_RISK = "low_risk"             # Some minor deviations
    MODERATE_RISK = "moderate_risk"   # Notable deviations
    HIGH_RISK = "high_risk"           # Significant concern
    REQUIRES_ATTENTION = "requires_attention"  # Professional evaluation recommended


class SpeechDomain(Enum):
    """Domains of speech assessment."""
    FLUENCY = "fluency"
    ARTICULATION = "articulation"
    PROSODY = "prosody"
    TIMING = "timing"
    OVERALL = "overall"


@dataclass
class DomainScore:
    """Score for a specific speech domain."""
    domain: SpeechDomain
    score: float  # 0-100
    percentile: float  # Compared to age-matched norms
    deviation_from_norm: float  # Standard deviations from mean
    status: str  # "normal", "mild", "moderate", "significant"
    details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CognitiveScore:
    """Complete cognitive speech assessment."""
    # Overall assessment
    overall_score: float = 0.0  # 0-100 (higher = better)
    risk_level: CognitiveRiskLevel = CognitiveRiskLevel.NORMAL
    confidence: float = 0.0

    # Domain scores
    fluency_score: DomainScore = None
    articulation_score: DomainScore = None
    prosody_score: DomainScore = None
    timing_score: DomainScore = None

    # Key indicators
    speech_rate_index: float = 0.0  # Normalized to reference
    pause_burden_index: float = 0.0  # Higher = more pauses
    articulation_precision: float = 0.0
    rhythm_stability: float = 0.0

    # Detailed metrics for tracking
    metrics: Dict[str, float] = field(default_factory=dict)

    # Clinical notes
    observations: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)

    # Metadata
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    task_id: Optional[str] = None
    task_text: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage."""
        return {
            'timestamp': self.timestamp,
            'overall_score': self.overall_score,
            'risk_level': self.risk_level.value,
            'confidence': self.confidence,
            'speech_rate_index': self.speech_rate_index,
            'pause_burden_index': self.pause_burden_index,
            'articulation_precision': self.articulation_precision,
            'rhythm_stability': self.rhythm_stability,
            'metrics': self.metrics,
            'observations': self.observations,
            'recommendations': self.recommendations,
            'task_id': self.task_id,
            'task_text': self.task_text,
        }


class CognitiveSpeechEvaluator:
    """
    Evaluates cognitive function through speech analysis.

    Integrates multiple speech analysis components to provide
    a comprehensive cognitive assessment.

    Research basis:
    - Meta-analysis shows AD patients have 1.20 SD longer pauses
    - MCI patients show 0.62 SD longer pauses
    - Speech rate reduction indicates processing difficulties
    - Rhythm irregularity correlates with executive function decline

    References:
    - Frontiers 2024: Novel speech analysis for cognitive impairment
    - Nature 2025: Voice biomarkers for MCI detection (AUC 0.988)
    - Cambridge: Speech pause meta-analysis for AD/MCI
    """

    # Age-adjusted reference values (simplified model)
    # In production, these would come from normative databases
    AGE_NORMS = {
        'speech_rate': {  # syllables/second
            '60-69': {'mean': 3.8, 'std': 0.6},
            '70-79': {'mean': 3.5, 'std': 0.7},
            '80+': {'mean': 3.2, 'std': 0.8},
        },
        'pause_duration': {  # seconds
            '60-69': {'mean': 0.35, 'std': 0.12},
            '70-79': {'mean': 0.40, 'std': 0.15},
            '80+': {'mean': 0.45, 'std': 0.18},
        },
        'phonation_ratio': {
            '60-69': {'mean': 0.68, 'std': 0.08},
            '70-79': {'mean': 0.65, 'std': 0.10},
            '80+': {'mean': 0.60, 'std': 0.12},
        },
    }

    # Weights for overall score
    DOMAIN_WEIGHTS = {
        'fluency': 0.30,
        'articulation': 0.25,
        'prosody': 0.25,
        'timing': 0.20,
    }

    # Threshold for risk classification (standard deviations from mean)
    RISK_THRESHOLDS = {
        'normal': 1.0,        # Within 1 SD
        'low_risk': 1.5,      # 1-1.5 SD
        'moderate_risk': 2.0, # 1.5-2 SD
        'high_risk': 2.5,     # 2-2.5 SD
        # > 2.5 SD = requires_attention
    }

    def __init__(self, age_group: str = '70-79'):
        """
        Initialize cognitive speech evaluator.

        Args:
            age_group: Age group for normative comparison ('60-69', '70-79', '80+')
        """
        self.age_group = age_group
        self.voice_analyzer = VoiceAnalyzer()
        self.prosodic_analyzer = ProsodicAnalyzer()
        self.pronunciation_analyzer = PronunciationAnalyzer()

    def evaluate(
        self,
        audio: np.ndarray,
        sr: int,
        task_text: Optional[str] = None,
        task_id: Optional[str] = None,
        expected_syllables: Optional[int] = None
    ) -> CognitiveScore:
        """
        Perform comprehensive cognitive speech evaluation.

        Args:
            audio: Audio waveform
            sr: Sample rate
            task_text: The text that was read
            task_id: Identifier for the reading task
            expected_syllables: Expected syllable count (improves accuracy)

        Returns:
            CognitiveScore with complete assessment
        """
        result = CognitiveScore()
        result.task_text = task_text
        result.task_id = task_id

        # Run all analyzers
        prosodic = self.prosodic_analyzer.analyze(audio, sr, expected_syllables)
        pronunciation = self.pronunciation_analyzer.analyze(audio, sr, task_text)

        # Calculate domain scores
        result.fluency_score = self._evaluate_fluency(prosodic)
        result.articulation_score = self._evaluate_articulation(pronunciation)
        result.prosody_score = self._evaluate_prosody(prosodic)
        result.timing_score = self._evaluate_timing(prosodic)

        # Calculate key indices
        result.speech_rate_index = self._calculate_speech_rate_index(prosodic)
        result.pause_burden_index = self._calculate_pause_burden_index(prosodic)
        result.articulation_precision = pronunciation.articulation_score
        result.rhythm_stability = prosodic.rhythm_regularity * 100

        # Calculate overall score
        result.overall_score = self._calculate_overall_score(result)

        # Determine risk level
        result.risk_level = self._assess_risk_level(result)

        # Calculate confidence
        result.confidence = self._calculate_confidence(prosodic, pronunciation)

        # Generate observations and recommendations
        result.observations = self._generate_observations(result, prosodic, pronunciation)
        result.recommendations = self._generate_recommendations(result)

        # Store detailed metrics
        result.metrics = {
            'speech_rate': prosodic.speech_rate,
            'articulation_rate': prosodic.articulation_rate,
            'pause_count': prosodic.pause_count,
            'mean_pause_duration': prosodic.mean_pause_duration,
            'max_pause_duration': prosodic.max_pause_duration,
            'phonation_ratio': prosodic.phonation_ratio,
            'hesitation_ratio': prosodic.hesitation_ratio,
            'rhythm_regularity': prosodic.rhythm_regularity,
            'jitter': pronunciation.voice_quality.jitter_percent,
            'shimmer': pronunciation.voice_quality.shimmer_percent,
            'hnr': pronunciation.voice_quality.hnr,
            'f1_stability': pronunciation.formant_analysis.f1_std,
            'f2_stability': pronunciation.formant_analysis.f2_std,
        }

        return result

    def _evaluate_fluency(self, prosodic: ProsodicFeatures) -> DomainScore:
        """Evaluate speech fluency."""
        # Base score from prosodic fluency score
        score = prosodic.fluency_score

        # Calculate deviation from age norms
        norms = self.AGE_NORMS['speech_rate'].get(self.age_group, self.AGE_NORMS['speech_rate']['70-79'])
        deviation = (prosodic.speech_rate - norms['mean']) / norms['std']

        # Percentile approximation (assuming normal distribution)
        percentile = self._deviation_to_percentile(deviation)

        # Status classification
        status = self._deviation_to_status(abs(deviation))

        return DomainScore(
            domain=SpeechDomain.FLUENCY,
            score=score,
            percentile=percentile,
            deviation_from_norm=deviation,
            status=status,
            details={
                'speech_rate': prosodic.speech_rate,
                'articulation_rate': prosodic.articulation_rate,
                'hesitation_ratio': prosodic.hesitation_ratio,
            }
        )

    def _evaluate_articulation(self, pronunciation: PronunciationResult) -> DomainScore:
        """Evaluate articulation quality."""
        score = pronunciation.articulation_score

        # Articulation doesn't have strong age norms, use general quality
        # Lower scores indicate more deviation
        deviation = (50 - score) / 15  # Approximate SD

        percentile = self._deviation_to_percentile(-deviation)
        status = self._deviation_to_status(abs(deviation))

        return DomainScore(
            domain=SpeechDomain.ARTICULATION,
            score=score,
            percentile=percentile,
            deviation_from_norm=deviation,
            status=status,
            details={
                'clarity_score': pronunciation.clarity_score,
                'consistency_score': pronunciation.consistency_score,
                'voice_quality': pronunciation.voice_quality.quality_level.value,
            }
        )

    def _evaluate_prosody(self, prosodic: ProsodicFeatures) -> DomainScore:
        """Evaluate prosodic patterns."""
        # Combine rhythm and pitch variation
        rhythm_score = prosodic.rhythm_regularity * 100
        pitch_score = min(100, prosodic.pitch_variation * 200)  # Normalize

        # Balance between regularity and expressiveness
        score = rhythm_score * 0.6 + pitch_score * 0.4

        deviation = (50 - score) / 15
        percentile = self._deviation_to_percentile(-deviation)
        status = self._deviation_to_status(abs(deviation))

        return DomainScore(
            domain=SpeechDomain.PROSODY,
            score=score,
            percentile=percentile,
            deviation_from_norm=deviation,
            status=status,
            details={
                'rhythm_regularity': prosodic.rhythm_regularity,
                'rhythm_pattern': prosodic.rhythm_pattern.value,
                'pitch_variation': prosodic.pitch_variation,
            }
        )

    def _evaluate_timing(self, prosodic: ProsodicFeatures) -> DomainScore:
        """Evaluate speech timing patterns."""
        norms = self.AGE_NORMS['pause_duration'].get(
            self.age_group, self.AGE_NORMS['pause_duration']['70-79']
        )

        # Calculate deviation for pause duration
        pause_deviation = (prosodic.mean_pause_duration - norms['mean']) / norms['std']

        # Positive deviation (longer pauses) is concerning
        # Combine with phonation ratio
        phon_norms = self.AGE_NORMS['phonation_ratio'].get(
            self.age_group, self.AGE_NORMS['phonation_ratio']['70-79']
        )
        phon_deviation = (phon_norms['mean'] - prosodic.phonation_ratio) / phon_norms['std']

        # Combined deviation
        combined_deviation = (pause_deviation + phon_deviation) / 2

        # Score (inverse of deviation)
        score = max(0, min(100, 100 - abs(combined_deviation) * 20))

        percentile = self._deviation_to_percentile(-combined_deviation)
        status = self._deviation_to_status(abs(combined_deviation))

        return DomainScore(
            domain=SpeechDomain.TIMING,
            score=score,
            percentile=percentile,
            deviation_from_norm=combined_deviation,
            status=status,
            details={
                'mean_pause_duration': prosodic.mean_pause_duration,
                'pause_rate': prosodic.pause_rate,
                'phonation_ratio': prosodic.phonation_ratio,
                'extended_pause_count': prosodic.extended_pause_count,
            }
        )

    def _calculate_speech_rate_index(self, prosodic: ProsodicFeatures) -> float:
        """Calculate normalized speech rate index."""
        norms = self.AGE_NORMS['speech_rate'].get(
            self.age_group, self.AGE_NORMS['speech_rate']['70-79']
        )
        # Return ratio to norm (1.0 = exactly at norm)
        if norms['mean'] > 0:
            return prosodic.speech_rate / norms['mean']
        return 1.0

    def _calculate_pause_burden_index(self, prosodic: ProsodicFeatures) -> float:
        """
        Calculate pause burden index.

        Higher values indicate more problematic pause patterns.
        """
        norms = self.AGE_NORMS['pause_duration'].get(
            self.age_group, self.AGE_NORMS['pause_duration']['70-79']
        )

        # Components of pause burden
        duration_factor = prosodic.mean_pause_duration / norms['mean'] if norms['mean'] > 0 else 1
        frequency_factor = prosodic.pause_rate / 15  # 15 pauses/min is reference
        hesitation_factor = 1 + prosodic.hesitation_ratio

        # Combined index
        burden = (duration_factor * 0.4 + frequency_factor * 0.3 + hesitation_factor * 0.3)

        return round(burden, 3)

    def _calculate_overall_score(self, result: CognitiveScore) -> float:
        """Calculate weighted overall score."""
        if not all([result.fluency_score, result.articulation_score,
                    result.prosody_score, result.timing_score]):
            return 50.0

        score = (
            result.fluency_score.score * self.DOMAIN_WEIGHTS['fluency'] +
            result.articulation_score.score * self.DOMAIN_WEIGHTS['articulation'] +
            result.prosody_score.score * self.DOMAIN_WEIGHTS['prosody'] +
            result.timing_score.score * self.DOMAIN_WEIGHTS['timing']
        )

        return round(score, 1)

    def _assess_risk_level(self, result: CognitiveScore) -> CognitiveRiskLevel:
        """Assess cognitive risk level based on all indicators."""
        # Get maximum deviation across domains
        deviations = []
        for domain_score in [result.fluency_score, result.articulation_score,
                            result.prosody_score, result.timing_score]:
            if domain_score:
                deviations.append(abs(domain_score.deviation_from_norm))

        if not deviations:
            return CognitiveRiskLevel.NORMAL

        max_deviation = max(deviations)

        # Also consider specific high-risk indicators
        high_risk_indicators = 0
        if result.pause_burden_index > 1.5:
            high_risk_indicators += 1
        if result.speech_rate_index < 0.7:
            high_risk_indicators += 1

        # Classify risk
        if max_deviation <= self.RISK_THRESHOLDS['normal'] and high_risk_indicators == 0:
            return CognitiveRiskLevel.NORMAL
        elif max_deviation <= self.RISK_THRESHOLDS['low_risk'] and high_risk_indicators <= 1:
            return CognitiveRiskLevel.LOW_RISK
        elif max_deviation <= self.RISK_THRESHOLDS['moderate_risk']:
            return CognitiveRiskLevel.MODERATE_RISK
        elif max_deviation <= self.RISK_THRESHOLDS['high_risk']:
            return CognitiveRiskLevel.HIGH_RISK
        else:
            return CognitiveRiskLevel.REQUIRES_ATTENTION

    def _calculate_confidence(
        self,
        prosodic: ProsodicFeatures,
        pronunciation: PronunciationResult
    ) -> float:
        """Calculate confidence in the assessment."""
        confidence = 0.8  # Base confidence

        # Reduce confidence if audio quality issues
        if pronunciation.warnings:
            confidence -= len(pronunciation.warnings) * 0.1

        # Reduce if speech duration too short
        if prosodic.speech_duration < 5:
            confidence -= 0.2
        elif prosodic.speech_duration < 10:
            confidence -= 0.1

        # Reduce if too few pauses to analyze
        if prosodic.pause_count < 3:
            confidence -= 0.1

        return max(0.3, min(1.0, confidence))

    def _generate_observations(
        self,
        result: CognitiveScore,
        prosodic: ProsodicFeatures,
        pronunciation: PronunciationResult
    ) -> List[str]:
        """Generate clinical observations."""
        observations = []

        # Speech rate observations
        if result.speech_rate_index < 0.8:
            observations.append(
                f"Speech rate ({prosodic.speech_rate:.1f} syl/s) is below "
                f"age-matched average"
            )
        elif result.speech_rate_index > 1.2:
            observations.append(
                "Speech rate is above average, indicating good verbal fluency"
            )

        # Pause observations
        if prosodic.mean_pause_duration > 0.6:
            observations.append(
                f"Mean pause duration ({prosodic.mean_pause_duration:.2f}s) is "
                f"elevated"
            )

        if prosodic.extended_pause_count > 2:
            observations.append(
                f"Multiple extended pauses (>1s) detected: {prosodic.extended_pause_count}"
            )

        # Hesitation observations
        if prosodic.hesitation_ratio > 0.3:
            observations.append(
                "High proportion of long/extended pauses suggests processing delays"
            )

        # Articulation observations
        if pronunciation.articulation_score < 60:
            observations.append(
                "Articulation precision is reduced; consider motor speech assessment"
            )

        # Voice quality observations
        if pronunciation.voice_quality.hnr < 15:
            observations.append(
                "Voice clarity is reduced (HNR below normal range)"
            )

        # Rhythm observations
        if prosodic.rhythm_regularity < 0.5:
            observations.append(
                "Speech rhythm shows irregularity"
            )

        return observations

    def _generate_recommendations(self, result: CognitiveScore) -> List[str]:
        """Generate recommendations based on assessment."""
        recommendations = []

        if result.risk_level == CognitiveRiskLevel.NORMAL:
            recommendations.append(
                "Continue regular cognitive health monitoring"
            )
        elif result.risk_level == CognitiveRiskLevel.LOW_RISK:
            recommendations.append(
                "Monitor speech patterns regularly; consider more frequent assessments"
            )
            recommendations.append(
                "Engage in activities that support verbal fluency (reading aloud, conversation)"
            )
        elif result.risk_level == CognitiveRiskLevel.MODERATE_RISK:
            recommendations.append(
                "Schedule follow-up assessment in 2-4 weeks to track changes"
            )
            recommendations.append(
                "Consider consultation with healthcare provider"
            )
        elif result.risk_level in [CognitiveRiskLevel.HIGH_RISK, CognitiveRiskLevel.REQUIRES_ATTENTION]:
            recommendations.append(
                "Recommend professional cognitive evaluation"
            )
            recommendations.append(
                "Discuss results with healthcare provider promptly"
            )

        return recommendations

    def _deviation_to_percentile(self, deviation: float) -> float:
        """Convert standard deviation to approximate percentile."""
        # Simple approximation using normal distribution
        from math import erf, sqrt
        percentile = 50 * (1 + erf(deviation / sqrt(2)))
        return round(percentile, 1)

    def _deviation_to_status(self, abs_deviation: float) -> str:
        """Convert absolute deviation to status label."""
        if abs_deviation <= 1.0:
            return "normal"
        elif abs_deviation <= 1.5:
            return "mild"
        elif abs_deviation <= 2.0:
            return "moderate"
        else:
            return "significant"

    def set_age_group(self, age_group: str):
        """
        Set age group for normative comparison.

        Args:
            age_group: '60-69', '70-79', or '80+'
        """
        if age_group in self.AGE_NORMS['speech_rate']:
            self.age_group = age_group
        else:
            raise ValueError(f"Invalid age group: {age_group}. Use '60-69', '70-79', or '80+'")
