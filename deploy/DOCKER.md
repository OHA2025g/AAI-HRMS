# Docker — full stack

## Files

| File | Role |
|------|------|
| `docker-compose.yml` | Mongo + API + static UI |
| `backend/Dockerfile` | Python 3.11; entrypoint runs migrate + seeds + uvicorn :8000 |
| `backend/docker-entrypoint.sh` | Wait for Mongo → `mongo_migrate.py` → QA seed → **LCD50 E2E demo (50 employees + cross-module)** → uvicorn |
| `frontend/Dockerfile` | `yarn build` + nginx :80 |
| `frontend/nginx.conf` | SPA routing |

## Run

```bash
# from repository root
docker compose up --build
```

**Fast rebuild (recommended — uses BuildKit layer + pip/yarn caches):**

```bash
export DOCKER_BUILDKIT=1 COMPOSE_DOCKER_CLI_BUILD=1
docker compose up --build -d
```

Avoid `docker compose build --no-cache` unless `requirements.txt` / `yarn.lock` changed — it forces ~3–15+ minutes of `pip`/`yarn` on every build.

**Clean rebuild (only when dependencies changed):**

```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Why builds felt slow (~30 min)

| Cause | Fix |
|-------|-----|
| `--no-cache` on every build | Use `docker compose up --build` (cached layers) |
| macOS Docker context sync (~10 min for tiny contexts) | Move repo to a short path **without spaces** (e.g. `~/projects/aai-hrms`); keep Docker Desktop updated |
| Full `pip` + `yarn` every rebuild | BuildKit cache mounts in Dockerfiles; slim `requirements-docker.txt` for API image |
| 10+ demo seeds on **every** API restart | Demo seeds run **once per Mongo volume** (`_docker_bootstrap` marker); set `DEMO_SEEDS_FORCE=1` to re-run |
| LCD50 cross-module sync on every restart | Skipped when `_lcd50_cross_sync` marker exists (`LCD50_FORCE_CROSS_SYNC=1` to override) |

**Test in browser**

- **App UI:** http://localhost:3001 (compose maps host `3001` → nginx; use another host port if `3001` is taken — edit `docker-compose.yml` and add that origin to `CORS_ORIGINS`)  
- **API (from browser):** same origin as the UI — the SPA calls **`/api/...`** and nginx proxies to the `api` container (no CORS issues).  
- **API health (direct):** http://localhost:8000/api/health  
- **OpenAPI:** http://localhost:8000/docs  

**QA admin** (after seed): `qa_admin@aai-hrms.local` / `QA_Seed_ChangeMe!`

**LCD50 demo data (50 employees):** inserted when the DB has no `LCD50-*` employees. On **every** API container start, if those employees already exist, the seed **re-syncs cross-module** data (training, pulse, project, M8, workforce skills) without duplicating employee rows. Full wipe + re-seed of employees/lifecycle: `LCD50_SEED_REPLACE=1`. Fresh DB: `docker compose down -v` then `docker compose up --build`.

## Optional env file

Create **`.env` in the repo root** (same folder as `docker-compose.yml`). Compose does **not** read `backend/.env` for container env — that file is for **local** `uvicorn` only and is excluded from the Docker build (`.dockerignore`).

Copy from **`.env.example`** at the repo root, then fill in secrets:

```env
JWT_SECRET=your-long-secret
EMERGENT_LLM_KEY=your-llm-key
OPENAI_API_KEY=
HF_TOKEN=
HF_MODEL=meta-llama/Llama-3.1-8B-Instruct
LCD50_SEED_REPLACE=0
# Optional: wipe LCD50 demo rows and re-seed on next api container start
# LCD50_SEED_REPLACE=1
```

## Remote hosts

By default the UI uses **relative `/api`** (nginx → `api:8000`). For a **split** deployment (UI and API on different public hosts), rebuild the **web** image with the API URL reachable **from the user’s browser** and **remove or replace** the `/api/` `proxy_pass` block in `frontend/nginx.conf` if you serve the SPA elsewhere:

```bash
docker compose build --build-arg REACT_APP_BACKEND_URL=https://api.example.com web
```

## Notes

- Mongo data persists in Docker volume `aai_hrms_mongo_data` (not published to the host by default).
- Frontend `yarn install` uses a long network timeout for slow registries.
