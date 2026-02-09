"""
event_summarizer.py

Sends fetched page content to Claude and asks it to extract a curated
list of local events happening this week.
"""

import os
from datetime import datetime, timedelta

import anthropic


def build_prompt(source_contents: dict[str, str]) -> str:
    """Build the user prompt that contains all source material.

    Each source is wrapped in XML-style tags so Claude can distinguish them.
    """
    today = datetime.now()
    week_end = today + timedelta(days=7)
    date_range = f"{today.strftime('%A %B %d, %Y')} to {week_end.strftime('%A %B %d, %Y')}"

    sections = []
    for url, content in source_contents.items():
        # Truncate very large pages to stay within context limits
        trimmed = content[:15_000]
        sections.append(f"<source url=\"{url}\">\n{trimmed}\n</source>")

    sources_block = "\n\n".join(sections)

    return (
        f"Today's date is {today.strftime('%Y-%m-%d')}. "
        f"The upcoming week covers {date_range}.\n\n"
        "Below are the contents of several local event sources. "
        "Please extract every event happening during the upcoming week and "
        "compile them into a clear, well-organised list.\n\n"
        "For each event include:\n"
        "- Event name\n"
        "- Date and time\n"
        "- Location / venue\n"
        "- A one-sentence description\n"
        "- Source URL\n\n"
        "Group events by day. If no events are found for a source, skip it.\n\n"
        f"{sources_block}"
    )


SYSTEM_PROMPT = (
    "You are a helpful local events assistant. "
    "Your job is to read through web page content from various local sources "
    "and produce a concise, friendly weekly events digest suitable for email. "
    "Use markdown formatting. "
    "Only include events that fall within the specified date range."
)


def summarize_events(source_contents: dict[str, str], model: str = "claude-sonnet-4-20250514") -> str:
    """Send source content to Claude and return the summarised events list.

    Requires ANTHROPIC_API_KEY to be set in the environment.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise EnvironmentError("ANTHROPIC_API_KEY is not set. Add it to your .env file.")

    client = anthropic.Anthropic(api_key=api_key)

    user_prompt = build_prompt(source_contents)

    message = client.messages.create(
        model=model,
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[
            {"role": "user", "content": user_prompt},
        ],
    )

    return message.content[0].text
