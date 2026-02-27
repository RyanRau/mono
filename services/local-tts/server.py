import io
import struct
from contextlib import asynccontextmanager

import numpy as np
import soundfile as sf
from fastapi import FastAPI, Query, Request
from fastapi.responses import HTMLResponse, Response, StreamingResponse

pipeline = None

VOICES = [
    "af_alloy",
    "af_aoede",
    "af_bella",
    "af_heart",
    "af_jessica",
    "af_kore",
    "af_nicole",
    "af_nova",
    "af_river",
    "af_sarah",
    "af_sky",
    "am_adam",
    "am_echo",
    "am_eric",
    "am_liam",
    "am_michael",
    "am_onyx",
    "am_puck",
    "am_santa",
    "bf_alice",
    "bf_emma",
    "bf_lily",
    "bf_rosa",
    "bm_daniel",
    "bm_fable",
    "bm_george",
    "bm_lewis",
]

SAMPLE_RATE = 24000


@asynccontextmanager
async def lifespan(app: FastAPI):
    global pipeline
    from kokoro import KPipeline

    print("Loading Kokoro TTS pipeline...")
    pipeline = KPipeline(lang_code="a")
    print("Pipeline ready.")
    yield


app = FastAPI(lifespan=lifespan)


def make_wav_header(sample_rate: int, num_channels: int, bits_per_sample: int) -> bytes:
    """Create a WAV header with size fields set to max (for streaming)."""
    max_size = 0xFFFFFFFF
    data_size = max_size - 36
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        max_size,
        b"WAVE",
        b"fmt ",
        16,
        1,  # PCM
        num_channels,
        sample_rate,
        sample_rate * num_channels * bits_per_sample // 8,
        num_channels * bits_per_sample // 8,
        bits_per_sample,
        b"data",
        data_size,
    )
    return header


@app.post("/api/tts")
async def tts_download(request: Request):
    """Generate TTS and return complete WAV file for download."""
    body = await request.json()
    text = body.get("text", "")
    voice = body.get("voice", "af_heart")
    speed = float(body.get("speed", 1.0))

    if not text.strip():
        return Response(content="No text provided", status_code=400)

    chunks = []
    for _gs, _ps, audio in pipeline(text, voice=voice, speed=speed):
        chunks.append(audio)

    if not chunks:
        return Response(content="No audio generated", status_code=500)

    combined = np.concatenate(chunks)
    buf = io.BytesIO()
    sf.write(buf, combined, SAMPLE_RATE, format="WAV", subtype="PCM_16")
    buf.seek(0)

    return Response(
        content=buf.read(),
        media_type="audio/wav",
        headers={"Content-Disposition": 'attachment; filename="tts_output.wav"'},
    )


@app.post("/api/tts/stream")
async def tts_stream(request: Request):
    """Stream TTS audio chunk by chunk as a WAV stream."""
    body = await request.json()
    text = body.get("text", "")
    voice = body.get("voice", "af_heart")
    speed = float(body.get("speed", 1.0))

    if not text.strip():
        return Response(content="No text provided", status_code=400)

    def generate():
        header_sent = False
        for _gs, _ps, audio in pipeline(text, voice=voice, speed=speed):
            if not header_sent:
                yield make_wav_header(SAMPLE_RATE, 1, 16)
                header_sent = True
            pcm = (audio * 32767).numpy().astype(np.int16)
            yield pcm.tobytes()

    return StreamingResponse(generate(), media_type="audio/wav")


@app.get("/api/voices")
async def list_voices():
    return {"voices": VOICES}


@app.get("/", response_class=HTMLResponse)
async def index(
    text: str = Query(default=""),
    voice: str = Query(default="af_heart"),
    speed: float = Query(default=1.0),
):
    return HTML_PAGE



HTML_PAGE = """\
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Local TTS</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #0a0a0a;
    color: #e0e0e0;
    min-height: 100vh;
    display: flex;
    justify-content: center;
    padding: 2rem;
  }
  .container {
    width: 100%;
    max-width: 640px;
  }
  h1 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 1.5rem;
    color: #fff;
  }
  label {
    display: block;
    font-size: 0.8rem;
    font-weight: 500;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.4rem;
  }
  textarea {
    width: 100%;
    height: 160px;
    background: #141414;
    border: 1px solid #2a2a2a;
    border-radius: 8px;
    color: #e0e0e0;
    font-family: inherit;
    font-size: 0.95rem;
    padding: 0.75rem;
    resize: vertical;
    outline: none;
    transition: border-color 0.15s;
  }
  textarea:focus { border-color: #444; }
  .controls {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }
  .control-group { flex: 1; }
  select, input[type="range"] {
    width: 100%;
    background: #141414;
    border: 1px solid #2a2a2a;
    border-radius: 6px;
    color: #e0e0e0;
    font-size: 0.9rem;
    padding: 0.5rem;
    outline: none;
  }
  select { cursor: pointer; }
  input[type="range"] {
    -webkit-appearance: none;
    height: 6px;
    border-radius: 3px;
    background: #2a2a2a;
    border: none;
    padding: 0;
    margin-top: 0.6rem;
  }
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px; height: 16px;
    border-radius: 50%;
    background: #e0e0e0;
    cursor: pointer;
  }
  .speed-label {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .speed-value {
    font-size: 0.85rem;
    color: #e0e0e0;
    font-variant-numeric: tabular-nums;
  }
  .actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }
  button {
    flex: 1;
    padding: 0.7rem 1rem;
    border: 1px solid #2a2a2a;
    border-radius: 8px;
    background: #141414;
    color: #e0e0e0;
    font-family: inherit;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  button:hover { background: #1e1e1e; border-color: #444; }
  button:disabled { opacity: 0.4; cursor: not-allowed; }
  button.primary { background: #fff; color: #0a0a0a; border-color: #fff; }
  button.primary:hover { background: #ddd; border-color: #ddd; }
  button.primary:disabled { background: #666; border-color: #666; color: #333; }
  .status {
    margin-top: 1rem;
    font-size: 0.85rem;
    color: #666;
    min-height: 1.2em;
  }
  #audio-player {
    margin-top: 1rem;
    width: 100%;
    display: none;
  }
  audio { width: 100%; }
</style>
</head>
<body>
<div class="container">
  <h1>Local TTS</h1>

  <label for="text">Text</label>
  <textarea id="text" placeholder="Enter text to synthesize..."></textarea>

  <div class="controls">
    <div class="control-group">
      <label for="voice">Voice</label>
      <select id="voice"></select>
    </div>
    <div class="control-group">
      <div class="speed-label">
        <label for="speed">Speed</label>
        <span class="speed-value" id="speed-display">1.0x</span>
      </div>
      <input type="range" id="speed" min="0.5" max="2.0" step="0.1" value="1.0">
    </div>
  </div>

  <div class="actions">
    <button id="btn-stream" class="primary">Stream</button>
    <button id="btn-download">Download</button>
  </div>

  <div class="status" id="status"></div>
  <div id="audio-player"><audio id="audio" controls></audio></div>
</div>

<script>
const textEl = document.getElementById("text");
const voiceEl = document.getElementById("voice");
const speedEl = document.getElementById("speed");
const speedDisplay = document.getElementById("speed-display");
const btnStream = document.getElementById("btn-stream");
const btnDownload = document.getElementById("btn-download");
const statusEl = document.getElementById("status");
const audioPlayer = document.getElementById("audio-player");
const audioEl = document.getElementById("audio");

// Populate voices
fetch("/api/voices").then(r => r.json()).then(data => {
  data.voices.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    if (v === "af_heart") opt.selected = true;
    voiceEl.appendChild(opt);
  });
});

speedEl.addEventListener("input", () => {
  speedDisplay.textContent = parseFloat(speedEl.value).toFixed(1) + "x";
});

// Apply query params if present
const params = new URLSearchParams(window.location.search);
if (params.get("text")) textEl.value = params.get("text");
if (params.get("speed")) {
  speedEl.value = params.get("speed");
  speedDisplay.textContent = parseFloat(params.get("speed")).toFixed(1) + "x";
}
if (params.get("voice")) {
  // Set after voices load
  const wanted = params.get("voice");
  const observer = new MutationObserver(() => {
    if (voiceEl.querySelector(`option[value="${wanted}"]`)) {
      voiceEl.value = wanted;
      observer.disconnect();
    }
  });
  observer.observe(voiceEl, { childList: true });
}

function getPayload() {
  return {
    text: textEl.value,
    voice: voiceEl.value,
    speed: parseFloat(speedEl.value),
  };
}

function setLoading(loading) {
  btnStream.disabled = loading;
  btnDownload.disabled = loading;
}

// Stream
btnStream.addEventListener("click", async () => {
  const payload = getPayload();
  if (!payload.text.trim()) { statusEl.textContent = "Enter some text first."; return; }

  setLoading(true);
  statusEl.textContent = "Generating audio...";
  audioPlayer.style.display = "none";

  try {
    const resp = await fetch("/api/tts/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      statusEl.textContent = "Error: " + (await resp.text());
      setLoading(false);
      return;
    }

    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);

    // Clean up previous object URL
    if (audioEl.src.startsWith("blob:")) URL.revokeObjectURL(audioEl.src);

    audioEl.src = url;
    audioPlayer.style.display = "block";
    audioEl.play();
    statusEl.textContent = "Playing.";
  } catch (err) {
    statusEl.textContent = "Error: " + err.message;
  } finally {
    setLoading(false);
  }
});

// Download
btnDownload.addEventListener("click", async () => {
  const payload = getPayload();
  if (!payload.text.trim()) { statusEl.textContent = "Enter some text first."; return; }

  setLoading(true);
  statusEl.textContent = "Generating audio...";

  try {
    const resp = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      statusEl.textContent = "Error: " + (await resp.text());
      setLoading(false);
      return;
    }

    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tts_output.wav";
    a.click();
    URL.revokeObjectURL(url);
    statusEl.textContent = "Download started.";
  } catch (err) {
    statusEl.textContent = "Error: " + err.message;
  } finally {
    setLoading(false);
  }
});
</script>
</body>
</html>
"""
