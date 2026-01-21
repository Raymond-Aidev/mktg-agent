# CLAUDE.md - AI Assistant Guidelines for GoldenCheck

This document provides essential context and guidelines for AI assistants working with the GoldenCheck codebase.

## Project Overview

**GoldenCheck** is a Python-based health analysis system that extracts health indicators from smartphone photos. It analyzes various body parts (face, skin, eyes, lips, nails) to provide basic health screening indicators.

### Key Features

- Multi-region analysis (skin, eyes, lips, nails, face)
- Color-based health indicator detection (yellowing, pallor, cyanosis, redness)
- Texture and uniformity analysis
- Smartphone photo optimization (handles varying lighting, resolution)
- Multiple output formats (text, JSON, HTML reports)
- CLI and programmatic API

### Important Disclaimer

This is a screening tool for informational purposes only. It should NOT be used as a medical diagnostic tool. Users should always consult healthcare professionals for proper medical advice.

## Repository Structure

```
GoldenCheck/
├── CLAUDE.md                    # AI assistant guidelines (this file)
├── requirements.txt             # Python dependencies
├── setup.py                     # Package installation configuration
├── src/
│   ├── __init__.py             # Package initialization
│   ├── health_analyzer.py      # Main analysis engine
│   ├── cli.py                  # Command-line interface
│   ├── analyzers/
│   │   ├── __init__.py
│   │   ├── base_analyzer.py    # Base class for all analyzers
│   │   ├── skin_analyzer.py    # Skin health analysis
│   │   ├── eye_analyzer.py     # Eye health analysis
│   │   ├── lip_analyzer.py     # Lip health analysis
│   │   ├── nail_analyzer.py    # Nail health analysis
│   │   └── face_analyzer.py    # Overall face analysis
│   ├── voice_analysis/          # Voice/Speech analysis module
│   │   ├── __init__.py
│   │   ├── voice_analyzer.py           # Core audio processing
│   │   ├── prosodic_analyzer.py        # Pause, rhythm, speech rate
│   │   ├── pronunciation_analyzer.py   # Articulation, voice quality
│   │   ├── cognitive_speech_evaluator.py  # Cognitive assessment
│   │   ├── reading_tasks.py            # Standardized reading tasks
│   │   └── voice_tracker.py            # Historical tracking
│   ├── tracking/                # Health tracking system
│   │   ├── __init__.py
│   │   ├── health_tracker.py   # Data storage and retrieval
│   │   └── change_evaluator.py # Trend analysis
│   └── utils/
│       ├── __init__.py
│       ├── image_preprocessing.py  # Image loading and normalization
│       ├── color_utils.py          # Color analysis utilities
│       ├── skin_type_detector.py   # Fitzpatrick skin type detection
│       └── report_generator.py     # Report generation
├── examples/
│   └── example_usage.py        # Usage examples
└── tests/                      # Test files (to be added)
```

## Development Environment

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Virtual environment (recommended)

### Setup

```bash
# Clone the repository
git clone https://github.com/Raymond-Aidev/GoldenCheck.git
cd GoldenCheck

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install in development mode
pip install -e .
```

### Dependencies

Core dependencies:
- **opencv-python**: Image processing
- **Pillow**: Image handling
- **numpy**: Numerical operations
- **mediapipe**: Face/hand detection (optional)
- **scikit-image**: Advanced image analysis
- **matplotlib**: Visualization
- **rich**: CLI formatting
- **click**: CLI framework

Voice analysis dependencies:
- **librosa**: Audio processing and feature extraction
- **soundfile**: Audio file I/O
- **parselmouth**: Python interface to Praat (phonetic analysis)

## Common Commands

| Command | Description |
|---------|-------------|
| `pip install -r requirements.txt` | Install dependencies |
| `pip install -e .` | Install package in dev mode |
| `goldencheck <image>` | Analyze an image (CLI) |
| `goldencheck <image> -m nails` | Analyze nails |
| `goldencheck <image> -f json` | Output as JSON |
| `goldencheck <image> -o report.html -f html` | Save HTML report |
| `pytest` | Run tests |
| `black src/` | Format code |
| `mypy src/` | Type checking |

## Code Style & Conventions

### General Guidelines

1. **Consistency**: Follow existing patterns in the codebase
2. **Simplicity**: Prefer simple, readable solutions over clever ones
3. **Documentation**: Add docstrings to all public functions/classes
4. **Type Hints**: Use type hints for function signatures
5. **Testing**: Include tests for new functionality

### Python Style

- Follow PEP 8 guidelines
- Use snake_case for functions and variables
- Use PascalCase for classes
- Use UPPER_CASE for constants
- Maximum line length: 100 characters

### Naming Conventions

- Analyzers: `*Analyzer` (e.g., `SkinAnalyzer`)
- Results: `*Result` (e.g., `AnalysisResult`)
- Utilities: Descriptive module names (e.g., `color_utils.py`)

### File Organization

- Each analyzer in its own file under `src/analyzers/`
- Utility functions in `src/utils/`
- Main entry points in `src/` root
- Examples in `examples/`
- Tests mirror source structure in `tests/`

## Architecture Notes

### Analysis Pipeline

1. **Image Preprocessing** (`image_preprocessing.py`)
   - Load image from file or bytes
   - Assess image quality (brightness, contrast, sharpness)
   - Normalize for consistent analysis
   - Apply white balance correction

2. **Region Detection**
   - Face detection using Haar cascades
   - Eye detection within face region
   - Skin segmentation using HSV/YCrCb color spaces
   - Lip detection in lower face region

3. **Health Analysis** (individual analyzers)
   - Each analyzer extracts specific health indicators
   - Results include values (0-1 scale), confidence, and details
   - Indicators classified as: normal, mild, moderate, significant

4. **Report Generation** (`report_generator.py`)
   - Aggregate all analyzer results
   - Calculate overall health score
   - Generate recommendations
   - Output in text, JSON, or HTML format

### Health Indicators

| Category | Indicators |
|----------|------------|
| Skin | yellowing, redness, pallor, uniformity, texture, spots |
| Eyes | yellowing, redness, clarity, dark circles, anemia_index, jaundice_index |
| Lips | cyanosis, pallor, dryness, moisture, oxygen_saturation_index |
| Nails | cyanosis, pallor, yellowing, surface irregularity |
| Face | symmetry, complexion, puffiness, wellness |

### Voice Analysis Module

The voice analysis module provides cognitive assessment through speech analysis.

#### Key Components

| Component | Purpose |
|-----------|---------|
| `VoiceAnalyzer` | Core audio processing, acoustic feature extraction |
| `ProsodicAnalyzer` | Speech rate, pause patterns, rhythm analysis |
| `PronunciationAnalyzer` | Articulation quality, voice quality (jitter, shimmer, HNR) |
| `CognitiveSpeechEvaluator` | Integrated cognitive assessment with risk levels |
| `ReadingTaskManager` | Standardized reading tasks (Korean/English) |
| `VoiceTracker` | Historical tracking and trend analysis |

#### Speech Metrics

| Metric | Description | Cognitive Relevance |
|--------|-------------|---------------------|
| Speech Rate | Syllables per second | Processing speed indicator |
| Pause Duration | Average pause length | Memory/word retrieval |
| Pause Burden Index | Overall pause impact | Cognitive load indicator |
| Hesitation Ratio | Long pauses / total pauses | Processing difficulty |
| Rhythm Stability | Consistency of speech rhythm | Executive function |
| Articulation Score | Pronunciation precision | Motor control |
| Jitter/Shimmer | Voice perturbation | Voice quality/health |

#### Research Basis

Based on peer-reviewed research:
- **NIA/NIH Study**: AI speech analysis predicts cognitive impairment progression with 78%+ accuracy
- **Nature 2025**: Voice biomarkers achieve AUC 0.988 for MCI detection
- **Cambridge Meta-analysis**: AD patients show 1.20 SD longer pauses than controls

#### Usage Example

```python
from src.voice_analysis import CognitiveSpeechEvaluator, ReadingTaskManager

# Get a reading task
task_manager = ReadingTaskManager(language='ko')
task = task_manager.get_random_task(difficulty=TaskDifficulty.MEDIUM)

# Evaluate speech
evaluator = CognitiveSpeechEvaluator(age_group='70-79')
result = evaluator.evaluate(audio, sr, task_text=task.text)

print(f"Overall Score: {result.overall_score}")
print(f"Risk Level: {result.risk_level.value}")
print(f"Recommendations: {result.recommendations}")
```

### Adding a New Analyzer

1. Create new file in `src/analyzers/`
2. Inherit from `BaseAnalyzer`
3. Implement `analyze()` and `get_required_regions()` methods
4. Register in `src/analyzers/__init__.py`
5. Add to `HealthAnalyzer._init_analyzers()` in `health_analyzer.py`

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/health_analyzer.py` | Main entry point, coordinates all analyzers |
| `src/analyzers/base_analyzer.py` | Base class defining analyzer interface |
| `src/utils/image_preprocessing.py` | Image loading and quality assessment |
| `src/utils/color_utils.py` | Color analysis for health detection |
| `src/utils/report_generator.py` | Report formatting and output |
| `src/cli.py` | Command-line interface |

## Git Workflow

### Branch Naming

- Feature branches: `feature/<description>`
- Bug fixes: `fix/<description>`
- Documentation: `docs/<description>`
- Claude AI branches: `claude/<description>-<session-id>`

### Commit Messages

Write clear, descriptive commit messages:
- Use imperative mood ("Add feature" not "Added feature")
- Keep subject line under 72 characters
- Reference issue numbers when applicable

Example:
```
Add nail cyanosis detection algorithm

- Implement blue tint detection in nail regions
- Add lunula (half-moon) visibility check
- Include surface irregularity analysis

Closes #123
```

## Testing

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src

# Run specific test file
pytest tests/test_skin_analyzer.py

# Run with verbose output
pytest -v
```

### Test Conventions

- Test files: `test_<module>.py`
- Test functions: `test_<description>()`
- Use pytest fixtures for common setup
- Include both unit and integration tests
- Test edge cases (empty images, low quality, etc.)

## Common Tasks

### Adding a New Health Indicator

1. Identify which analyzer should contain it
2. Add detection logic in the analyzer's `analyze()` method
3. Add indicator to the returned `indicators` dict
4. Update `INDICATOR_DESCRIPTIONS` in `health_analyzer.py`
5. Add recommendation text in `report_generator.py`
6. Add tests for the new indicator

### Improving Detection Accuracy

1. Collect sample images with known conditions
2. Analyze color/texture patterns
3. Adjust thresholds in the relevant analyzer
4. Validate against test dataset
5. Update confidence calculation if needed

## Troubleshooting

### Common Issues

**"No face detected"**
- Ensure face is clearly visible and well-lit
- Face should be front-facing
- Check image quality score

**Low confidence scores**
- Improve lighting conditions
- Ensure image is in focus
- Use higher resolution images

**Import errors**
- Ensure all dependencies installed: `pip install -r requirements.txt`
- Check Python version (3.8+ required)
- Verify virtual environment is activated

## External Resources

- [OpenCV Documentation](https://docs.opencv.org/)
- [MediaPipe Face Detection](https://google.github.io/mediapipe/solutions/face_detection)
- [Color Spaces in Image Processing](https://en.wikipedia.org/wiki/Color_space)
- [Fitzpatrick Skin Type Scale](https://en.wikipedia.org/wiki/Fitzpatrick_scale)

---

## Maintaining This Document

This CLAUDE.md should be updated when:

- New analyzers or indicators are added
- Development workflows change
- New conventions are established
- Common issues are discovered
- Dependencies change significantly

**Last Updated**: January 2026
