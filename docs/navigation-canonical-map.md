# Navigation canonical map

This document defines **which module owns each domain**, where secondary surfaces live, and how duplicate or legacy routes behave (redirect, deep link, or read-only mirror).

| Domain | Owner module | Route prefix | Secondary surfaces | Action |
|--------|----------------|--------------|-------------------|--------|
| Employee voice, pulse, sentiment, programs | **ESE** (M17) | `/employee-satisfaction-engagement/*` | ESE workspace rows mirrored from WFI for intelligence | WFI-linked rows: banner **Open in WFI** |
| Predictive workforce analytics (attrition, burnout, forecasting, AI recs) | **WFI** (M15) | `/workforce-intelligence/*` | ESE sections that pull WFI snapshots | **Canonical** analytics in WFI |
| Legacy pulse / engagement API UI | **Legacy** | `/employee-engagement/legacy` | ESE dashboard | Banner → migrate to ESE; `/employee-engagement` **redirects** to ESE |
| High-skill / strategic retention | **HSR** (M13) | `/high-skill-talent-retention/*` | WFI “Retention & Stability” → legacy link | `/employee-retention` **redirects** to HSR dashboard |
| Resource optimization (metrics) | **RO** | `/resource-optimization/*` | Hub `/resource-staffing-hub` | Hub cards link RO, WFI demand-supply, demands, allocation |
| Project demands / allocations | **Project / Allocation** | `/project-demands`, `/project-allocations`, `/resource-project-optimization/*` | Hub | Hub **links** only |
| Spend control, automation ROI, cost scenarios | **COA** (M16) | `/cost-optimization-automation/*` | WFI cost-compensation / cost-optimization / cost-risk-budget | WFI pages show **Related: COA** callout |
| Executive KPIs (M9) | **M9** | `/executive-kpis` | WFI/ESE/COA executive views | **Related views** cross-links on exec dashboard |
| Global HR assistant | **Hr Copilot** | `/hr-copilot` | Module copilots | Header **AI assistants** menu lists all |
| Formal grievance cases (source of truth) | **ELM** (M14) | `/employee-lifecycle-management/employee-relations` | ESE grievance visibility | ESE **Manage in ELM** link |

## Duplicate route pairs

| Old / secondary | Canonical |
|-----------------|-----------|
| `/employee-engagement` | `/employee-satisfaction-engagement/dashboard` |
| `/employee-retention` | `/high-skill-talent-retention/dashboard` |
| `/employee-engagement/legacy` | Keep for legacy pulse; prefer ESE for new work |

## Copilots

| Entry | Purpose |
|-------|---------|
| `/hr-copilot` | Cross-module HR assistant |
| `/workforce-intelligence/ai-copilot` | Workforce NLQ / WFI context |
| `/cost-optimization-automation/ai-copilot` | Cost & automation context |
| `/employee-satisfaction-engagement/copilot` | Engagement & experience context |

Use optional query `?context=` when deep-linking from another module for future analytics only; routes do not require it.
