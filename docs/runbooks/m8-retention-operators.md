# M8 retention — operator checklist

## 1. Dependencies

```bash
cd backend && pip install -r requirements.txt
```

Includes **scikit-learn** for optional `HistGradientBoosting` training (`use_gradient_boosting: true` on `POST /api/workforce/retention/v1/train`). Linear scoring works without sklearn imports at runtime for the default path.

## 2. Environment (API)

| Variable | Purpose |
|----------|---------|
| `M8_SCORE_RUN_TOKEN` | Shared secret for `POST /api/workforce/retention/v1/score-run-cron` header `X-M8-Score-Token`. |

Set in deployment env (see `backend/.env.example`).

## 3. Scheduled score batch

**GitHub Actions:** `.github/workflows/m8-retention-score-run.yml`  
Secrets: `M8_SCORE_RUN_URL`, `M8_SCORE_RUN_TOKEN`.

**Manual / cron on a host:**

```bash
export M8_SCORE_RUN_TOKEN='...'
export M8_SCORE_RUN_URL='https://<host>/api/workforce/retention/v1/score-run-cron'
./backend/scripts/m8_score_run_cron.sh
```

## 4. After model changes

When you **train**, **PATCH** `/api/workforce/retention/v1/model` (ensemble / interaction flags), or change employee HRIS fields used in features:

1. Run **`POST /api/workforce/retention/v1/score-run`** (JWT with `kpi_read`) from the UI (**Run attrition score batch**) or API.  
2. Or wait for the next cron invocation.

Scores store `shap_linear`, `top_factors`, and optional `gb_explanation_top` at compute time.

## 5. Admin UI (app)

- **Employee Master**: Retention / HRIS (M8) fields on create/edit + CSV template columns.
- **Retention** page (admin): **Attrition model v1** tab — ensemble mode + interaction toggle; table shows **SHAP (vs ref)** when present.

## 6. HR validation (story)

Workshop / threshold sign-off — not automated; track in your PM tool.
