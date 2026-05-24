# Storybook — Smart Hiring Dashboard

Run from `frontend/`:

```bash
npm ci
npm run storybook
```

## Stories

| File | Components |
|------|------------|
| `ChartCard.stories.jsx` | ChartCard |
| `KpiTile.stories.jsx` | KpiTile, HealthStrip |
| `PeriodToggle.stories.jsx` | PeriodToggle |
| `HiringCharts.stories.jsx` | PipelineFunnel, SourceMix, Trends, FitHistogram, ReqAging, QualityBySource, MiniKpi, StageAgingHeatmap, TopJobsTable, AlertsPanel |

Build a static Storybook bundle:

```bash
npm run build-storybook
```
