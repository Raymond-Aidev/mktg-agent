"""
GoldenCheck Example Usage

Demonstrates how to use the GoldenCheck health analyzer.
"""

from pathlib import Path


def example_basic_analysis():
    """Basic face photo analysis."""
    from src.health_analyzer import HealthAnalyzer, AnalysisConfig, AnalysisMode

    # Create analyzer with default settings
    analyzer = HealthAnalyzer()

    # Analyze a face photo
    report = analyzer.analyze("path/to/face_photo.jpg")

    # Print text report
    print(analyzer.report_generator.to_text(report))

    # Access individual indicators
    print(f"\nOverall Status: {report.overall_status.value}")
    print(f"Overall Score: {report.overall_score}/100")

    for indicator in report.indicators:
        print(f"- {indicator.name}: {indicator.value:.3f} ({indicator.level.value})")


def example_nail_analysis():
    """Nail-focused analysis."""
    from src.health_analyzer import HealthAnalyzer, AnalysisConfig, AnalysisMode

    # Configure for nail analysis
    config = AnalysisConfig(
        mode=AnalysisMode.NAILS,
        enable_nails=True,
        enable_skin=False,
        enable_eyes=False,
        enable_lips=False,
        enable_face=False
    )

    analyzer = HealthAnalyzer(config)
    report = analyzer.analyze("path/to/nail_photo.jpg")

    print(analyzer.report_generator.to_text(report))


def example_quick_function():
    """Using the convenience function."""
    from src.health_analyzer import analyze_image

    # Quick analysis with simple dictionary output
    result = analyze_image("path/to/photo.jpg", mode="face")

    print(f"Status: {result['status']}")
    print(f"Score: {result['score']}")
    print(f"Warnings: {result['warnings']}")

    for ind in result['indicators']:
        print(f"- {ind['name']}: {ind['level']}")


def example_custom_config():
    """Custom configuration example."""
    from src.health_analyzer import HealthAnalyzer, AnalysisConfig, AnalysisMode

    # Create custom configuration
    config = AnalysisConfig(
        mode=AnalysisMode.FULL,
        enable_skin=True,
        enable_eyes=True,
        enable_lips=True,
        enable_face=True,
        enable_nails=False,
        min_confidence=0.5,  # Only show high-confidence results
        generate_html_report=True
    )

    analyzer = HealthAnalyzer(config)
    report = analyzer.analyze("path/to/photo.jpg")

    # Generate HTML report
    html = analyzer.report_generator.to_html(report)
    with open("health_report.html", "w") as f:
        f.write(html)

    print("HTML report saved to health_report.html")


def example_mobile_integration():
    """Example for mobile app integration (bytes input)."""
    from src.health_analyzer import HealthAnalyzer

    analyzer = HealthAnalyzer()

    # Simulate receiving image bytes from mobile app
    with open("path/to/photo.jpg", "rb") as f:
        image_bytes = f.read()

    # Analyze from bytes
    report = analyzer.analyze_bytes(image_bytes)

    # Return JSON for mobile app
    json_result = analyzer.report_generator.to_json(report)
    print(json_result)


def example_accessing_details():
    """Accessing detailed analysis information."""
    from src.health_analyzer import HealthAnalyzer

    analyzer = HealthAnalyzer()
    report = analyzer.analyze("path/to/photo.jpg")

    # Check warnings
    if report.warnings:
        print("Warnings detected:")
        for warning in report.warnings:
            print(f"  - {warning}")

    # Check if medical consultation recommended
    if report.overall_status.value == "consult_doctor":
        print("\n⚠️  Medical consultation recommended")

    # Access recommendations
    if report.recommendations:
        print("\nRecommendations:")
        for rec in report.recommendations:
            print(f"  - {rec}")


def example_batch_processing():
    """Process multiple images."""
    from src.health_analyzer import HealthAnalyzer
    import os

    analyzer = HealthAnalyzer()
    results = []

    # Process all images in a directory
    image_dir = "path/to/images"
    for filename in os.listdir(image_dir):
        if filename.lower().endswith(('.jpg', '.jpeg', '.png')):
            filepath = os.path.join(image_dir, filename)
            try:
                report = analyzer.analyze(filepath)
                results.append({
                    'file': filename,
                    'status': report.overall_status.value,
                    'score': report.overall_score
                })
            except Exception as e:
                results.append({
                    'file': filename,
                    'error': str(e)
                })

    # Print summary
    print("\nBatch Processing Results:")
    print("-" * 50)
    for result in results:
        if 'error' in result:
            print(f"{result['file']}: ERROR - {result['error']}")
        else:
            print(f"{result['file']}: {result['status']} ({result['score']:.1f}/100)")


if __name__ == "__main__":
    print("GoldenCheck Example Usage")
    print("=" * 50)
    print("\nThis file contains example code for using GoldenCheck.")
    print("Edit the image paths and uncomment the function calls to run.")
    print("\nAvailable examples:")
    print("  - example_basic_analysis()")
    print("  - example_nail_analysis()")
    print("  - example_quick_function()")
    print("  - example_custom_config()")
    print("  - example_mobile_integration()")
    print("  - example_accessing_details()")
    print("  - example_batch_processing()")
