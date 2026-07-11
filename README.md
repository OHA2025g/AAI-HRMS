# AAI-HRMS - Agentic AI HR Management System

An enterprise-grade AI-powered HR Management System with intelligent candidate sourcing, resume parsing, fit scoring, and interview management.

## Features

### Core Modules
- **JD Intake & AI Analysis** - Create jobs with AI-powered skill extraction and scoring rubric generation
- **Candidate Management** - Upload resumes (PDF/DOCX) with AI parsing, track skills and experience
- **Fit Scoring Engine** - AI computes skill match %, activity match %, title similarity
- **ATS Pipeline** - Kanban-style drag & drop candidate pipeline
- **Interview Scheduling** - Schedule interviews, submit feedback, track progress
- **Referrals** - One-click employee referral system
- **AI Assessments** - Auto-generate tests from job descriptions
- **Notifications** - Real-time notifications for pipeline changes

### Tech Stack
- **Frontend**: React 18 + Tailwind CSS + Shadcn/UI + Framer Motion
- **Backend**: FastAPI (Python 3.11+)
- **Database**: MongoDB
- **AI**: OpenAI-compatible API (`OPENAI_API_KEY`, or optional `EMERGENT_LLM_KEY` where supported in code)

## Prerequisites

- Node.js 18+ and Yarn
- Python 3.11+
- MongoDB (local or Atlas)
- OpenAI API key (`OPENAI_API_KEY` in `backend/.env`)

## Local Setup Instructions

### 1. Clone and Extract
```bash
unzip aai-hrms-complete.zip -d aai-hrms
cd aai-hrms
```

### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env .env.local
```

Edit `backend/.env` with your settings:
```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="aai_hrms"
CORS_ORIGINS="http://localhost:3000"
JWT_SECRET="your-secure-secret-key"
JWT_ALGORITHM="HS256"
JWT_EXPIRY_HOURS=24
OPENAI_API_KEY="your-openai-api-key"
# Optional legacy alias still read by the API in some paths:
# EMERGENT_LLM_KEY="..."
```

**Note**: Prefer `OPENAI_API_KEY`; the server also accepts `EMERGENT_LLM_KEY` where implemented.

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
yarn install

# Configure environment
```

Edit `frontend/.env`:
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

### 4. Start MongoDB
```bash
# If using local MongoDB
mongod --dbpath /path/to/data

# Or use MongoDB Atlas connection string in MONGO_URL
```

### 5a. Run with Docker (optional)

From the **repository root** (requires Docker Desktop / Engine):

```bash
docker compose up --build
```

The **`api`** container entrypoint runs **migrations → QA seed → LCD50 demo** (`scripts/seed_employees_lifecycle_demo.py`) before uvicorn. On a **fresh Mongo volume** you get **50 employees (`LCD50-*`)** plus cross-module demo data (training, engagement, project skills, retention scores, workforce skills). If LCD50 employees **already exist** (e.g. after a restart), the script **still re-syncs cross-module** data so training/M6/M4/M8 stay populated; it does **not** duplicate employees. To **wipe and fully re-seed** employees + lifecycle: `LCD50_SEED_REPLACE=1 docker compose up -d` or add that to root `.env`. For an empty DB: `docker compose down -v` then `docker compose up --build`.

| URL | Purpose |
|-----|---------|
| **http://localhost:3001** | Web UI (Docker maps host `3001` → container nginx) |
| **http://localhost:8000/api/health** | API health |
| **http://localhost:8000/docs** | OpenAPI |

Default QA admin (after seed): **`qa_admin@aai-hrms.local`** / **`QA_Seed_ChangeMe!`**

Optional: create a `.env` in the repo root with `JWT_SECRET=...` and `OPENAI_API_KEY` / `EMERGENT_LLM_KEY` as needed (passed into the `api` service).

More detail: **`deploy/DOCKER.md`**.

### 5b. Demo: 50 employees + lifecycle / compliance sample data (optional)

Loads **`LCD50-001` … `LCD50-050`** into Mongo with varied **status** (ONBOARDING / ACTIVE / INACTIVE / EXITED), **manager hierarchy**, **skills**, **M8 HRIS fields** (comp band, promotions, market percentile, etc.), **lifecycle events** (processed history + a few **pending approval** rows), and **compliance documents**.

The same cohort is also wired into **cross-module demo data**: **M5** training assignments + certifications + stub **LMS** courses, **M6** pulse survey + per-employee responses, **M4** demo project with skill demands/allocations, **M8** `m8_attrition_scores_latest` rows (keyed by employee `id`), and **`workforce_skills`** upserts for common skills.

```bash
cd backend
# uses MONGO_URL + DB_NAME from backend/.env
python scripts/seed_employees_lifecycle_demo.py
```

Re-run from scratch (deletes prior `LCD50-*` employees **and** related demo rows: training, certifications, pulse survey/responses, M8 scores, demo project demands/allocations, seeded LMS courses):

```bash
LCD50_SEED_REPLACE=1 python scripts/seed_employees_lifecycle_demo.py
```

To seed **only** employees / lifecycle / compliance (skip training, engagement, M4, M8 extras):  
`LCD50_SKIP_CROSS=1 python scripts/seed_employees_lifecycle_demo.py`

**Docker (automatic):** the **`api` image entrypoint** already runs this script after QA seed (see **`backend/docker-entrypoint.sh`**). You only need manual `docker compose exec api python scripts/seed_employees_lifecycle_demo.py` if you changed data and want to run it without restarting, or use **`LCD50_SEED_REPLACE=1`** in compose/`.env` on the next **`docker compose up`** to wipe and re-seed LCD50.

**If login/register fails or the Employees page shows “Failed to load employees”:**  
- **Docker UI (`http://localhost:3001`):** use QA admin `qa_admin@aai-hrms.local` / `QA_Seed_ChangeMe!` after containers are healthy.  
- **`yarn start` + API elsewhere:** the dev default is **`http://127.0.0.1:8001/api`**. If your API is on **8000** (e.g. Docker mapping `8000:8000`), set `REACT_APP_BACKEND_URL=http://127.0.0.1:8000` in `frontend/.env` and restart `yarn start`. See `frontend/.env.example`.  
- Load demo rows with the seed commands above if the employee list is empty.  
- If the toast says **“Employee not found”** while loading the list: **rebuild/restart the API** so you have the fix where **`GET /api/employees/paged` is registered before `GET /api/employees/{employee_id}`** (otherwise the path segment `paged` was matched as an ID).

### 5. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
yarn start
```

### 6. Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001/api
- API Docs: http://localhost:8001/docs

## Default Login
Create a new account on the registration page, or use:
- Email: Any valid email
- Password: Min 6 characters

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Jobs
- `GET /api/jobs` - List all jobs
- `POST /api/jobs` - Create job (triggers AI analysis)
- `GET /api/jobs/{id}` - Get job details
- `POST /api/match/{job_id}` - Find matching candidates

### Candidates
- `GET /api/candidates` - List candidates
- `POST /api/candidates` - Create candidate
- `POST /api/candidates/upload-resume` - Upload & parse resume
- `GET /api/candidates/{id}/profile` - Full profile with applications

### Applications
- `GET /api/applications` - List applications
- `POST /api/applications` - Create application
- `PUT /api/applications/{id}/stage` - Update pipeline stage
- `GET /api/pipeline/{job_id}` - Get Kanban pipeline

### Interviews
- `GET /api/interviews` - List interviews
- `POST /api/interviews` - Schedule interview
- `POST /api/interviews/{id}/feedback` - Submit feedback

### Assessments
- `GET /api/assessments` - List assessments
- `POST /api/assessments/generate/{job_id}` - AI generate assessment

### Notifications
- `GET /api/notifications` - List notifications
- `PUT /api/notifications/read-all` - Mark all read
- `GET /api/notifications/unread-count` - Get unread count

## Testing

- **Unit / backend:** `cd backend && pytest -q` (see `.github/workflows/quality-gates.yml` for the default subset).
- **Optional API integration:** set `RUN_PHASE1_INTEGRATION=1`, `PHASE1_BASE_URL`, `PHASE1_BEARER_TOKEN` — `backend/tests/test_phase1_integration.py`.
- **End-to-end (Playwright):** runbook **`e2e/README.md`**. Quick start (after Mongo + migrate + `seed_qa_baseline.py`): API on `:11001`, UI with `REACT_APP_BACKEND_URL` set, then `cd e2e && npm install && npx playwright install chromium && npm test`.
- **CI:** workflow **E2E (Playwright)** (`.github/workflows/e2e-playwright.yml`) on PRs touching `frontend/`, `backend/`, or `e2e/`, plus **workflow_dispatch**.

## Project Structure
```
aai-hrms/
├── backend/                 # FastAPI app (domain packages + server.py)
├── frontend/
│   └── src/
│       ├── app/             # App shell + routes
│       ├── features/        # Feature modules (smart-hiring, admin, …)
│       ├── shared/          # Shared UI, lib, hooks, config
│       └── data/            # Static frontend data helpers
├── data/excel/              # Local Excel seed workbooks (gitignored)
├── deploy/                  # Kubernetes + observability
├── docs/                    # Engineering / testing docs
├── e2e/                     # Playwright E2E tests
├── scripts/                 # Load/perf + validation helpers
└── README.md
```

## AI Features

1. **JD Analysis Agent** - Extracts skills, activities, creates scoring rubric
2. **Resume Parser Agent** - Parses PDF/DOCX, extracts structured data
3. **Fit Scoring Agent** - Computes match percentages with explainability
4. **Assessment Generator** - Creates MCQs and questions from JD

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running: `mongod --dbpath /data/db`
- Check connection string in `.env`

### API Key Issues
- Verify `OPENAI_API_KEY` (or `EMERGENT_LLM_KEY` / `HF_TOKEN` per `server.py`) is set correctly

### CORS Errors
- Ensure `CORS_ORIGINS` includes your frontend URL
- Restart backend after `.env` changes

## License
MIT License - Feel free to use and modify.

## Support
For issues, please create a GitHub issue or contact support.
