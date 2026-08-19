# Pharvix backend — FastAPI on uvicorn.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# libglib/libgomp: opencv-python-headless still links them.
# libjpeg/zlib/freetype: Pillow and reportlab.
# curl: the container healthcheck below.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libglib2.0-0 \
        libgomp1 \
        libjpeg62-turbo \
        zlib1g \
        libfreetype6 \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first so a source-only change doesn't reinstall the world.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Uploaded logos and generated documents live here and must survive a rebuild —
# docker-compose mounts a named volume over it.
RUN mkdir -p /app/storage

# Don't run as root.
RUN useradd --create-home --uid 10001 pharvix \
    && chown -R pharvix:pharvix /app
USER pharvix

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -fsS http://localhost:8000/health || exit 1

# One worker on purpose: main.py starts APScheduler and several asyncio polling
# loops at import time, so every extra worker would duplicate the nightly audit,
# the scheduled reports and the WhatsApp briefings.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--proxy-headers", "--forwarded-allow-ips", "*"]
