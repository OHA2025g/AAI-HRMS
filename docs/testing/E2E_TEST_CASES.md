# AAI-HRMS — end-to-end test cases

This document is the **master test-case catalog** for the product. **Automated** cases are implemented under `e2e/tests/` (Playwright). **Manual** cases are recommended for releases until automated coverage exists.

**Environment defaults**

| Item | Value |
|------|--------|
| QA admin (seed script) | `qa_admin@aai-hrms.local` / `QA_Seed_ChangeMe!` |
| API | `http://127.0.0.1:11001` |
| UI | `http://127.0.0.1:3000` |
| Seed | `backend/scripts/seed_qa_baseline.py` |

---

## 1. Platform & health

| ID | Objective | Steps | Expected | Auto? |
|----|------------|-------|----------|-------|
| TC-PLT-001 | API alive | `GET /api/health` | `200`, `status: healthy`, `timestamp` | ✅ `e2e/tests/api-backend.spec.ts` |
| TC-PLT-002 | Metrics (ops) | `GET /metrics` | `200`, Prometheus text | Manual |
| TC-PLT-003 | Auth guard | Open `/dashboard` logged out | Redirect to `/login` | ✅ `auth-and-smoke.spec.ts` |

---

## 2. Authentication & session

| ID | Objective | Steps | Expected | Auto? |
|----|------------|-------|----------|-------|
| TC-AUTH-001 | Login page | Open `/login` | Sign In tab, email/password fields | ✅ `auth-and-smoke.spec.ts` |
| TC-AUTH-002 | Admin login | Enter QA admin credentials → Sign In | Land on `/dashboard`, heading “Dashboard” | ✅ `auth-and-smoke.spec.ts` |
| TC-AUTH-003 | Register | Sign Up tab → valid user | Account created or duplicate error handled | Manual |
| TC-AUTH-004 | Logout | Log out from layout | Token cleared, redirect login | Manual |
| TC-AUTH-005 | Session restore | Login → refresh | Still authenticated | Manual |

---

## 3. Talent acquisition (Phase 1)

| ID | Objective | Steps | Expected | Auto? |
|----|------------|-------|----------|-------|
| TC-TA-001 | Jobs list | `/jobs` | H1 “Jobs”, list or empty state | ✅ `navigation-modules.spec.ts` |
| TC-TA-002 | Create job | Create Job → fill required → save | Job appears in list | Manual |
| TC-TA-003 | Job detail | Open a job | Detail loads | Manual |
| TC-TA-004 | Candidates | `/candidates` | H1 “Candidates” | ✅ `navigation-modules.spec.ts` |
| TC-TA-005 | Add candidate | Add Candidate flow | Candidate created | Manual |
| TC-TA-006 | Pipeline | `/pipeline` | Pipeline view loads | Manual |
| TC-TA-007 | Interviews | `/interviews` | Page loads | Manual |

---

## 4. Workforce & employees

| ID | Objective | Steps | Expected | Auto? |
|----|------------|-------|----------|-------|
| TC-WF-001 | Employee master | `/employees` | H1 “Employee Master” | ✅ `navigation-modules.spec.ts` |
| TC-WF-002 | Edit employee | Edit → certifications block | M5 certs table or empty message | Manual |
| TC-WF-003 | Workforce skills | `/workforce-inventory` | H1 “Workforce Skill Inventory” | ✅ `navigation-modules.spec.ts` |
| TC-WF-004 | Bulk import (API) | `POST /api/employees/bulk-import` dry_run | 200, summary | ✅ `backend/tests/test_phase1_integration.py` (opt-in) |

---

## 5. Lifecycle & automation (M2 / M7)

| ID | Objective | Steps | Expected | Auto? |
|----|------------|-------|----------|-------|
| TC-LC-001 | Lifecycle UI | `/employee-lifecycle` | H1 “Employee Lifecycle” | ✅ `navigation-modules.spec.ts` |
| TC-LC-002 | Workflow admin | `/admin/workflow-automation` (admin) | H1 “Workflow automation” | ✅ `navigation-modules.spec.ts` |
| TC-LC-003 | Dispatch rules | API `POST .../dispatch-triggered` | JSON with executed/skipped | Manual |

---

## 6. Intelligence, M4, M5, M6, M8

| ID | Objective | Steps | Expected | Auto? |
|----|------------|-------|----------|-------|
| TC-M3-001 | Workforce intelligence | `/workforce-intelligence` | H1 “Workforce Intelligence” | ✅ `navigation-modules.spec.ts` |
| TC-M4-001 | Resource optimization | `/resource-optimization` | H1 “Resource Optimization” | Manual* |
| TC-M5-001 | Training page | `/training-recommendations` | Page loads | Manual* |
| TC-M6-001 | Engagement | `/employee-engagement` | Page loads | Manual* |
| TC-M8-001 | Retention | `/employee-retention` | Page loads | Manual* |

\*Add to `navigation-modules.spec.ts` when headings are stable.

---

## 7. Executive & M9

| ID | Objective | Steps | Expected | Auto? |
|----|------------|-------|----------|-------|
| TC-M9-001 | Executive KPIs | `/executive-kpis` | H1 “Executive KPI Dashboard”, cards load | ✅ `navigation-modules.spec.ts` |
| TC-M9-002 | Leadership ZIP | Click “Download full leadership pack” | ZIP downloads | Manual |
| TC-M9-003 | KPI API | `GET /api/executive/kpis` with JWT | 200, JSON | Manual / integration |

---

## 8. HR Copilot (M7)

| ID | Objective | Steps | Expected | Auto? |
|----|------------|-------|----------|-------|
| TC-COP-001 | Copilot page | `/hr-copilot` | H1 “HR Copilot” | ✅ `navigation-modules.spec.ts` |
| TC-COP-002 | Chat turn | Send “automation status” | Reply + no 5xx | Manual |

---

## 9. Admin (role = admin)

| ID | Objective | Steps | Expected | Auto? |
|----|------------|-------|----------|-------|
| TC-ADM-001 | Integrations | `/admin/integrations` | Page loads | Manual |
| TC-ADM-002 | Roles | `/admin/roles` | Page loads | Manual |
| TC-ADM-003 | Workflow designer | `/admin/workflow-automation/designer` | Designer loads | Manual |

---

## 10. Non-functional / release

| ID | Objective | Steps | Expected | Auto? |
|----|------------|-------|----------|-------|
| TC-NF-001 | Load smoke | `perf/load/k6-smoke.js` vs staging | Thresholds pass | ✅ k6 script + workflow |
| TC-NF-002 | Cross-browser | Login smoke on Firefox/WebKit | Same as Chrome | Manual / extend Playwright projects |
| TC-NF-003 | Accessibility spot-check | Keyboard nav on login | Focus order OK | Manual |

---

## Traceability — automated files

| File | Covers |
|------|--------|
| `e2e/tests/api-backend.spec.ts` | TC-PLT-001 |
| `e2e/tests/auth-and-smoke.spec.ts` | TC-PLT-003, TC-AUTH-001, TC-AUTH-002 |
| `e2e/tests/navigation-modules.spec.ts` | TC-TA-001, TC-TA-004, TC-WF-001, TC-WF-003, TC-LC-001, TC-LC-002, TC-M3-001, TC-M9-001, TC-COP-001 |

---

## How we “performed” E2E

- **In this environment:** the API was not running, so the automated **API health** test **failed** with `ECONNREFUSED` (expected).  
- **In your environment:** start Mongo + API + UI as in `e2e/README.md`, then `cd e2e && npm test`.  
- **In CI:** push a PR touching `frontend/`, `backend/`, or `e2e/` to trigger **E2E (Playwright)**, or run **workflow_dispatch**.

---

## Maintenance

- When adding a page, add a **stable `h1`** (or `data-testid`) and extend `navigation-modules.spec.ts` or a feature spec.
- For flaky network, increase `expect.timeout` in `playwright.config.ts`.
- Keep **QA seed** credentials synchronized with this document and `seed_qa_baseline.py`.
