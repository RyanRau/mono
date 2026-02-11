# Local Event Digest

A weekly digest pipeline that uses Claude to search your local event sources and emails you a summary of what's happening in your area.

## How It Works

1. You maintain a `sources.md` file with categorized links to local event calendars
2. The entire file is passed to Claude (with web search enabled) — Claude visits each source and extracts upcoming events
3. The digest is formatted and emailed to your recipients

## Project Structure

```
local-event-digest/
├── main.py               # Orchestrator — reads file, calls summarizer, sends email
├── event_summarizer.py   # Passes sources to Claude API with web search
├── email_sender.py       # Formats and sends the digest via SMTP
├── sources.md            # Your categorized list of event source URLs
├── requirements.txt      # Python dependencies
├── .env.example          # Template for secrets
└── .env                  # Your actual secrets (git-ignored)
```

## Local Setup

### 1. Install dependencies

```bash
cd local-event-digest
pip install -r requirements.txt
```

### 2. Create your `.env` file

```bash
cp .env.example .env
```

Then fill in each value (see [Getting Your Secrets](#getting-your-secrets) below).

### 3. Edit `sources.md`

Replace the example URLs with real local event sources for your area:

```markdown
# Local Event Sources

## Music & Concerts
- https://your-city-venue.com/events
- https://local-music-blog.com/shows

## Community
- https://your-city.gov/events
```

### 4. Run it

```bash
# Dry run — prints the digest to your terminal, no email sent
python main.py --dry-run

# Send the email
python main.py

# Use a different sources file
python main.py -s /path/to/my-sources.md
```

## Getting Your Secrets

### Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to **Settings → API Keys**
4. Click **Create Key**, give it a name
5. Copy the key — it starts with `sk-ant-`
6. Add credits under **Settings → Billing** (the digest costs roughly $0.30–0.65 per run)

### Gmail SMTP (recommended for simplicity)

Gmail requires an **App Password**, which is a one-time 16-character code that lets this script send email through your account.

**Step 1 — Enable 2-Step Verification** (required first):

1. Go to [myaccount.google.com](https://myaccount.google.com/)
2. Navigate to **Security → How you sign in to Google**
3. Enable **2-Step Verification** and follow the prompts

**Step 2 — Generate an App Password:**

1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Enter an app name (e.g. `Local Event Digest`)
3. Click **Create**
4. Copy the 16-character password immediately — you cannot view it again

**Step 3 — Fill in your `.env`:**

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASSWORD=abcd efgh ijkl mnop   # the 16-char app password
EMAIL_FROM=you@gmail.com
EMAIL_TO=you@gmail.com,friend@example.com
```

### Other Email Providers

| Provider | SMTP Host | Port |
|---|---|---|
| Gmail | `smtp.gmail.com` | 587 |
| Outlook / Hotmail | `smtp.office365.com` | 587 |
| Yahoo | `smtp.mail.yahoo.com` | 587 |
| FastMail | `smtp.fastmail.com` | 587 |

For non-Gmail providers, use your normal email password (or an app-specific password if they offer one).

## GitHub Actions (Automated Weekly Schedule)

The included workflow runs the digest **every Monday at 8:00 AM UTC** automatically.

### Setup

1. Push this repo to GitHub

2. Go to your repository's **Settings → Secrets and variables → Actions**

3. Click **New repository secret** and add each one:

   | Secret Name | Value |
   |---|---|
   | `ANTHROPIC_API_KEY` | Your `sk-ant-...` key |
   | `SMTP_HOST` | `smtp.gmail.com` |
   | `SMTP_PORT` | `587` |
   | `SMTP_USER` | `you@gmail.com` |
   | `SMTP_PASSWORD` | Your 16-char app password |
   | `EMAIL_FROM` | `you@gmail.com` |
   | `EMAIL_TO` | `recipient1@example.com,recipient2@example.com` |

4. The workflow file is at `.github/workflows/weekly-digest.yml`. To change the schedule, edit the cron expression:

   ```yaml
   # Examples:
   cron: "0 8 * * 1"   # Monday 8am UTC
   cron: "0 14 * * 0"  # Sunday 2pm UTC
   cron: "0 8 * * 1,4" # Monday and Thursday 8am UTC
   ```

5. You can also trigger it manually from the **Actions** tab → **Weekly Local Events Digest** → **Run workflow**.

## Cost Estimate

| | Per Run | Monthly (4x) | Yearly |
|---|---|---|---|
| Anthropic API | ~$0.30–0.65 | ~$1.20–2.60 | ~$15–35 |
| GitHub Actions | Free | Free | Free |
| Email (Gmail) | Free | Free | Free |
