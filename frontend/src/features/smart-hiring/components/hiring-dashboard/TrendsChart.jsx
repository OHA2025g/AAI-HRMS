import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts';
import { Badge } from '@/shared/ui/badge';
import ChartCard from './ChartCard';
import ChartAccessibleTable from './ChartAccessibleTable';
import { chartTitleCase } from '@/shared/lib/chartTitleCase';

const TRENDS_SOURCE_LABELS = {
  snapshots: 'Daily snapshots',
  seeded: 'Backfilled weekly estimates',
  mixed: 'Daily snapshots + backfill',
  synthetic: 'Live weekly estimate',
};

const TRENDS_SOURCE_HINTS = {
  seeded: 'Daily cron will replace backfill with live snapshots over time.',
  mixed: 'Some points are backfilled; live daily snapshots are accumulating.',
  synthetic: 'Enable HIRING_SNAPSHOT_ON_BOOT or the snapshot cron for persisted history.',
};

const SNAPSHOT_HEALTH_LABELS = {
  ok: null,
  no_snapshots: 'No trend snapshots stored yet',
  seeded_only: 'Backfill only — waiting for first live daily snapshot',
  stale: 'Snapshot cron may be stale (last live snapshot > 48h)',
};

export default function TrendsChart({
  points = [],
  dataSource = 'synthetic',
  lastLiveSnapshotAt = null,
  snapshotHealth = null,
}) {
  const data = points.map((p) => ({
    label: p.label,
    applications: p.new_applications,
    hires: p.hires,
    fit: p.avg_fit_score,
    openJobs: p.open_jobs,
    funnelConv: p.funnel_conversion_to_interview,
    hireTarget: p.hire_target,
    pendingOffers: p.pending_offers,
    offerDwell: p.median_offer_dwell_days,
    interviewDwell: p.median_interview_dwell_days,
    timeToFill: p.time_to_fill_days,
    timeToHire: p.time_to_hire_days,
  }));

  const sourceLabel = TRENDS_SOURCE_LABELS[dataSource] || TRENDS_SOURCE_LABELS.synthetic;
  const sourceHint = TRENDS_SOURCE_HINTS[dataSource];
  const healthStatus = snapshotHealth?.status;
  const healthWarning = healthStatus ? SNAPSHOT_HEALTH_LABELS[healthStatus] : null;
  const cronConfigured = snapshotHealth?.cron_token_configured;

  return (
    <ChartCard
      title="6-month trends"
      testId="trends-chart"
      headerRight={
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {healthWarning ? (
            <Badge
              variant="outline"
              className="text-xs font-normal border-amber-300 text-amber-800 bg-amber-50"
              data-testid="trends-snapshot-health"
            >
              {healthWarning}
            </Badge>
          ) : null}
          <Badge variant="outline" className="text-xs font-normal" data-testid="trends-data-source">
            {sourceLabel}
          </Badge>
        </div>
      }
      empty={data.length === 0}
      emptyMessage="Trend data unavailable"
    >
      <>
        {sourceHint || healthWarning || snapshotHealth ? (
          <p className="text-xs text-slate-500 mb-2" data-testid="trends-data-source-hint">
            {sourceHint}
            {healthWarning && !sourceHint ? healthWarning : null}
            {(lastLiveSnapshotAt || snapshotHealth?.last_live_snapshot_at) && dataSource !== 'synthetic' ? (
              <span className="block mt-0.5 text-slate-400">
                Last live snapshot:{' '}
                {new Date(
                  lastLiveSnapshotAt || snapshotHealth?.last_live_snapshot_at
                ).toLocaleString()}
              </span>
            ) : null}
            {snapshotHealth && cronConfigured === false ? (
              <span className="block mt-0.5 text-amber-700">
                HIRING_SNAPSHOT_TOKEN is not configured — daily cron will not run.
              </span>
            ) : null}
            {snapshotHealth?.live_snapshot_count != null ? (
              <span className="block mt-0.5 text-slate-400">
                Live snapshots: {snapshotHealth.live_snapshot_count} / {snapshotHealth.snapshot_count}
              </span>
            ) : null}
          </p>
        ) : null}
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="left" allowDecimals={false} />
          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} hide />
          <Tooltip />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="applications" name="Applications" stroke="#6366F1" strokeWidth={2} dot={false} />
          <Line yAxisId="left" type="monotone" dataKey="hires" name="Hires" stroke="#10B981" strokeWidth={2} dot={false} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="hireTarget"
            name="Hire target"
            stroke="#EF4444"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            connectNulls
          />
          <Line yAxisId="right" type="monotone" dataKey="fit" name="Avg fit %" stroke="#8B5CF6" strokeWidth={2} dot={false} />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="funnelConv"
            name="Funnel → interview %"
            stroke="#F59E0B"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="pendingOffers"
            name="Pending offers"
            stroke="#059669"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="offerDwell"
            name="Avg offer dwell (d)"
            stroke="#14B8A6"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={false}
            connectNulls
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="timeToFill"
            name="Time to fill (d)"
            stroke="#64748B"
            strokeWidth={2}
            strokeDasharray="2 2"
            dot={false}
            connectNulls
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="timeToHire"
            name="Time to hire (d)"
            stroke="#475569"
            strokeWidth={2}
            strokeDasharray="2 2"
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
      <ChartAccessibleTable
        caption={chartTitleCase('Six-month hiring trends')}
        columns={[
          { key: 'label', label: 'Period' },
          { key: 'applications', label: 'Applications' },
          { key: 'hires', label: 'Hires' },
          { key: 'fit', label: 'Avg fit %' },
        ]}
        rows={data.map((row) => ({
          id: row.label,
          label: row.label,
          applications: row.applications,
          hires: row.hires,
          fit: row.fit != null ? `${Math.round(row.fit)}%` : '—',
        }))}
      />
      </>
    </ChartCard>
  );
}
