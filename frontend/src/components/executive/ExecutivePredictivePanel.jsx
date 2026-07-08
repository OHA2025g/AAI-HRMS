import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { chartTitleCase } from '../../lib/chartTitleCase';

export function ExecutivePredictivePanel({ predictive, refetching }) {
  const attrition = predictive?.attrition_forecast;
  const retention = predictive?.retention_forecast;
  const insights = predictive?.insights || [];

  const chartData = useMemo(() => {
    const hist = (attrition?.history || []).map((r) => ({
      period: r.period,
      actual: r.attrition_rate_pct,
      forecast: null,
    }));
    const proj = (attrition?.projections || []).map((r) => ({
      period: r.period,
      actual: null,
      forecast: r.attrition_rate_pct,
    }));
    return [...hist, ...proj];
  }, [attrition]);

  const bandData = useMemo(
    () =>
      (retention?.risk_band_distribution || [])
        .filter((b) => b.count > 0)
        .map((b) => ({ band: b.band, count: b.count })),
    [retention],
  );

  if (!predictive) {
    return <p className="text-sm text-slate-500">Predictive views load with the dashboard bundle.</p>;
  }

  return (
    <div className="space-y-4" data-testid="executive-predictive-panel">
      <div className="flex flex-wrap gap-2 items-center text-xs text-slate-500">
        <Badge variant="outline">{predictive.model_version}</Badge>
        <span>Horizon: {predictive.horizon_months} mo</span>
        <span>Scope: {predictive.scope_label}</span>
        {refetching ? <span className="text-indigo-600">Updating…</span> : null}
      </div>

      {insights.length > 0 ? (
        <div className="space-y-2">
          {insights.map((item, i) => (
            <Alert
              key={`${item.title}-${i}`}
              className={item.severity === 'warn' ? 'border-amber-300 bg-amber-50/80' : 'border-slate-200'}
            >
              <AlertDescription className="text-xs">
                <span className="font-medium">{item.title}:</span> {item.message}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-slate-200 p-3 bg-white">
          <p className="text-sm font-medium text-slate-800 mb-1">{chartTitleCase('Attrition rate forecast')}</p>
          <p className="text-xs text-slate-500 mb-3">
            Solid = monthly snapshots; dashed = linear projection ({attrition?.trend_direction || '—'}). Current{' '}
            {attrition?.current_rate_pct ?? '—'}% → projected {attrition?.projected_rate_pct ?? '—'}%.
          </p>
          {chartData.length >= 2 ? (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} unit="%" />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Actual %"
                  stroke="#6366F1"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  name="Forecast %"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={{ r: 3 }}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-500">Add monthly leadership snapshots to enable attrition forecasting.</p>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 p-3 bg-white">
          <p className="text-sm font-medium text-slate-800 mb-1">{chartTitleCase('Retention risk forecast (M8)')}</p>
          <p className="text-xs text-slate-500 mb-3">
            {retention?.scored_employees ?? 0} scored / {retention?.active_employees ?? 0} active — predicted exits (
            {retention?.prediction_window_days ?? 30}d): {retention?.predicted_exits_window_low ?? '—'}–
            {retention?.predicted_exits_window_high ?? '—'} (mid {retention?.predicted_exits_window ?? '—'})
          </p>
          <div className="grid grid-cols-3 gap-2 mb-3 text-center">
            <div className="rounded-md bg-rose-50 border border-rose-100 p-2">
              <p className="text-xs text-rose-700">HIGH</p>
              <p className="text-lg font-bold text-rose-900">{retention?.high_risk_count ?? 0}</p>
            </div>
            <div className="rounded-md bg-amber-50 border border-amber-100 p-2">
              <p className="text-xs text-amber-800">MEDIUM</p>
              <p className="text-lg font-bold text-amber-950">{retention?.medium_risk_count ?? 0}</p>
            </div>
            <div className="rounded-md bg-emerald-50 border border-emerald-100 p-2">
              <p className="text-xs text-emerald-800">LOW</p>
              <p className="text-lg font-bold text-emerald-950">{retention?.low_risk_count ?? 0}</p>
            </div>
          </div>
          {bandData.length > 0 ? (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={bandData}>
                <XAxis dataKey="band" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" name="Employees" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      </div>

      {(retention?.department_forecasts || []).length > 0 ? (
        <div className="rounded-lg border border-slate-200 p-3 bg-slate-50/50">
          <p className="text-sm font-medium text-slate-800 mb-2">{chartTitleCase('Predicted exits by department')}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="py-1 pr-4">Department</th>
                  <th className="py-1 pr-4">Scored</th>
                  <th className="py-1 pr-4">Avg risk</th>
                  <th className="py-1">Predicted exits</th>
                </tr>
              </thead>
              <tbody>
                {retention.department_forecasts.map((row) => (
                  <tr key={row.department} className="border-b border-slate-100">
                    <td className="py-1.5 font-medium">{row.department}</td>
                    <td className="py-1.5">{row.scored_employees}</td>
                    <td className="py-1.5">{row.avg_attrition_risk}</td>
                    <td className="py-1.5">{row.predicted_exits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
