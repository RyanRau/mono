"""
email_sender.py

Sends the weekly events digest as an email via SMTP.
"""

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import markdown


def build_email(
    subject: str, body_md: str, sender: str, recipients: list[str]
) -> MIMEMultipart:
    """Build a multipart email with both plain-text and HTML versions.

    The body is expected in markdown; an HTML version is generated automatically.
    """
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = ", ".join(recipients)

    # Plain-text fallback
    msg.attach(MIMEText(body_md, "plain", "utf-8"))

    # HTML version
    html_body = markdown.markdown(body_md, extensions=["tables", "fenced_code"])
    html_wrapped = (
        "<html><body style='font-family: sans-serif; line-height: 1.5;'>"
        f"{html_body}"
        "</body></html>"
    )
    msg.attach(MIMEText(html_wrapped, "html", "utf-8"))

    return msg


def send_email(subject: str, body_md: str) -> None:
    """Send the digest email using SMTP settings from environment variables.

    Required env vars:
        SMTP_HOST      - SMTP server hostname
        SMTP_PORT      - SMTP server port (e.g. 587)
        SMTP_USER      - SMTP username / login
        SMTP_PASSWORD  - SMTP password
        EMAIL_FROM     - Sender address
        EMAIL_TO       - Comma-separated recipient addresses
    """
    smtp_host = os.environ["SMTP_HOST"]
    smtp_port = int(os.environ["SMTP_PORT"])
    smtp_user = os.environ["SMTP_USER"]
    smtp_password = os.environ["SMTP_PASSWORD"]
    email_from = os.environ["EMAIL_FROM"]
    email_to = [addr.strip() for addr in os.environ["EMAIL_TO"].split(",")]

    msg = build_email(subject, body_md, email_from, email_to)

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.sendmail(email_from, email_to, msg.as_string())

    print(f"Email sent to {', '.join(email_to)}")
