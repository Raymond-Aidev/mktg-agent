"""
Tests for the Base Analyzer Module

Tests the AnalysisResult dataclass and BaseAnalyzer utility methods.
"""

import sys
from pathlib import Path
import importlib.util

import pytest
import numpy as np

# Load base_analyzer module directly to avoid importing opencv-dependent modules
_base_analyzer_path = Path(__file__).parent.parent / 'src' / 'analyzers' / 'base_analyzer.py'
_spec = importlib.util.spec_from_file_location('base_analyzer', _base_analyzer_path)
_base_analyzer = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_base_analyzer)

AnalysisResult = _base_analyzer.AnalysisResult
BaseAnalyzer = _base_analyzer.BaseAnalyzer


class ConcreteAnalyzer(BaseAnalyzer):
    """Concrete implementation of BaseAnalyzer for testing."""

    def analyze(self, image: np.ndarray, **kwargs) -> AnalysisResult:
        """Minimal implementation for testing."""
        if not self.validate_input(image):
            return self.create_error_result("Invalid input")
        return AnalysisResult(
            analyzer_name=self.name,
            success=True,
            indicators={'test_indicator': 0.5},
            confidence=0.8
        )

    def get_required_regions(self):
        """Return test regions."""
        return ['face', 'skin']


class TestAnalysisResult:
    """Tests for the AnalysisResult dataclass."""

    def test_default_values(self):
        """Test that AnalysisResult has correct default values."""
        result = AnalysisResult(
            analyzer_name="TestAnalyzer",
            success=True
        )
        assert result.analyzer_name == "TestAnalyzer"
        assert result.success is True
        assert result.indicators == {}
        assert result.confidence == 0.0
        assert result.details == {}
        assert result.errors == []
        assert result.warnings == []

    def test_with_all_fields(self):
        """Test AnalysisResult with all fields populated."""
        result = AnalysisResult(
            analyzer_name="FullAnalyzer",
            success=True,
            indicators={'indicator1': 0.5, 'indicator2': 0.8},
            confidence=0.95,
            details={'extra': 'info'},
            errors=[],
            warnings=['minor warning']
        )
        assert result.indicators == {'indicator1': 0.5, 'indicator2': 0.8}
        assert result.confidence == 0.95
        assert result.details == {'extra': 'info'}
        assert result.warnings == ['minor warning']

    def test_failed_result(self):
        """Test AnalysisResult for failed analysis."""
        result = AnalysisResult(
            analyzer_name="FailedAnalyzer",
            success=False,
            errors=['Something went wrong']
        )
        assert result.success is False
        assert 'Something went wrong' in result.errors


class TestBaseAnalyzerValidateInput:
    """Tests for the validate_input method."""

    @pytest.fixture
    def analyzer(self):
        """Create a concrete analyzer instance for testing."""
        return ConcreteAnalyzer()

    def test_valid_image(self, analyzer):
        """Test validation with a valid BGR image."""
        valid_image = np.zeros((100, 100, 3), dtype=np.uint8)
        assert analyzer.validate_input(valid_image) is True

    def test_none_image(self, analyzer):
        """Test validation with None input."""
        assert analyzer.validate_input(None) is False

    def test_grayscale_image(self, analyzer):
        """Test validation rejects grayscale images."""
        grayscale = np.zeros((100, 100), dtype=np.uint8)
        assert analyzer.validate_input(grayscale) is False

    def test_4_channel_image(self, analyzer):
        """Test validation rejects RGBA images."""
        rgba_image = np.zeros((100, 100, 4), dtype=np.uint8)
        assert analyzer.validate_input(rgba_image) is False

    def test_too_small_image(self, analyzer):
        """Test validation rejects images smaller than 50x50."""
        small_image = np.zeros((40, 40, 3), dtype=np.uint8)
        assert analyzer.validate_input(small_image) is False

    def test_minimum_size_image(self, analyzer):
        """Test validation accepts 50x50 images."""
        min_image = np.zeros((50, 50, 3), dtype=np.uint8)
        assert analyzer.validate_input(min_image) is True

    def test_non_square_image(self, analyzer):
        """Test validation accepts non-square images."""
        rect_image = np.zeros((100, 200, 3), dtype=np.uint8)
        assert analyzer.validate_input(rect_image) is True


class TestBaseAnalyzerCreateErrorResult:
    """Tests for the create_error_result method."""

    @pytest.fixture
    def analyzer(self):
        """Create a concrete analyzer instance for testing."""
        return ConcreteAnalyzer()

    def test_error_result_contains_message(self, analyzer):
        """Test that error result contains the error message."""
        error_msg = "Face not detected"
        result = analyzer.create_error_result(error_msg)

        assert result.success is False
        assert error_msg in result.errors

    def test_error_result_has_analyzer_name(self, analyzer):
        """Test that error result includes analyzer name."""
        result = analyzer.create_error_result("Some error")
        assert result.analyzer_name == "ConcreteAnalyzer"

    def test_error_result_empty_indicators(self, analyzer):
        """Test that error result has empty indicators."""
        result = analyzer.create_error_result("Error")
        assert result.indicators == {}
        assert result.confidence == 0.0


class TestBaseAnalyzerCalculateConfidence:
    """Tests for the calculate_confidence method."""

    @pytest.fixture
    def analyzer(self):
        """Create a concrete analyzer instance for testing."""
        return ConcreteAnalyzer()

    def test_no_region_detected(self, analyzer):
        """Test confidence is 0 when region not detected."""
        confidence = analyzer.calculate_confidence(
            image_quality=80,
            region_detected=False,
            sample_size=500
        )
        assert confidence == 0.0

    def test_high_quality_full_samples(self, analyzer):
        """Test confidence with high quality and sufficient samples."""
        confidence = analyzer.calculate_confidence(
            image_quality=100,
            region_detected=True,
            sample_size=200,
            min_samples=100
        )
        # 100/100 * 0.6 + 1.0 * 0.4 = 0.6 + 0.4 = 1.0
        assert confidence == 1.0

    def test_low_quality_image(self, analyzer):
        """Test confidence is reduced with low quality image."""
        confidence = analyzer.calculate_confidence(
            image_quality=50,
            region_detected=True,
            sample_size=200,
            min_samples=100
        )
        # 50/100 * 0.6 + 1.0 * 0.4 = 0.3 + 0.4 = 0.7
        assert confidence == 0.7

    def test_insufficient_samples(self, analyzer):
        """Test confidence is reduced with insufficient samples."""
        confidence = analyzer.calculate_confidence(
            image_quality=100,
            region_detected=True,
            sample_size=50,
            min_samples=100
        )
        # 100/100 * 0.6 + 0.5 * 0.4 = 0.6 + 0.2 = 0.8
        assert confidence == 0.8

    def test_zero_quality(self, analyzer):
        """Test confidence with zero image quality."""
        confidence = analyzer.calculate_confidence(
            image_quality=0,
            region_detected=True,
            sample_size=100,
            min_samples=100
        )
        # 0/100 * 0.6 + 1.0 * 0.4 = 0.0 + 0.4 = 0.4
        assert confidence == 0.4

    def test_confidence_rounded(self, analyzer):
        """Test that confidence is properly rounded to 3 decimal places."""
        confidence = analyzer.calculate_confidence(
            image_quality=75,
            region_detected=True,
            sample_size=80,
            min_samples=100
        )
        # 75/100 * 0.6 + 0.8 * 0.4 = 0.45 + 0.32 = 0.77
        assert confidence == 0.77
        assert isinstance(confidence, float)


class TestConcreteAnalyzer:
    """Tests for the concrete analyzer implementation."""

    @pytest.fixture
    def analyzer(self):
        """Create a concrete analyzer instance for testing."""
        return ConcreteAnalyzer()

    def test_analyzer_name(self, analyzer):
        """Test that analyzer name is set correctly."""
        assert analyzer.name == "ConcreteAnalyzer"

    def test_get_required_regions(self, analyzer):
        """Test that required regions are returned."""
        regions = analyzer.get_required_regions()
        assert 'face' in regions
        assert 'skin' in regions

    def test_analyze_valid_image(self, analyzer):
        """Test analysis with valid image."""
        image = np.zeros((100, 100, 3), dtype=np.uint8)
        result = analyzer.analyze(image)

        assert result.success is True
        assert result.analyzer_name == "ConcreteAnalyzer"
        assert 'test_indicator' in result.indicators

    def test_analyze_invalid_image(self, analyzer):
        """Test analysis with invalid image returns error."""
        result = analyzer.analyze(None)

        assert result.success is False
        assert len(result.errors) > 0
