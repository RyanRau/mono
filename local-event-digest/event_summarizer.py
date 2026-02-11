"""
event_summarizer.py

Passes the full sources markdown file to Claude with web search enabled.
Claude searches each source directly and compiles the weekly events digest.
"""

import os
from datetime import datetime, timedelta

import anthropic


SYSTEM_PROMPT = (
    "You are a helpful local events assistant. "
    "You will be given a markdown file listing local event source websites, "
    "organised by category. Use the web search tool to look up each source "
    "and find events happening during the specified date range. "
    "Produce a concise, friendly weekly events digest suitable for email. "
    "Use markdown formatting. Group events by day. "
    "For each event include: name, date/time, location, a one-sentence "
    "description, and the source URL."
)


def build_prompt(sources_markdown: str) -> str:
    """Build the user prompt containing the date range and the full sources file."""
    today = datetime.now()
    week_end = today + timedelta(days=7)
    date_range = (
        f"{today.strftime('%A %B %d, %Y')} to {week_end.strftime('%A %B %d, %Y')}"
    )

    return (
        f"Today's date is {today.strftime('%Y-%m-%d')}. "
        f"The upcoming week covers {date_range}.\n\n"
        "Here is my list of local event sources:\n\n"
        f"{sources_markdown}\n\n"
        "Please search each of these sources for events happening this week "
        "and compile them into a well-organised digest."
    )


def summarize_events(
    sources_markdown: str,
    model: str = "claude-sonnet-4-20250514",
) -> str:
    """Send the sources markdown to Claude with web search and return the digest.

    Requires ANTHROPIC_API_KEY to be set in the environment.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise EnvironmentError(
            "ANTHROPIC_API_KEY is not set. Add it to your .env file."
        )

    client = anthropic.Anthropic(api_key=api_key)

    message = client.messages.create(
        model=model,
        max_tokens=16000,
        system=SYSTEM_PROMPT,
        tools=[{"type": "web_search_20250305", "name": "web_search"}],
        messages=[
            {"role": "user", "content": build_prompt(sources_markdown)},
        ],
    )

    # Extract text blocks from the response (skip tool-use blocks)
    text_parts = [block.text for block in message.content if block.type == "text"]
    return "\n\n".join(text_parts)
