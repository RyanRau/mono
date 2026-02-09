"""
main.py

Orchestrates the full pipeline:
  1. Parse source URLs from a markdown file
  2. Fetch content from each source
  3. Send content to Claude to extract this week's events
  4. Email the resulting digest
"""

import argparse
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

from source_parser import parse_sources
from event_fetcher import fetch_all_sources
from event_summarizer import summarize_events
from email_sender import send_email

DEFAULT_SOURCES_FILE = Path(__file__).parent / "sources.md"


def run(sources_file: str, dry_run: bool = False) -> str:
    """Execute the full pipeline and return the digest text.

    Args:
        sources_file: Path to the markdown file containing source URLs.
        dry_run: If True, print the digest instead of emailing it.
    """
    # Step 1 - Parse sources
    print("Parsing sources...")
    urls = parse_sources(sources_file)
    if not urls:
        print("No URLs found in the sources file.")
        return ""
    print(f"  Found {len(urls)} source(s).")

    # Step 2 - Fetch content
    print("Fetching source content...")
    contents = fetch_all_sources(urls)
    if not contents:
        print("Could not fetch content from any source.")
        return ""
    print(f"  Successfully fetched {len(contents)} source(s).")

    # Step 3 - Summarise with Claude
    print("Summarising events with Claude...")
    digest = summarize_events(contents)
    print("  Digest ready.")

    # Step 4 - Send email (or print in dry-run mode)
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
