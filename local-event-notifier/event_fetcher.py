"""
event_fetcher.py

Fetches the content of each source URL and returns the raw text/HTML
so it can be fed into Claude for summarisation.
"""

import requests


def fetch_source(url: str, timeout: int = 30) -> str:
    """Fetch a single URL and return its text content.

    Returns an empty string (with a printed warning) on failure so that
    one broken source doesn't stop the whole pipeline.
    """
    try:
        response = requests.get(url, timeout=timeout, headers=_headers())
        response.raise_for_status()
        return response.text
    except requests.RequestException as exc:
        print(f"[warning] Failed to fetch {url}: {exc}")
        return ""


def fetch_all_sources(urls: list[str]) -> dict[str, str]:
    """Fetch every URL and return a mapping of url -> page content.

    Sources that fail to load are omitted from the result.
    """
    results: dict[str, str] = {}
    for url in urls:
        content = fetch_source(url)
        if content:
            results[url] = content
    return results


def _headers() -> dict[str, str]:
    """Default request headers."""
    return {
        "User-Agent": (
            "Mozilla/5.0 (compatible; LocalEventNotifier/1.0; "
            "+https://github.com/local-event-notifier)"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
