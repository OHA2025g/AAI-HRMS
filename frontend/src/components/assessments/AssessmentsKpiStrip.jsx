import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import KpiTile from '../hiring-dashboard/KpiTile';
import { KpiStripSkeleton } from './AssessmentsWorkspaceSkeleton';
import { Button } from '../ui/button';
import {
  ClipboardCheck,
  Briefcase,
  Users,
  CheckCircle2,
  Percent,
  Target,
  AlertTriangle,
  Activity,
} from 'lucide-react';

const PRIMARY_METRICS = [
  {
    key: 'total_assessments',
    label: 'Total assessments',
    icon: ClipboardCheck,
    iconClassName: 'bg-indigo-100 text-indigo-600',
    getValue: (h) => h.total_assessments?.value ?? 0,
    getDelta: (h) => h.total_assessments?.delta_pct,
  },
  {
    key: 'candidates_in_assessment_sent',
    label: 'In assessment',
    icon: Users,
    iconClassName: 'bg-blue-100 text-blue-600',
    getValue: (h) => h.candidates_in_assessment_sent?.value ?? 0,
    getDelta: (h) => h.candidates_in_assessment_sent?.delta_pct,
  },
  {
    key: 'candidates_assessment_cleared',
    label: 'Cleared',
    icon: CheckCircle2,
    iconClassName: 'bg-emerald-100 text-emerald-600',
    getValue: (h) => h.candidates_assessment_cleared?.value ?? 0,
    getDelta: (h) => h.candidates_assessment_cleared?.delta_pct,
  },
  {
    key: 'clearance_rate_pct',
    label: 'Clearance rate',
    icon: Percent,
    iconClassName: 'bg-violet-100 text-violet-600',
    getValue: (h) => (h.clearance_rate_pct != null ? `${h.clearance_rate_pct}%` : '—'),
    getDelta: (h) => h.clearance_rate_delta_pct,
  },
  {
    key: 'completion_rate_pct',
    label: 'Completion rate',
    icon: Target,
    iconClassName: 'bg-amber-100 text-amber-600',
    getValue: (h) => (h.completion_rate_pct != null ? `${h.completion_rate_pct}%` : '—'),
    getDelta: (h) => h.completion_rate_delta_pct,
  },
  {
    key: 'jobs_missing_assessment',
    label: 'Jobs missing test',
    icon: AlertTriangle,
    iconClassName: 'bg-red-100 text-red-600',
    getValue: (h) => h.jobs_missing_assessment?.value ?? 0,
    getDelta: (h) => h.jobs_missing_assessment?.delta_pct,
  },
];

const SECONDARY_METRICS = [
  {
    key: 'assessments_on_open_jobs',
    label: 'On open jobs',
    icon: Briefcase,
    iconClassName: 'bg-slate-100 text-slate-600',
    getValue: (h) => h.assessments_on_open_jobs?.value ?? 0,
    getDelta: (h) => h.assessments_on_open_jobs?.delta_pct,
  },
  {
    key: 'pass_rate_pct',
    label: 'Pass rate',
    icon: Percent,
    iconClassName: 'bg-teal-100 text-teal-600',
    getValue: (h) => (h.pass_rate_pct != null ? `${h.pass_rate_pct}%` : '—'),
    getDelta: (h) => h.pass_rate_delta_pct,
  },
  {
    key: 'median_time_to_complete_minutes',
    label: 'Median time',
    icon: Target,
    iconClassName: 'bg-cyan-100 text-cyan-600',
    getValue: (h) =>
      h.median_time_to_complete_minutes != null ? `${h.median_time_to_complete_minutes}m` : '—',
    getDelta: (h) => h.median_time_delta_pct,
  },
  {
    key: 'active_submissions',
    label: 'Active submissions',
    icon: Activity,
    iconClassName: 'bg-orange-100 text-orange-600',
    getValue: (h) => h.active_submissions?.value ?? h.active_submissions ?? 0,
    getDelta: (h) => h.active_submissions?.delta_pct,
  },
];

function MetricGrid({ metrics, headline }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      {metrics.map((m) => (
        <KpiTile
          key={m.key}
          compact
          label={m.label}
          value={m.getValue(headline)}
          deltaPct={m.getDelta(headline)}
          icon={m.icon}
          iconClassName={m.iconClassName}
        />
      ))}
    </div>
  );
}

export default function AssessmentsKpiStrip({ headline, refetching = false }) {
  const [showMore, setShowMore] = useState(false);

  if (refetching) return <KpiStripSkeleton count={6} />;
  if (!headline) return null;

  return (
    <div className="space-y-3" data-testid="assessments-kpi-strip">
      <MetricGrid metrics={PRIMARY_METRICS} headline={headline} />
      {showMore ? <MetricGrid metrics={SECONDARY_METRICS} headline={headline} /> : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-slate-600 h-8"
        onClick={() => setShowMore((v) => !v)}
        aria-expanded={showMore}
        data-testid="assessments-kpi-show-more"
      >
        {showMore ? (
          <>
            <ChevronUp className="w-4 h-4 mr-1" aria-hidden />
            Show fewer metrics
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4 mr-1" aria-hidden />
            Show 4 more metrics
          </>
        )}
      </Button>
    </div>
  );
}
