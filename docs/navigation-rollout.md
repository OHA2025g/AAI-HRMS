# Navigation clash resolution — rollout checklist

Use this list after deploying changes documented in `docs/navigation-canonical-map.md`.

## Smoke tests (manual)

1. **ESE redirect:** Visit `/employee-engagement` → lands on `/employee-satisfaction-engagement/dashboard`.
2. **Legacy pulse:** Visit `/employee-engagement/legacy` → legacy UI loads; banner links to ESE dashboard.
3. **Retention:** Visit `/employee-retention` → redirects to `/high-skill-talent-retention/dashboard`.
4. **Resource hub:** Visit `/resource-staffing-hub` → four cards link to RO, WFI demand-supply, project demands, allocation dashboard.
5. **WFI cost callout:** Open `/workforce-intelligence/cost-compensation` (and `cost-optimization`, `cost-risk-budget`) → COA callout appears with working link.
6. **ESE ↔ WFI:** Open ESE workspace routes that mirror WFI (`burnout-risk`, `attrition-linked-risk`, etc.) → “Open in Workforce Intelligence” works.
7. **ESE grievances:** Open `/employee-satisfaction-engagement/grievance-concerns` → ELM employee relations link works.
8. **AI assistants menu:** Header **AI assistants** opens dropdown; each item navigates to the correct copilot route.
9. **Executive cross-links:** `/executive-kpis` shows “Related executive views”; main `/dashboard` shows “Related executive & workforce views”.

## Regression

- Sidebar: **Resource & staffing hub** appears under **Resource & demand planning**.
- No duplicate `Button` imports in `EmployeeEngagementPage.jsx`.
