FROM python:3.12-slim

RUN apt-get update && apt-get install -y \
    espeak-ng \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY services/local-tts/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-bake the Kokoro model so startup is instant (avoids first-run download)
ENV HF_HOME=/app/hf_cache
RUN python -c "from kokoro import KPipeline; KPipeline(lang_code='a')"

COPY services/local-tts/server.py .

EXPOSE 8000
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
