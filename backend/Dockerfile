# AAI-HRMS API (FastAPI + MongoDB)
# Build: DOCKER_BUILDKIT=1 docker compose build api
# Entrypoint: migrations → QA seed → demo seeds (once) → uvicorn
FROM python:3.11-slim-bookworm

LABEL org.opencontainers.image.title="aai-hrms-api" \
      org.opencontainers.image.description="AAI HRMS FastAPI backend"

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Slim runtime deps (no pytest/black/mypy) — see requirements-docker.txt
COPY requirements-docker.txt ./
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir -r requirements-docker.txt

COPY . .

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8000/api/health || exit 1

RUN chmod +x docker-entrypoint.sh

ENTRYPOINT ["./docker-entrypoint.sh"]
