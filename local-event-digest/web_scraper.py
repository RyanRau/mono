"""
web_scraper.py

Fetches event source pages and extracts their readable text content.
This replaces Claude's web_search tool, eliminating per-search API costs
and reducing token usage from search-result overhead.
"""

import re
import httpx
from bs4 import BeautifulSoup


_URL_PATTERN = re.compile(r"https?://[^\s)]+")

# Tags that typically hold the main readable content
_TEXT_TAGS = {"p", "li", "h1", "h2", "h3", "h4", "td", "th", "span", "a", "time"}


def extract_urls(sources_markdown: str) -> list[str]:
    """Extract all URLs from the sources markdown file."""
    return _URL_PATTERN.findall(sources_markdown)


def fetch_page_text(url: str, timeout: float = 20.0) -> str:
    """Fetch a URL and return its visible text content.

    Returns a truncated plain-text extraction of the page body,
    keeping only the first ~6000 characters to limit token usage.
    """
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (compatible; LocalEventDigestBot/1.0; "
            "+https://github.com)"
        ),
    }
    try:
        resp = httpx.get(url, headers=headers, timeout=timeout, follow_redirects=True)
        resp.raise_for_status()
    except (httpx.HTTPError, httpx.TimeoutException) as exc:
        return f"[Failed to fetch {url}: {exc}]"

    soup = BeautifulSoup(resp.text, "html.parser")

    # Remove non-content elements
    for tag in soup(["script", "style", "nav", "footer", "header", "noscript", "svg"]):
        tag.decompose()

    # Extract text from content-bearing tags
    lines: list[str] = []
    for el in soup.find_all(_TEXT_TAGS):
        text = el.get_text(separator=" ", strip=True)
        if text and len(text) > 10:
            lines.append(text)

    page_text = "\n".join(lines)
    # Truncate to keep token costs low
    return page_text[:6000]


def scrape_sources(sources_markdown: str) -> str:
    """Scrape all source URLs and return combined content as a single string.

    Each source's content is labelled with its URL for context.
    """
    urls = extract_urls(sources_markdown)
    sections: list[str] = []

    for url in urls:
        text = fetch_page_text(url)
        sections.append(f"--- Source: {url} ---\n{text}")

    return "\n\n".join(sections)
