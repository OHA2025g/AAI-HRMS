# BRD + SRS Transformation (Card-Aligned)

This document is aligned with the **BRD + SRS Transformation** page (`/transformation`) and mirrors the card structure returned by `GET /api/transformation/modules`.

Card structure per module:
- Current State
- Achieved (as shipped)
- Gap
- Target State
- BRD
- SRS Functional
- SRS Non-Functional

---

## Target Platform Vision

**AI-Powered Workforce Intelligence Platform**

| Pillar | Business impact |
|---|---|
| hiring | Faster, cheaper, higher quality |
| workforce | Optimized utilization |
| employees | Higher satisfaction |
| organization | Data-driven decisions |
| cost | Reduced operational overhead |

---

## M1 - Talent Acquisition (Smart Hiring)

- **Status / Priority:** `in_progress` / `P0`
- **Current State:** End-to-end hiring loop is live: jobs, candidates, pipeline, interviews, referrals, assessments, and admin connector configs.
- **Achieved (as shipped):**
  - Multi-source ingestion (LinkedIn / Naukri / Monster) with OAuth refresh, paging, throttling, and connector health in Admin Integrations.
  - Unified candidate store with dedup keys (email, phone, resume hash, name), merge API, and dedup audit trail.
  - JD-candidate matching with deterministic + optional LLM scoring and ranking explainability in UI.
  - Hiring pipeline (kanban), interview proposals (HR approve/reject), optional calendar webhook sync, interview reminders dispatch.
- **Gap:** Production-grade external contracts (SLAs, rate limits per tenant), deeper Indeed/Glassdoor coverage, and full calendar provider packs beyond webhook bridge.
- **Target State:** Unified talent intelligence platform with multi-source ranking and automation.
- **BRD:**
  - Centralized talent intelligence platform
  - Seamless sourcing across portals and internal DB
  - Reduced hiring time/cost with improved quality of hire
- **SRS Functional:**
  - Portal connectors (LinkedIn, Naukri, Monster, etc.)
  - Central candidate repository
  - AI ranking + duplicate profile detection
  - Automated interview scheduling
- **SRS Non-Functional:**
  - High API reliability
  - Scalable ingestion
  - Near real-time processing

---

## M2 - Employee Lifecycle Management

- **Status / Priority:** `in_progress` / `P0`
- **Current State:** Employee master, org hierarchy, lifecycle events with approvals, compliance documents, and audit trail are implemented.
- **Achieved (as shipped):**
  - Employee master (CRUD, import, paged APIs, LCD50 demo seed) with legal status/transition validation.
  - Lifecycle events (create/update/delete), approval matrix (EXITED/ROLE_CHANGED), approve/reject, background processing, reprocess queue.
  - Org APIs: direct reports, management chain, org hierarchy; immutable-style lifecycle audit log.
  - Compliance documents: upload/verify, SLA due dates, breach + reminder admin scans, CSV export.
- **Gap:** Deep HRIS payroll/benefits integrations, bulk document workflows, and mobile-first employee self-service.
- **Target State:** End-to-end employee lifecycle from onboarding to exit.
- **BRD:**
  - Central employee repository
  - Lifecycle visibility and governance
- **SRS Functional:**
  - Employee master
  - Onboard-active-exit workflows
  - Role/hierarchy mapping
  - Document management
- **SRS Non-Functional:**
  - Secure data handling
  - Role-based access control

---

## M3 - Workforce Intelligence (Demand-Supply)

- **Status / Priority:** `in_progress` / `P1`
- **Current State:** Demand/supply views, historical feature store, baseline forecasting model, and monitoring hooks are available.
- **Achieved (as shipped):**
  - Workforce Intelligence UI + APIs for demand vs supply and gap analytics tied to projects, skills, and allocations.
  - ETL snapshot pipeline with DQ gates, synthetic backfill for demos, and stored feature history.
  - Per-skill baseline (OLS) forecast train/serve, model registry with activate/rollback, drift evaluation and retrain policy signals.
- **Gap:** Richer ML beyond linear baseline, automated scheduled ETL in all deployments without admin setup, and executive narrative packs for workforce risk.
- **Target State:** Predictive workforce planning with demand-supply balancing.
- **BRD:**
  - AI-driven workforce planning
  - Skill-demand forecasting for proactive decisions
- **SRS Functional:**
  - Skill inventory
  - Demand forecasting
  - Supply mapping
  - Skill gap analytics
- **SRS Non-Functional:**
  - ML scalability
  - Near real-time predictions

---

## M4 - Resource vs Project Optimization

- **Status / Priority:** `in_progress` / `P1`
- **Current State:** Project skill demands, allocations, greedy solver, scenario lab, and approval-to-apply workflow are live.
- **Achieved (as shipped):**
  - Project demands and allocations data model with min/max seats and HARD/SOFT constraints.
  - Constraint-based solver with explain steps, tunable optimization settings API.
  - Scenario simulate/save/compare, submit for approval, admin/hr approve or reject, apply-to-DB with notifications.
- **Gap:** Real-time utilization telemetry from timesheets, global bench dashboard, and MILP/CP-SAT solver options for larger portfolios.
- **Target State:** Intelligent resource allocation and utilization governance.
- **BRD:**
  - Optimize workforce utilization and project outcomes
- **SRS Functional:**
  - Project-resource mapping
  - Utilization dashboards
  - Over/under allocation alerts
  - Bench tracking
- **SRS Non-Functional:**
  - Real-time updates
  - High data accuracy

---

## M5 - Employee Training & Skill Development

- **Status / Priority:** `in_progress` / `P1`
- **Current State:** Recommendations, assignments, LMS catalog sync (stub provider), certifications, and manager rollup exist.
- **Achieved (as shipped):**
  - Skill-gap-driven training recommendations with templates and persisted assignments + progress patch.
  - LMS adapter with stub provider, catalog sync runs, course catalog API filtered by skill.
  - Certifications CRUD, expiry reminder scan, manager summary for direct reports (assignments + expiring certs).
- **Gap:** Live SCORM/xAPI LMS integrations, company-wide learning budgets, and automated enrollment into vendor systems.
- **Target State:** AI-driven L&D platform for continuous upskilling.
- **BRD:**
  - Continuous skill enhancement with personalized development
- **SRS Functional:**
  - Skill gap detection
  - Personalized learning paths
  - Training tracking
  - Certification management
- **SRS Non-Functional:**
  - LMS integration
  - Scalable recommendation engine

---

## M6 - Employee Satisfaction & Engagement

- **Status / Priority:** `in_progress` / `P2`
- **Current State:** Pulse surveys, templates, schedules, sentiment/topics dashboard, and privacy-aware RBAC are shipped.
- **Achieved (as shipped):**
  - Survey template CRUD with targeting; create pulse from template; schedules with admin dispatch of due runs.
  - Deterministic sentiment + topic aggregation; engagement dashboard with confidence tiers and anonymity threshold.
  - Raw response access limited to admin/hr_admin with privacy audit log; participation reminders.
- **Gap:** Multilingual NLP, continuous listening across channels (Slack/Teams), and benchmarked eNPS industry packs.
- **Target State:** Employee experience platform with actionable engagement insights.
- **BRD:**
  - Improve engagement and retention through continuous listening
- **SRS Functional:**
  - Pulse surveys
  - Feedback management
  - Sentiment engine
  - Engagement dashboards
- **SRS Non-Functional:**
  - Privacy compliance
  - Real-time analytics

---

## M7 - Cost Optimization & Automation

- **Status / Priority:** `in_progress` / `P1`
- **Current State:** Workflow automation (multi-trigger, flow designer, webhooks), HR Copilot, and savings baselines are live.
- **Achieved (as shipped):**
  - Workflow rules: lifecycle thresholds, schedules, inbound signed webhooks, HTTP outbound actions, React Flow designer UI.
  - Execution history, retries, admin dispatch; lifecycle reprocess automation hook.
  - HR Copilot chat with rule + optional HF NLI routing; conversation audit for admins.
  - Cost baselines CRUD and executive savings estimates from successful automation runs.
- **Gap:** Enterprise-wide RPA/desktop automation, natural-language authoring of rules, and multi-tenant workflow templates marketplace.
- **Target State:** Autonomous HR workflows with lower operating cost.
- **BRD:**
  - Reduce manual HR overhead with automation-first operations
- **SRS Functional:**
  - HR chatbot
  - Automated screening
  - Auto scheduling
  - Workflow automation engine
- **SRS Non-Functional:**
  - High availability
  - Low-latency response

---

## M8 - High-Skill Talent Retention

- **Status / Priority:** `in_progress` / `P2`
- **Current State:** Attrition risk scoring (linear + optional gradient boosting), explanations, and HRIS fields on employee records are implemented.
- **Achieved (as shipped):**
  - Feature pipeline (tenure, engagement, comp pressure, training gaps) with train/score APIs and cron-friendly score-run endpoint.
  - SHAP-style linear attributions; optional sklearn GBM with ensemble modes; latest scores persisted for UI/API.
  - Employee Master captures comp band, promotion history, high-performer/critical-role flags, market percentile for model input.
- **Gap:** Calibrated production labels loop, manager nudges in flow of work, and integration to compensation planning tools.
- **Target State:** Talent intelligence focused on critical talent retention.
- **BRD:**
  - Retain high-value workforce segments
- **SRS Functional:**
  - High performer detection
  - Attrition prediction
  - Career path recommendations
- **SRS Non-Functional:**
  - Target ML accuracy threshold
  - Secure insights access

---

## M9 - Analytics & Executive Dashboard

- **Status / Priority:** `in_progress` / `P0`
- **Current State:** Executive KPIs, M9 semantic layer, drill-down scope, and leadership export packs (CSV/PDF/ZIP) are available.
- **Achieved (as shipped):**
  - KPI catalog with ownership + formulas; merged definitions; KPI pack + freshness APIs; talent acquisition metrics slice.
  - Strategic drill by department, manager subtree, or role title; cached drill dashboard API; Executive KPI page UX.
  - Monthly leadership snapshots, full ZIP export, optional webhook delivery, cron snapshot route with shared-secret auth.
- **Gap:** Embedded analytics (Looker/PowerBI) and cross-tenant benchmarking datasets.
- **Target State:** Executive decision cockpit with real-time and predictive insight.
- **BRD:**
  - Data-driven strategic HR decisions
- **SRS Functional:**
  - KPI dashboards
  - Drill-down analytics
  - Predictive insight views
- **SRS Non-Functional:**
  - High performance dashboards
  - Real-time refresh

---

## M10 - Architecture & Scalability

- **Status / Priority:** `in_progress` / `P0`
- **Current State:** Monolith hosts modular packages; event outbox/consumer backbone and architecture blueprint docs exist.
- **Achieved (as shipped):**
  - Documented bounded-context/gateway migration blueprint and operator runbooks (DR, on-call, perf smoke).
  - Versioned event envelope, Mongo outbox producer, in-process consumer with idempotency + admin replay and stats API.
  - Lifecycle create and workflow run outcomes publish to M10 topics for downstream expansion.
- **Gap:** External message broker, dedicated consumer fleet, API gateway edge, and active-active multi-region data planes.
- **Target State:** Enterprise-grade, cloud-native, fault-tolerant architecture.
- **BRD:**
  - Scale platform reliably for enterprise workload
- **SRS Functional:**
  - Microservices
  - API gateway
  - Event-driven processing
- **SRS Non-Functional:**
  - Horizontal scalability
  - Fault tolerance
  - Cloud-native deployment

---

## Implementation-Ready BRD + SRS Addendum

This addendum provides execution-level detail so teams can implement features with fewer assumptions and fewer rework cycles.

### 1) Document Purpose and Scope

- **Purpose:** Define complete business and system requirements for the transformation roadmap (M1-M10).
- **In scope:** Product behavior, API contracts, RBAC, data flows, reporting, quality gates, deployment, observability, and acceptance criteria.
- **Out of scope:** Vendor procurement contracts, legal policy authoring, and non-product org change management activities.

### 2) Stakeholders and Personas

- **Executive Sponsor:** Reviews KPI outcomes, cost/ROI, risk posture.
- **HR Admin:** Owns employee lifecycle, approvals, compliance, and governance.
- **Recruiter:** Owns hiring workflows, candidate quality, and interview throughput.
- **People Manager:** Uses workforce/training/retention insights and executes interventions.
- **IT/SRE/Admin:** Owns integrations, reliability, security controls, and operational runbooks.

### 3) Product Goals and Success Metrics

- **Goal G1 (Hiring efficiency):** Reduce time-to-hire and improve quality of hire.
- **Goal G2 (Workforce readiness):** Improve demand-supply alignment for critical skills.
- **Goal G3 (Employee outcomes):** Improve engagement and reduce regrettable attrition.
- **Goal G4 (Operational excellence):** Reduce manual HR effort through automation.

Suggested KPI targets (initial):
- `time_to_hire_days` down 20%
- `duplicate_candidate_rate` down 60%
- `critical_skill_gap_count` down 25%
- `automation_runs_succeeded_30d` up 2x
- `estimated_manual_minutes_saved_30d` up 40%

### 4) End-to-End Process Overview

- **Hire:** Source -> dedup -> rank -> pipeline -> interview -> offer.
- **Employee lifecycle:** Onboard -> active changes -> approvals -> compliance docs -> audit.
- **Workforce planning:** Skill inventory + project demand -> forecast -> allocation simulation -> approval -> apply.
- **Development and engagement:** Recommendations -> assignments/certifications -> pulse signals -> action.
- **Retention and executive governance:** Score attrition risk -> interventions -> leadership dashboards/exports.

### 5) Functional Requirements (Cross-Module)

- **FR-PLT-001:** All side-effect APIs must enforce RBAC and return deterministic 403 messages for policy denial.
- **FR-PLT-002:** All list endpoints must support pagination and stable sorting.
- **FR-PLT-003:** Every state-changing workflow must generate an auditable record (`who`, `when`, `what`, `before/after` where applicable).
- **FR-PLT-004:** Admin operations must be callable via API for automation/cron.
- **FR-PLT-005:** UI must surface actionable error messages and not fail silently.
- **FR-PLT-006:** Export endpoints must support machine-readable formats (JSON/CSV) and executive-friendly format (PDF/ZIP where applicable).

### 6) Module-Wise Detailed Requirements

#### M1 Talent Acquisition

- **FR-M1-001:** Connectors shall support token lifecycle handling (refresh and expiry tracking).
- **FR-M1-002:** Ingestion shall support paging, throttling, retries, and source-level error reporting.
- **FR-M1-003:** Candidate canonicalization shall deduplicate by email/phone/resume hash/name fallback.
- **FR-M1-004:** Match scoring shall provide explainability factors for user trust.
- **FR-M1-005:** Interview proposal workflow shall support approve/reject with validation.

Acceptance criteria:
- Connector health endpoint returns per-source health and last checked timestamp.
- Duplicate merge action produces audit rows and preserves canonical references.
- Pipeline actions are reflected in UI without data corruption after refresh.

#### M2 Employee Lifecycle

- **FR-M2-001:** Employee status transitions shall be validated against a legal state machine.
- **FR-M2-002:** Approval-gated events shall require valid approver role and support escalation.
- **FR-M2-003:** Reject flows shall capture reason and final event processing status.
- **FR-M2-004:** Compliance documents shall support verify, reminder, breach scan, and export.

Acceptance criteria:
- Unauthorized approval attempts return 403 with consistent policy message.
- Approved/rejected events appear in audit log and event list with timestamps.
- Compliance reminder and SLA scans are idempotent for previously processed records.

#### M3 Workforce Intelligence

- **FR-M3-001:** ETL snapshot shall persist demand/supply feature rows only after DQ pass.
- **FR-M3-002:** Model training shall version artifacts and support active-version rollback.
- **FR-M3-003:** Forecast APIs shall return horizon-based demand projections and confidence context.
- **FR-M3-004:** Monitoring shall compute drift/accuracy and indicate retrain recommendation.

Acceptance criteria:
- Failed DQ run writes failed status and zero inserted rows.
- Switching active model changes forecast output source deterministically.

#### M4 Resource Optimization

- **FR-M4-001:** Solver shall enforce hard constraints and distinguish soft shortages.
- **FR-M4-002:** Scenario engine shall support simulate/save/compare.
- **FR-M4-003:** Scenario apply shall require prior approval and support dry-run.
- **FR-M4-004:** Notifications shall be sent on pending approvals/escalations.

Acceptance criteria:
- Explain steps include assignment and unfilled rationale.
- Apply endpoint updates allocation aggregates only when status is approved.

#### M5 Training and Skill Development

- **FR-M5-001:** Recommendation engine shall map skill gaps to path templates.
- **FR-M5-002:** Assignments shall persist path snapshot and progress lifecycle.
- **FR-M5-003:** LMS sync shall upsert courses and record sync run telemetry.
- **FR-M5-004:** Certification tracking shall support expiry reminder dispatch.

Acceptance criteria:
- Manager summary reflects direct-report assignments and expiring certifications.

#### M6 Engagement

- **FR-M6-001:** Survey templates and schedules shall support targeted departments.
- **FR-M6-002:** Dashboard shall provide sentiment/topics and trend confidence tier.
- **FR-M6-003:** Raw responses shall be restricted to privileged roles with privacy audit logs.
- **FR-M6-004:** Low-sample views shall enforce anonymity redaction rules.

Acceptance criteria:
- Raw response endpoint denies unauthorized roles with clear policy response.
- Privacy audit entries are created for privileged access attempts (success/failure as configured).

#### M7 Automation and Cost Optimization

- **FR-M7-001:** Workflow rules shall support manual, threshold, schedule, and inbound webhook triggers.
- **FR-M7-002:** Flow graph execution shall support ordered multi-step actions with retries.
- **FR-M7-003:** HR Copilot shall map intents to approved action paths with guardrails.
- **FR-M7-004:** Savings computation shall map successful runs to baseline cost/time metrics.

Acceptance criteria:
- Inbound webhook endpoint validates token/secret before execution.
- Run history captures status, detail, and retry behavior.

#### M8 Talent Retention

- **FR-M8-001:** Retention scoring shall support linear model and optional gradient-boost model mode.
- **FR-M8-002:** Scores shall include explainability contributions.
- **FR-M8-003:** Score-run shall support cron token mode and store latest score records.
- **FR-M8-004:** Employee profile must expose required HRIS fields for model features.

Acceptance criteria:
- Score-run endpoint processes eligible employees and persists outputs without duplication errors.

#### M9 Analytics and Executive Dashboard

- **FR-M9-001:** KPI catalog shall expose definitions, ownership, formulas, and freshness metadata.
- **FR-M9-002:** Strategic drill shall support department, manager subtree, and role-title filters.
- **FR-M9-003:** Leadership export packs shall support monthly snapshot + download in JSON/CSV/PDF/ZIP.
- **FR-M9-004:** Cron snapshot endpoint shall require secret token auth.

Acceptance criteria:
- Exported snapshot IDs resolve to downloadable artifacts with consistent schema.

#### M10 Architecture and Scalability

- **FR-M10-001:** Event envelope shall be versioned and include idempotency/correlation metadata.
- **FR-M10-002:** Outbox and consumer shall support replay and idempotent processing.
- **FR-M10-003:** Admin stats endpoint shall expose processing status and delivery attempts.
- **FR-M10-004:** Runbooks shall cover DR drill, failover, and on-call handoff.

Acceptance criteria:
- Replay endpoint can re-run selected events with predictable state transitions.

### 7) Non-Functional Requirements (System-Wide)

- **NFR-001 Availability:** API target >= 99.5% monthly uptime (initial baseline).
- **NFR-002 Latency:** P95 read endpoints < 500ms for common list views under nominal load.
- **NFR-003 Data Integrity:** Unique keys and idempotency keys must prevent duplicate side effects.
- **NFR-004 Security:** JWT-based auth, RBAC checks on all protected routes, secret-based auth for cron/webhooks.
- **NFR-005 Auditability:** Immutable or append-only audit where business/regulatory trace is required.
- **NFR-006 Scalability:** Horizontal API scaling without violating idempotency semantics.
- **NFR-007 Observability:** Structured logs, route metrics, health checks, and actionable runbooks.
- **NFR-008 Privacy:** PII access minimized by role; engagement anonymity thresholds enforced.

### 8) Data and Integration Requirements

- **Data stores:** MongoDB collections with startup/migration index creation.
- **External integrations:** Job boards, calendar webhook bridge, optional LMS provider, optional webhook targets.
- **Secrets:** Managed via environment variables; no secrets in source control.
- **Backward compatibility:** API contract changes must be additive where possible.

### 9) Security and Compliance Controls

- RBAC matrix must be documented and validated in tests for all write flows.
- Webhook endpoints must validate signatures/tokens and reject private targets unless explicitly allowed.
- Compliance document workflows must maintain verification SLA and reminder evidence.
- Privacy-sensitive endpoints require elevated roles and access auditing.

### 10) Validation and Test Strategy

- **Unit tests:** Rule engines, validators, state machines, score functions.
- **Integration tests:** API flows for approvals, exports, automation dispatch, retention scoring.
- **Regression suite:** Core routes (`/employees`, `/pipeline`, `/employee-lifecycle`, `/executive/*`) on each release.
- **UAT checklist:** Persona-based happy path + denial path for each module.

### 11) Release and Rollout Plan

- **Phase 1:** Stabilize existing modules with policy and data correctness hardening.
- **Phase 2:** Scale integrations and forecasting/optimization quality.
- **Phase 3:** Enterpriseization (gateway, dedicated consumers, SLO hardening, multi-region posture).

Deployment gates:
- Zero critical security findings.
- Required migrations applied successfully.
- Smoke tests green (API health, auth, core journeys).
- Rollback path verified (model/version and deployment rollback).

### 12) Open Decisions and Assumptions

- Which modules require strict tenant isolation in current deployment?
- Preferred production integration priority among new job boards/LMS providers.
- Final SLO/SLA thresholds by environment tier (dev/qa/prod).
- Benchmark dataset source for retention and executive analytics external comparisons.

### 13) Traceability Matrix (High-Level)

- **Business goal -> Module:** G1->M1/M9, G2->M3/M4/M5, G3->M2/M6/M8, G4->M7/M10.
- **Module -> API/UI artifacts:** Defined in implementation status docs (`docs/engineering/M*_IMPLEMENTATION_STATUS.md`).
- **API -> tests:** Maintain one or more test cases per critical endpoint and policy branch.

### 14) Jira-Ready Backlog (Epics -> Stories)

Use these as copy-ready backlog seeds. Replace keys (`TRN-*`) with your Jira project key.

#### EPIC TRN-EPIC-01: Platform Governance and Reliability

- **TRN-101 | RBAC hardening across write endpoints**  
  **Refs:** FR-PLT-001, NFR-004  
  **Acceptance criteria:**  
  - 403 policy responses are consistent for all protected side-effect routes.  
  - Role matrix is documented and validated by integration tests.

- **TRN-102 | Pagination and sorting standardization**  
  **Refs:** FR-PLT-002  
  **Acceptance criteria:**  
  - List APIs expose page/page_size/sort_by/sort_dir consistently.  
  - Default sort is deterministic and documented.

- **TRN-103 | Audit envelope standard**  
  **Refs:** FR-PLT-003, NFR-005  
  **Acceptance criteria:**  
  - All state-changing operations produce audit entries with actor + timestamp.  
  - Lifecycle, compliance, and automation have traceable before/after context where applicable.

- **TRN-104 | Observability baseline and runbook signoff**  
  **Refs:** NFR-007  
  **Acceptance criteria:**  
  - Health, error-rate, and route metrics visible in ops dashboard.  
  - On-call and incident runbooks reviewed and approved.

#### EPIC TRN-EPIC-02: M1 Talent Acquisition Scale-Out

- **TRN-201 | Add additional job-board connector set (Indeed/Glassdoor priority)**  
  **Refs:** M1 gap, FR-M1-001, FR-M1-002  
  **Acceptance criteria:**  
  - New connector supports token lifecycle (if OAuth), paging, retries, and health endpoint.

- **TRN-202 | Connector SLA and tenant throttling controls**  
  **Refs:** M1 gap, NFR-001, NFR-002  
  **Acceptance criteria:**  
  - Per-source throttling policy configurable via admin settings.  
  - SLA dashboards track success rate and latency by source.

- **TRN-203 | Interview calendar provider packs**  
  **Refs:** FR-M1-005  
  **Acceptance criteria:**  
  - At least one native provider integration beyond webhook bridge.  
  - Failures surface actionable sync status in API + UI.

#### EPIC TRN-EPIC-03: M2 Lifecycle and Compliance Deepening

- **TRN-301 | HRIS payroll/benefits sync integration**  
  **Refs:** M2 gap, FR-M2-001  
  **Acceptance criteria:**  
  - Delta sync updates employee records idempotently with audit entries.  
  - Sync errors are retriable and observable.

- **TRN-302 | Bulk compliance document workflows**  
  **Refs:** FR-M2-004  
  **Acceptance criteria:**  
  - Bulk upload + verify actions supported with per-row result reporting.  
  - SLA and reminder logic apply identically to bulk records.

- **TRN-303 | Employee self-service lifecycle actions (mobile-first UX)**  
  **Refs:** M2 gap  
  **Acceptance criteria:**  
  - Employees can submit eligible requests with status tracking.  
  - Approval chain and audit log remain consistent with admin flows.

#### EPIC TRN-EPIC-04: M3 and M4 Intelligence Maturity

- **TRN-401 | Advanced forecasting models (beyond OLS baseline)**  
  **Refs:** FR-M3-002, FR-M3-003  
  **Acceptance criteria:**  
  - New model class versioned in registry with activation/rollback.  
  - Accuracy report compares baseline vs candidate model.

- **TRN-402 | Scheduled ETL and monitoring automation**  
  **Refs:** FR-M3-001, FR-M3-004  
  **Acceptance criteria:**  
  - Snapshot and drift evaluation run automatically per schedule.  
  - Retrain recommendation triggers an actionable alert.

- **TRN-403 | Optimization engine upgrade (MILP/CP-SAT option)**  
  **Refs:** FR-M4-001  
  **Acceptance criteria:**  
  - Config flag selects solver engine without breaking current API contracts.  
  - Explainability remains available for allocation decisions.

- **TRN-404 | Real-time utilization feed ingestion**  
  **Refs:** FR-M4-004  
  **Acceptance criteria:**  
  - Allocation dashboards update from external timesheet/resource feeds within agreed latency.

#### EPIC TRN-EPIC-05: M5 and M6 People Development and Engagement

- **TRN-501 | Enterprise LMS integration (SCORM/xAPI)**  
  **Refs:** FR-M5-003, M5 gap  
  **Acceptance criteria:**  
  - Provider adapter supports real course sync and learner progress updates.  
  - Sync runs log retries, failures, and reconciliation counts.

- **TRN-502 | Learning budget and approval workflow**  
  **Refs:** M5 gap  
  **Acceptance criteria:**  
  - Budget policies enforce per-employee/per-department limits.  
  - Exceptions require approval with auditable rationale.

- **TRN-503 | Multichannel engagement ingestion (Slack/Teams)**  
  **Refs:** FR-M6-002, M6 gap  
  **Acceptance criteria:**  
  - Consent-aware connectors ingest and normalize signals.  
  - Dashboard clearly labels source and confidence.

- **TRN-504 | Multilingual sentiment support**  
  **Refs:** M6 gap, NFR-008  
  **Acceptance criteria:**  
  - Supported-language matrix documented; unsupported-language fallback defined.

#### EPIC TRN-EPIC-06: M7, M8, M9 Business Outcome Expansion

- **TRN-601 | Natural-language workflow authoring assistant**  
  **Refs:** FR-M7-001, FR-M7-002  
  **Acceptance criteria:**  
  - Prompted rule drafts produce valid trigger/action JSON with guardrails.  
  - Human review required before activation.

- **TRN-602 | Retention model labeling feedback loop**  
  **Refs:** FR-M8-001, M8 gap  
  **Acceptance criteria:**  
  - Outcome labels are captured and version-linked to model runs.  
  - Retrain pipeline uses approved label windows only.

- **TRN-603 | Manager intervention workflows from risk insights**  
  **Refs:** FR-M8-003  
  **Acceptance criteria:**  
  - High-risk cohorts generate playbook tasks with completion tracking.

- **TRN-604 | Embedded BI and benchmark datasets**  
  **Refs:** FR-M9-001, FR-M9-002, M9 gap  
  **Acceptance criteria:**  
  - Executive dashboard supports embeddable views with access controls.  
  - Benchmark provenance and refresh cadence documented.

#### EPIC TRN-EPIC-07: M10 Enterprise Architecture Rollout

- **TRN-701 | External event broker introduction**  
  **Refs:** FR-M10-001, FR-M10-002  
  **Acceptance criteria:**  
  - Producer/consumer paths support broker-backed mode with idempotency preserved.  
  - Replay and dead-letter handling are operationally documented.

- **TRN-702 | Dedicated consumer deployment model**  
  **Refs:** FR-M10-003, NFR-006  
  **Acceptance criteria:**  
  - API and consumer roles can scale independently.  
  - Processing lag and retry depth observable.

- **TRN-703 | API gateway and edge policy layer**  
  **Refs:** FR-M10-004, NFR-004  
  **Acceptance criteria:**  
  - Centralized authn/authz, rate limits, and route governance enforced at gateway.

- **TRN-704 | Multi-region resilience plan execution**  
  **Refs:** NFR-001, NFR-006  
  **Acceptance criteria:**  
  - DR drill demonstrates RTO/RPO targets with signed runbook evidence.

### 15) Priority and Sequencing Recommendation

- **Wave 1 (0-6 weeks):** TRN-101/102/103/104, TRN-202, TRN-402, TRN-701 foundations.
- **Wave 2 (6-12 weeks):** TRN-201/203, TRN-301/302, TRN-401/403, TRN-501/503, TRN-602.
- **Wave 3 (12+ weeks):** TRN-303, TRN-504, TRN-601/603/604, TRN-702/703/704.

### 16) Definition of Done (DoD) for Each Story

- Code merged with tests covering happy path + denial/error path.
- API/UI documentation updated (including RBAC and env vars).
- Monitoring/alerts updated for new background jobs/integrations.
- Security checklist passed (secrets, auth, input validation, auditability).
- Deployment and rollback steps validated in QA.
