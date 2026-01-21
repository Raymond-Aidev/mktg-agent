"""
GoldenCheck Command Line Interface

Provides CLI access to health analysis functionality.
"""

import sys
import argparse
from pathlib import Path

try:
    from rich.console import Console
    from rich.table import Table
    from rich.panel import Panel
    from rich.progress import Progress, SpinnerColumn, TextColumn
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False

from .health_analyzer import HealthAnalyzer, AnalysisConfig, AnalysisMode


def create_parser() -> argparse.ArgumentParser:
    """Create argument parser for CLI."""
    parser = argparse.ArgumentParser(
        prog='goldencheck',
        description='Analyze health indicators from smartphone photos'
    )

    parser.add_argument(
        'image',
        type=str,
        help='Path to the image file to analyze'
    )

    parser.add_argument(
        '-m', '--mode',
        choices=['face', 'nails', 'quick', 'full'],
        default='face',
        help='Analysis mode (default: face)'
    )

    parser.add_argument(
        '-o', '--output',
        type=str,
        help='Output file path (optional)'
    )

    parser.add_argument(
        '-f', '--format',
        choices=['text', 'json', 'html'],
        default='text',
        help='Output format (default: text)'
    )

    parser.add_argument(
        '-v', '--verbose',
        action='store_true',
        help='Show detailed output'
    )

    parser.add_argument(
        '--no-color',
        action='store_true',
        help='Disable colored output'
    )

    return parser


def print_rich_report(report, console: 'Console'):
    """Print report using rich formatting."""
    # Header
    console.print(Panel.fit(
        "[bold blue]GoldenCheck Health Analysis[/bold blue]",
        border_style="blue"
    ))

    # Overall status
    status_colors = {
        'excellent': 'green',
        'good': 'green',
        'fair': 'yellow',
        'attention_needed': 'orange1',
        'consult_doctor': 'red'
    }

    status_color = status_colors.get(report.overall_status.value, 'white')
    console.print(f"\n[bold]Overall Status:[/bold] [{status_color}]{report.overall_status.value.replace('_', ' ').title()}[/{status_color}]")
    console.print(f"[bold]Overall Score:[/bold] {report.overall_score:.1f}/100")
    console.print(f"[bold]Image Quality:[/bold] {report.image_quality_score:.1f}/100")

    # Warnings
    if report.warnings:
        console.print("\n[bold yellow]Warnings:[/bold yellow]")
        for warning in report.warnings:
            console.print(f"  [yellow]![/yellow] {warning}")

    # Indicators table
    if report.indicators:
        console.print("\n[bold]Health Indicators:[/bold]")

        table = Table(show_header=True, header_style="bold")
        table.add_column("Indicator", style="cyan")
        table.add_column("Status", justify="center")
        table.add_column("Value", justify="right")
        table.add_column("Confidence", justify="right")

        level_colors = {
            'normal': 'green',
            'mild': 'yellow',
            'moderate': 'orange1',
            'significant': 'red'
        }

        for indicator in report.indicators:
            color = level_colors.get(indicator.level.value, 'white')
            table.add_row(
                indicator.name,
                f"[{color}]{indicator.level.value}[/{color}]",
                f"{indicator.value:.3f}",
                f"{indicator.confidence:.0%}"
            )

        console.print(table)

    # Recommendations
    if report.recommendations:
        console.print("\n[bold]Recommendations:[/bold]")
        for i, rec in enumerate(report.recommendations, 1):
            console.print(f"  {i}. {rec}")

    # Disclaimer
    console.print(f"\n[dim]{report.disclaimer}[/dim]")


def print_plain_report(report):
    """Print report in plain text."""
    print("=" * 60)
    print("GOLDENCHECK HEALTH ANALYSIS")
    print("=" * 60)

    print(f"\nOverall Status: {report.overall_status.value.replace('_', ' ').title()}")
    print(f"Overall Score: {report.overall_score:.1f}/100")
    print(f"Image Quality: {report.image_quality_score:.1f}/100")

    if report.warnings:
        print("\nWarnings:")
        for warning in report.warnings:
            print(f"  ! {warning}")

    if report.indicators:
        print("\nHealth Indicators:")
        print("-" * 60)
        for indicator in report.indicators:
            status_symbol = {
                'normal': '[OK]',
                'mild': '[!]',
                'moderate': '[!!]',
                'significant': '[!!!]'
            }.get(indicator.level.value, '[?]')

            print(f"\n{indicator.name}")
            print(f"  Status: {status_symbol} {indicator.level.value}")
            print(f"  Value: {indicator.value:.3f}")
            print(f"  Confidence: {indicator.confidence:.0%}")

    if report.recommendations:
        print("\nRecommendations:")
        for i, rec in enumerate(report.recommendations, 1):
            print(f"  {i}. {rec}")

    print("\n" + "-" * 60)
    print("DISCLAIMER:")
    print(report.disclaimer)
    print("-" * 60)


def main():
    """Main CLI entry point."""
    parser = create_parser()
    args = parser.parse_args()

    # Check if image exists
    image_path = Path(args.image)
    if not image_path.exists():
        print(f"Error: Image file not found: {args.image}", file=sys.stderr)
        sys.exit(1)

    # Setup output
    use_rich = RICH_AVAILABLE and not args.no_color and args.format == 'text'

    if use_rich:
        console = Console()

    # Create analyzer
    mode = AnalysisMode(args.mode)
    config = AnalysisConfig(mode=mode)

    if mode == AnalysisMode.NAILS:
        config.enable_nails = True

    try:
        analyzer = HealthAnalyzer(config)

        # Show progress if using rich
        if use_rich:
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console,
            ) as progress:
                task = progress.add_task("Analyzing image...", total=None)
                report = analyzer.analyze(str(image_path), mode)
                progress.remove_task(task)
        else:
            print("Analyzing image...")
            report = analyzer.analyze(str(image_path), mode)

        # Generate output
        if args.format == 'json':
            output = analyzer.report_generator.to_json(report)
        elif args.format == 'html':
            output = analyzer.report_generator.to_html(report)
        else:
            output = None  # Will print directly

        # Write or print output
        if args.output:
            with open(args.output, 'w') as f:
                if output:
                    f.write(output)
                else:
                    f.write(analyzer.report_generator.to_text(report))
            print(f"Report saved to: {args.output}")
        else:
            if output:
                print(output)
            elif use_rich:
                print_rich_report(report, console)
            else:
                print_plain_report(report)

    except Exception as e:
        print(f"Error during analysis: {e}", file=sys.stderr)
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
