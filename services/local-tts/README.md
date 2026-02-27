# local-tts

Local web server for text-to-speech using [Kokoro TTS](https://github.com/hexgrad/kokoro).

## Prerequisites

- Python 3.10–3.12
- [espeak-ng](https://github.com/espeak-ng/espeak-ng) installed on your system

**macOS:**
```bash
brew install espeak-ng
```

## Setup

```bash
cd services/local-tts
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
python -m uvicorn server:app --host 0.0.0.0 --port 8000
```

Then open http://localhost:8000 in your browser.

For Apple Silicon GPU acceleration:
```bash
PYTORCH_ENABLE_MPS_FALLBACK=1 python -m uvicorn server:app --host 0.0.0.0 --port 8000
```

## API

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Web UI |
| `/api/tts` | POST | Generate and download a complete WAV file |
| `/api/tts/stream` | POST | Stream audio as it's generated |
| `/api/voices` | GET | List available voices |

### POST body (JSON)

```json
{
  "text": "Hello world",
  "voice": "af_heart",
  "speed": 1.0
}
```
