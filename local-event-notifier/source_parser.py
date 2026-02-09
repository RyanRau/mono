"""
source_parser.py

Reads a markdown file containing a list of sources (URLs) and extracts them.
Expected markdown format:

    # Local Event Sources

    - https://example.com/events
    - https://another-site.com/whats-on
"""

import re
from pathlib import Path


def parse_sources(filepath: str) -> list[str]:
    """Read a markdown file and extract all URLs listed as bullet items."""
    path = Path(filepath)
    if not path.exists():
        raise FileNotFoundError(f"Sources file not found: {filepath}")

    text = path.read_text(encoding="utf-8")
    return extract_urls(text)


def extract_urls(text: str) -> list[str]:
    """Extract URLs from markdown text.

    Supports:
      - bare URLs on bullet lines:  `- https://example.com`
      - markdown links:             `- [Label](https://example.com)`
    """
    urls: list[str] = []

    for line in text.splitlines():
        line = line.strip()
        if not line.startswith(("-", "*")):
            continue

        # Try markdown link syntax first: [text](url)
        md_match = re.search(r"\[.*?\]\((https?://[^\s)]+)\)", line)
        if md_match:
            urls.append(md_match.group(1))
            continue

        # Fall back to bare URL
        bare_match = re.search(r"(https?://[^\s]+)", line)
        if bare_match:
            urls.append(bare_match.group(1))

    return urls
