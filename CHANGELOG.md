# Changelog

## [Unreleased]

### Smart Hiring Dashboard (Phase 6 polish)

- **ChartCard** shared wrapper for hiring-dashboard charts (`TrendsChart`, `PipelineFunnelChart`, `SourceMixChart`).
- **Storybook** stories for `ChartCard`, `KpiTile`, `PeriodToggle` (see `frontend/STORYBOOK.md`).
- **TA review / presentation mode** on `/dashboard` (toggle hides filters, enlarges health score).
- **Health strip** shows top 3 alerts inline with drill links.
- **Bundled trends** — `GET /dashboard/hiring-pack?include_trends=true` embeds `trends` object (single round-trip).
- **Event-driven cache invalidation** on application create/stage change and Find Matches.
- **Slow-query logging** when hiring-pack aggregation exceeds `HIRING_PACK_SLOW_QUERY_SEC` (default 1s).
- **`hiring_analytics_events`** collection + Find Matches event logging (migration `0017`).
- **Migration rollback** — `down()` implemented for hiring dashboard indexes (`0015`, `0016`).
- **Mobile layout** — single-column KPI grid on small viewports; Playwright mobile viewport project.
- **v1 deprecation** — legacy `/dashboard/stats` UI sunset target documented below.

#### Legacy dashboard v1 deprecation timeline

| Milestone | Target | Action |
|-----------|--------|--------|
| v2 GA (default) | **May 2026** | `REACT_APP_HIRING_DASHBOARD_V2` defaults to on; legacy page at `/dashboard/legacy` |
| Deprecation notice | **Jul 2026** | Banner on legacy dashboard; remove from primary nav |
| v1 API/UI removal | **Sep 2026** | Remove `LegacyHiringDashboardPage`; keep `GET /dashboard/stats` read-only for integrations until Q4 review |

### Navigation & IA (Phases 1–10)

- Added canonical navigation map: `docs/navigation-canonical-map.md`.
- **Resource & staffing hub** at `/resource-staffing-hub` with links to RO, WFI demand-supply, project demands, and allocation dashboard; sidebar entry under Resource & demand planning.
- **WFI** nav labels clarified (engagement signals, cost levers, experience planning; compensation visibility; cost risk wording) to reduce clash with ESE and COA.
- **WFI** workspace: callouts on cost-related drill-downs linking to **Cost Optimization & Automation** where appropriate.
- **ESE** workspace: “Open in WFI” banners for mirrored predictive segments; ELM link for grievance visibility; executive row links to WFI executive view.
- **Legacy pulse** (`/employee-engagement/legacy`): banner steering users to ESE.
- **`/employee-retention`** now redirects to **High-Skill Talent Retention** dashboard.
- **Layout** header: **AI assistants** dropdown (global HR Copilot + module copilots).
- **Executive KPIs** and main **Dashboard**: related cross-links to other executive/workforce surfaces.
- Rollout checklist: `docs/navigation-rollout.md`.
