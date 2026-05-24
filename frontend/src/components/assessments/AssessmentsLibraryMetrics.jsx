import React from 'react';
import { FileQuestion, Clock, Target } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

export function LibraryMetricsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" data-testid="assessments-library-metrics-skeleton">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-4 py-3"
        >
          <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, iconClassName }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-4 py-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconClassName}`}>
        <Icon className="w-4 h-4" aria-hidden />
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-lg font-semibold text-slate-900">{value ?? '—'}</p>
      </div>
    </div>
  );
}

/** Secondary library-average metrics from analytics headline. */
export default function AssessmentsLibraryMetrics({ headline, refetching = false }) {
  if (refetching) return <LibraryMetricsSkeleton />;
  if (!headline) return null;

  const questions =
    headline.avg_questions_per_assessment != null
      ? Math.round(headline.avg_questions_per_assessment * 10) / 10
      : null;
  const duration =
    headline.avg_duration_minutes != null ? `${Math.round(headline.avg_duration_minutes)} min` : null;
  const threshold =
    headline.pass_threshold_pct != null ? `${Math.round(headline.pass_threshold_pct)}%` : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" data-testid="assessments-library-metrics">
      <MetricCard
        icon={FileQuestion}
        label="Avg questions / assessment"
        value={questions}
        iconClassName="bg-indigo-100 text-indigo-600"
      />
      <MetricCard
        icon={Clock}
        label="Avg duration"
        value={duration}
        iconClassName="bg-amber-100 text-amber-600"
      />
      <MetricCard
        icon={Target}
        label="Typical pass threshold"
        value={threshold}
        iconClassName="bg-emerald-100 text-emerald-600"
      />
    </div>
  );
}
