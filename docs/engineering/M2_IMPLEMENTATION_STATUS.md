# M2 Employee Lifecycle Management — implementation status

## M2-1 Employee master & lifecycle state machine
- **Entity model & transitions:** `m2_employee_lifecycle/state_machine.py` — `STATUS_TRANSITION_GRAPH` for direct `employees.status` edits; `validate_lifecycle_event_for_status()` for event eligibility vs current status.
- **Illegal transition validation:** Enforced on `PUT /employees/{id}` when `status` changes; enforced again in `process_employee_lifecycle_event` before applying status-changing events.
- **Audit log:** Collection `employee_lifecycle_audit_logs` via `_append_lifecycle_audit()`; `GET /api/employee-lifecycle/audit-log` (paged, optional `employee_code`).

## M2-2 Org hierarchy & approvals
- **Reporting APIs:** `GET /employees/{id}/direct-reports`, `GET /employees/{id}/management-chain`, `GET /org/hierarchy` (optional `root_id`, `max_depth`).
- **Approval matrix:** `EXITED` → approvers `admin`, `hr_admin` (48h escalation); `ROLE_CHANGED` → `admin`, `hr_admin`, `recruiter` (24h). Events create with `requires_approval` / `approval_status` when applicable; processing deferred until `POST /employee-lifecycle/events/{id}/approve`.
- **Reject:** `POST /employee-lifecycle/events/{id}/reject` with optional `reason`; sets `processing_status` to `REJECTED`.
- **Escalation:** `POST /admin/employee-lifecycle/escalate-approvals` — flags stale pending approvals (`escalated_at`) and notifies `admin`/`hr_admin` users.

## M2-3 Document workflow & compliance
- **Upload / verify / expiry:** `POST /compliance/documents` (metadata + optional `content_base64` size-capped), `GET /compliance/documents`, `POST /compliance/documents/{id}/verify`. SLA due date via `default_sla_due()` (`COMPLIANCE_VERIFY_SLA_DAYS`, default 14).
- **Reminders & SLA breaches:** `POST /admin/compliance/scan-sla-breaches` marks `SLA_BREACH`; `POST /admin/compliance/dispatch-document-reminders` notifies uploader for pending verify + 30-day expiry window (`expiry_reminder_sent_at`).
- **Export:** `GET /compliance/report/export?export_format=csv` (CSV download).

## Frontend / client
- `api.js`: `employeeApi` (get, directReports, managementChain, orgHierarchy), `employeeLifecycleApi` (approve, reject, auditLog), `complianceApi`, admin compliance/escalation helpers.
- `EmployeeLifecyclePage.jsx`: approval badges/actions for pending approval events (recruiter may approve `ROLE_CHANGED` only; backend enforces full matrix).

## Tests
- `tests/test_m2_lifecycle.py` — state machine & approval rule coverage (included in CI quality gates).

## Demo data (50 employees)
- `scripts/seed_employees_lifecycle_demo.py` — seeds `LCD50-*` employees with full field coverage, lifecycle events, compliance docs, audit rows, plus cross-module demo data (M5 training/cert/LMS, M6 pulse, M4 project skills, M8 scores, `workforce_skills`). `LCD50_SKIP_CROSS=1` omits the extras. See README **§5b**.
