"""
event_summarizer.py

Takes pre-scraped event source content and sends it to Claude for
summarisation into a weekly digest.  Uses Haiku for low cost.
"""

import os
from datetime import datetime, timedelta

import anthropic


SYSTEM_PROMPT = (
    "You are a helpful local events assistant. "
    "You will be given scraped text from local event source websites. "
    "Using this content, compile a concise, friendly weekly events digest "
    "suitable for email. Use markdown formatting. Group events by day. "
    "For each event include: name, date/time, location, a one-sentence "
    "description, and the source URL."
)


def build_prompt(scraped_content: str) -> str:
    """Build the user prompt containing the date range and the scraped content."""
    today = datetime.now()
    week_end = today + timedelta(days=7)
    date_range = (
        f"{today.strftime('%A %B %d, %Y')} to {week_end.strftime('%A %B %d, %Y')}"
    )

    return (
        f"Today's date is {today.strftime('%Y-%m-%d')}. "
        f"The upcoming week covers {date_range}.\n\n"
        "Here is the scraped content from local event sources:\n\n"
        f"{scraped_content}\n\n"
        "Please compile events happening this week into a well-organised digest."
    )


def summarize_events(
    scraped_content: str,
    model: str = "claude-haiku-4-20250414",
) -> str:
    """Send pre-scraped content to Claude and return the digest.

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
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[
            {"role": "user", "content": build_prompt(scraped_content)},
        ],
    )

    text_parts = [block.text for block in message.content if block.type == "text"]
    return "\n\n".join(text_parts)
