# Smart Hiring — phase implementation status

**Last updated:** 2026-05-25

Single checklist for all in-repo phase work (analytics, RBAC, dashboard, navigation, import, connectors). GitHub PR line items require `gh auth login` or pasted PR URLs for a per-PR matrix.

---

## Product phases (code)

| Phase / workstream | Status | Verify |
|--------------------|--------|--------|
| Analytics SH-AN-001 → 012 | **Done** | `pytest tests/test_hiring_dashboard*.py`; dashboard `/dashboard` |
| Hiring RBAC 1–5 + offer proposals | **Done** | `pytest tests/test_hiring_rbac*.py`; E2E `hiring-rbac*.spec.js` |
| Dashboard phase 6 polish | **Done** | `CHANGELOG.md`; Storybook + mobile E2E |
| Navigation IA 1–10 | **Done (code)** | `docs/navigation-canonical-map.md`; manual checklist in `navigation-rollout.md` |
| Excel candidate import | **Done** | `pytest tests/test_candidate_import_*.py`; E2E `candidate-import.spec.js` |
| Mistral + 25 questions | **Done** | `ASSESSMENT_QUESTIONS_PER_TYPE=25`; `test_assessment_question_count.py` |
| Smart Hiring–only mode | **Done** | Docker `SMART_HIRING_ONLY=1`; `REACT_APP_SMART_HIRING_ONLY=1` |
| LinkedIn RSC connector | **Done (code)** | Admin → Integrations; **ops:** live tenant + webhook |
| NAUKRI / MONSTER | **Not started** | `docs/engineering/TALENT_CONNECTORS.md` |
| Legacy dashboard v1 removal | **Planned Sep 2026** | `/dashboard/legacy` still available |

---

## Environment rollout (required per env)

```bash
cd backend
export MONGO_URL=... DB_NAME=... JWT_SECRET=...
python scripts/mongo_migrate.py up    # includes 0020 offer_status, 0021 hiring_team
python scripts/seed_qa_baseline.py    # v2 — RBAC + offer-proposal E2E fixtures
```

Optional full verification:

```bash
bash scripts/verify_smart_hiring_phases.sh
```

---

## CI coverage

`backend/scripts/run_phase1_tests_ci.sh` (used by `.github/workflows/quality-gates.yml`) runs:

- Hiring dashboard unit + integration tests
- Assessments tests
- Hiring RBAC unit + API tests
- Candidate import ETL + API tests
- Assessment 25-question guard
- Smoke + validate_restore

E2E (`e2e/tests/`) runs on the same workflow after seed: hiring dashboard, RBAC, candidate import, assessments.

---

## QA logins (after seed)

| Email | Role |
|-------|------|
| `qa_admin@aai-hrms.local` | admin |
| `qa_hm@aai-hrms.local` | hiring_manager |
| `qa_tm@aai-hrms.local` | technical_manager |
| `qa_pm@aai-hrms.local` | project_manager |

Password: `QA_Seed_ChangeMe!` (override with `QA_SEED_PASSWORD` when seeding).
