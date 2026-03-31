# M7 Cost Optimization & Automation — implementation status

## M7-1 Workflow automation engine
- **Trigger–rule–action model:** Mongo `workflow_automation_rules` — `trigger_type` (`MANUAL`, `ON_LIFECYCLE_PENDING_THRESHOLD`, **`ON_SCHEDULE`**, **`WEBHOOK_INBOUND`**), `trigger_config` (e.g. `min_pending`), `action_type` (`REPROCESS_LIFECYCLE`, `NOTIFY_HR`, `NOOP`, **`HTTP_WEBHOOK`**), `action_config`, `max_retries`, `retry_backoff_sec`, optional **`flow_graph`** (React Flow JSON: `nodes` + `edges`). Schedule fields: `schedule_interval_minutes`, `schedule_next_run_at`. Inbound: `inbound_webhook_secret_hash` (never returned in list/update); create response may include `inbound_webhook_path` + auth hint.
- **Multi-step + webhooks:** `m7_automation/workflow_flow.py` (`topological_action_order`, `execute_flow_graph`) runs action nodes in edge order; each step uses `_m7_execute_single_action`. Outbound hooks: `m7_automation/workflow_webhook.py` (`validate_webhook_url`, `execute_http_webhook`, template vars `{rule_id}`, `{rule_name}`, `{timestamp}`, `{trigger_type}`, `{step_index}`). Env: **`WORKFLOW_WEBHOOK_ALLOW_PRIVATE_IPS`** (default blocks loopback/private URLs; see `backend/.env.example`).
- **Triggers:** `m7_automation/workflow_triggers.py` — `should_execute_trigger` supports manual, lifecycle threshold, schedule (due when `schedule_next_run_at` ≤ now), inbound (no auto-dispatch; rule runs only via signed `POST /api/webhooks/workflow/inbound/{rule_id}`).
- **Execution + retries:** `run_with_retries` (`m7_automation/retry.py`) wraps `_m7_execute_rule_action` in `server.py`. After a successful **`ON_SCHEDULE`** run, `_m7_bump_schedule_after_success` advances `schedule_next_run_at`. Each run logged in `workflow_automation_runs` with `status`, `detail`, `savings_workflow_key` (for M7-3; flow graphs use first non-`NOOP` action node key when present).
- **APIs (admin):** `GET/POST /api/admin/workflow-automation/rules`, `PUT/DELETE /api/admin/workflow-automation/rules/{id}`, `POST /api/admin/workflow-automation/rules/{id}/execute`, `GET /api/admin/workflow-automation/runs`, `POST /api/admin/workflow-automation/dispatch-triggered` (threshold + schedule due rules; not manual-only / not pure inbound-only auto-fire).
- **Inbound webhook (no JWT):** `POST /api/webhooks/workflow/inbound/{rule_id}` — `X-Workflow-Token` or `?token=` must match the rule secret (bcrypt).
- **Admin UI:** `frontend/src/pages/AdminWorkflowAutomationPage.jsx` (`/admin/workflow-automation`) — create rule supports new triggers/actions; per-rule link to **`frontend/src/pages/WorkflowDesignerPage.jsx`** (`/admin/workflow-automation/designer?ruleId=…`) for **React Flow** (`@xyflow/react`) visual editing of `flow_graph`.

## M7-2 HR copilot / chatbot operations
- **Intent → action:** `POST /api/hr-copilot/chat` — **keyword rules first** (`m7_automation/copilot_intent.py`); if intent is `unknown`, optional **Hugging Face zero-shot NLI** via Inference API (`m7_automation/copilot_hf.py`) maps natural language into the same intent keys.
- **HF env:** `HUGGINGFACE_API_TOKEN` or `HF_TOKEN`; optional `HR_COPILOT_HF_MODEL` (default `typeform/distilbert-base-uncased-mnli`), `HR_COPILOT_HF_MIN_SCORE` (default `0.35`), `HR_COPILOT_HF_ENABLED` (`1`/`0`). No token → HF skipped; behavior matches pre-HF rules-only fallback.
- **Guardrails:** Requires `kpi_read` to chat; side effects gated by `_user_has_phase1_permission` / admin for rules list; reprocess requires `employees_write`; employee lookup requires `employees_read`.
- **Conversation audit:** Mongo `hr_copilot_conversation_audit` includes `intent_resolution` (rule vs HF metadata); `GET /api/admin/hr-copilot/audit` (admin). Engine tag: `COPILOT_ENGINE_VERSION`.
- **API response:** `intent_source`, `rule_intent`, optional `hf_model` / `hf_score`.
- **UI:** `frontend/src/pages/HrCopilotPage.jsx` (route `/hr-copilot`).

## M7-3 Cost / time savings analytics
- **Manual-step baselines:** Mongo `manual_workflow_baselines` — unique `workflow_key` (e.g. `REPROCESS_LIFECYCLE`), `minutes_per_run`, `hourly_fully_loaded_cost_usd`. Admin CRUD: `/api/admin/cost-optimization/baselines`.
- **Savings KPIs:** `GET /api/executive/cost-optimization-summary?window_days=30` (`kpi_read`); `m7_automation/savings.py` aggregates successful runs × baseline.
- **Executive cards:** `StrategicExecutiveDashboardResponse` includes `automation_runs_succeeded_30d`, `automation_runs_failed_30d`, `cost_optimization_baselines_count`, `estimated_manual_minutes_saved_30d`, `estimated_cost_saved_usd_30d`. **Executive KPI** page shows M7 strip.

## Data / ops
- **Indexes:** API startup + migration `backend/migrations/0006_m7_automation_indexes.py`.
- **12-week seed rules:** migration `backend/migrations/0010_m7_seed_lifecycle_automation_rules.py` — three idempotent `seed_key` rules (threshold notify, threshold reprocess, daily NOOP schedule). Tune/disable in non-QA environments as needed.
- **Tests:** `backend/tests/test_m7_automation.py`.

## Related legacy endpoints
- `GET /api/automation/status` — extended with `workflow_rules_enabled`, `workflow_runs_succeeded_24h`.
- `POST /api/automation/reprocess-lifecycle` — unchanged; shares `_lifecycle_event_ids_for_reprocess` with workflow actions.
