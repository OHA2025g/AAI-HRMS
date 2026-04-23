# M10 — Architecture & scalability blueprint

This document satisfies **M10-1 Domain decomposition blueprint**: proposed service boundaries, API gateway routing, and migration sequencing. Implementation today remains a **modular monolith** (FastAPI + MongoDB); the backbone for async integration is **M10 event log** (`m10_events`, see `docs/engineering/M10_IMPLEMENTATION_STATUS.md`).

---

## 1. Service boundary proposal (M10-1 sub-task)

| Bounded context | Owns (data / rules) | Today in monolith | Future service (candidate) | Sync boundary |
|-----------------|---------------------|-------------------|----------------------------|---------------|
| **Talent Acquisition** | Jobs, candidates, applications, interviews, fit scores | `server.py` + TA modules | `ta-service` | Events: `hrms.application.*`, `hrms.interview.*` |
| **Employee & lifecycle** | Employee master, lifecycle events, compliance docs | Phase-2 routes | `employee-service` | `hrms.employee.lifecycle_event.*` |
| **Workforce & skills** | Workforce skills, M3/M4 caches, training | `m3_*`, `m4_*`, `m5_*` | `workforce-service` | `hrms.workforce.*` |
| **Engagement** | Surveys, responses, privacy audit | `m6_*` | `engagement-service` | `hrms.engagement.*` |
| **Automation** | Workflow rules/runs, baselines, copilot audit | `m7_*` | `automation-service` | `hrms.workflow.run.*` |
| **Retention** | Attrition model, scores, interventions | `m8_*` | `retention-service` (or workforce) | `hrms.retention.*` |
| **Analytics / executive** | KPI catalog, snapshots, drill | `m9_*` | `analytics-service` (read-heavy) | `hrms.analytics.*` |
| **Identity & access** | Users, JWT, roles | Auth routes | `iam-service` | Gateway validates JWT; internal mTLS optional |

**Principles:**  
- **No big-bang split**: extract read models or batch jobs first.  
- **Events as contract** between services (versioned topic names).  
- **MongoDB per context** (or collection prefixes) before separate clusters.

---

## 2. API gateway route plan (M10-1 sub-task)

Assumes a single **edge gateway** (Kong, NGINX, AWS API Gateway, Azure APIM) in front of N upstreams. Path prefixes route to **current monolith** until a service is extracted.

| Public path prefix | Owner (target) | Auth | Notes |
|--------------------|----------------|------|--------|
| `/api/auth/*`, `/api/register`, `/api/login` | IAM / monolith | Public + JWT issue | Rate-limit login |
| `/api/jobs/*`, `/api/candidates/*`, `/api/applications/*`, `/api/match/*` | TA | JWT | Heavy read caching optional |
| `/api/employees/*`, `/api/employee-lifecycle/*`, `/api/org/*` | Employee | JWT | PII — audit |
| `/api/workforce/*`, `/api/workforce/intelligence/*` | Workforce | JWT | Long-running ETL via async job |
| `/api/executive/*`, `/api/executive/m9/*` | Analytics | JWT `kpi_read` | Snapshot cron uses token route |
| `/api/admin/*` | Platform ops | JWT admin | Stricter IP allowlist in prod |
| `/api/webhooks/*` | Ingress rules | Shared secret / HMAC | SSRF guards (M7) |
| `/api/health`, `/metrics` | Observability | Optional token for `/metrics` | LB health checks |

**Versioning:** prefer **`Accept`/header** or `/api/v2/` only when breaking; internal events use **`topic.v1`** suffix.

---

## 3. Migration sequencing document (M10-1 sub-task)

Phased path from **monolith** toward **services + event backbone** without blocking delivery.

| Phase | Goal | Actions | Exit criteria |
|-------|------|---------|----------------|
| **0 — Current** | Modular monolith | Packages `m3`…`m10`, shared `db`, JWT | All M-modules tested |
| **1 — Events** | Loose coupling inside monolith | **M10 event log** producers on key flows; consumers in-process; idempotency | Topics stable v1; replay runbook |
| **2 — Gateway hardening** | Edge policy | Rate limits, WAF, `/admin` restrictions, request IDs | SLO for auth latency |
| **3 — Read replicas / cache** | Scale reads | Mongo secondary reads for analytics; optional Redis cache for hot keys | P95 dashboard ↓ |
| **4 — Extract first service** | Lowest risk slice | e.g. **automation** or **analytics** behind gateway; dual-write or CDC | Traffic % canary |
| **5 — HA / DR** | Resilience | Backup/restore drills, RPO/RTO targets | Runbooks signed off |

**Ordering rule:** finish **Phase 1 (events)** before extracting services so outbound contracts exist.

---

## 4. References

- **M10 implementation:** `docs/engineering/M10_IMPLEMENTATION_STATUS.md`  
- **Event topics:** `backend/m10_events/topics.py`  
- **Ops:** `docs/runbooks/m10-dr-failover-drill.md`, `docs/runbooks/m10-oncall-handoff.md`
- **Load / perf (Week 12):** `perf/load/k6-smoke.js`, workflow `.github/workflows/m10-load-test-k6.yml`, SLO template `docs/testing/M12_LOAD_TEST_SLO.md`
