"""
main.py

Orchestrates the full pipeline:
  1. Read the sources markdown file
  2. Pass it to Claude (with web search) to find this week's events
  3. Email the resulting digest
"""

import argparse
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

from event_summarizer import summarize_events
from email_sender import send_email

DEFAULT_SOURCES_FILE = Path(__file__).parent / "sources.md"


def read_sources(filepath: str) -> str:
    """Read the sources markdown file and return its contents."""
    path = Path(filepath)
    if not path.exists():
        raise FileNotFoundError(f"Sources file not found: {filepath}")
    return path.read_text(encoding="utf-8")


def run(sources_file: str, dry_run: bool = False) -> str:
    """Execute the full pipeline and return the digest text."""
    # Step 1 - Read sources file
    print("Reading sources file...")
    sources_md = read_sources(sources_file)
    print(f"  Loaded {sources_file}")

    # Step 2 - Send to Claude with web search
    print("Searching sources and summarising events with Claude...")
    digest = summarize_events(sources_md)
    print("  Digest ready.")

    # Step 3 - Send email (or print in dry-run mode)
    if dry_run:
        print("\n--- DRY RUN: Email would contain the following ---\n")
        print(digest)
    else:
        today = datetime.now().strftime("%B %d, %Y")
        subject = f"Local Events Digest - Week of {today}"
        print("Sending email...")
        send_email(subject, digest)

    return digest


def main() -> None:
    load_dotenv()

    parser = argparse.ArgumentParser(
        description="Generate and email a weekly local events digest."
    )
    parser.add_argument(
        "-s", "--sources",
        default=str(DEFAULT_SOURCES_FILE),
        help="Path to the markdown sources file (default: sources.md in project dir)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the digest to stdout instead of sending email.",
    )
    args = parser.parse_args()

    run(args.sources, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
