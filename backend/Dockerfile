# AAI-HRMS API (FastAPI + MongoDB)
# Build: docker compose build api   |   Run: docker compose up -d
# Entrypoint: migrations → QA seed → LCD50 (50 employees + E2E demo data) → uvicorn
FROM python:3.11-slim-bookworm

LABEL org.opencontainers.image.title="aai-hrms-api" \
      org.opencontainers.image.description="AAI HRMS FastAPI backend"

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

# Matches /api/health (entrypoint waits for Mongo before uvicorn binds)
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8000/api/health || exit 1

RUN chmod +x docker-entrypoint.sh

ENTRYPOINT ["./docker-entrypoint.sh"]
