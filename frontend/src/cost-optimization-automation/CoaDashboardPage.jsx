import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { costOptimizationModuleApi } from '../lib/api';

const Kpi = ({ title, value, hint }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardDescription>{title}</CardDescription>
      <CardTitle className="text-2xl">{value}</CardTitle>
      {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
    </CardHeader>
  </Card>
);

const fmtMoney = (n) => {
  if (n == null || Number.isNaN(Number(n))) return '—';
  const v = Number(n);
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
};

export default function CoaDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [bundle, setBundle] = useState(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const [d, b] = await Promise.all([
          costOptimizationModuleApi.getDashboardSummary(),
          costOptimizationModuleApi.getSummariesBundle().catch(() => null),
        ]);
        setData(d.data || null);
        setBundle(b?.data || null);
      } catch (e) {
        toast.error(e?.response?.data?.detail || 'Failed to load cost optimization dashboard');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const snap = data?.snapshot || {};
  const k = data?.kpis || {};
  const savings = useMemo(() => data?.top_savings_opportunities || [], [data]);
  const ops = useMemo(() => data?.recent_hr_operations_cost || [], [data]);

  const savingsChart = useMemo(
    () =>
      (savings || []).slice(0, 6).map((r) => ({
        id: r.savings_id || r.id,
        est: r.estimated_savings ?? 0,
      })),
    [savings],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold">Cost Optimization & Automation</div>
          <div className="text-sm text-muted-foreground">
            Strategic cost intelligence, efficiency monitoring, automation ROI, and executive-ready KPIs
          </div>
        </div>
        <div className="text-xs text-muted-foreground">Generated: {data?.generated_at || '—'}</div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading dashboard…
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">Snapshot: {snap.snapshot_date || '—'}</Badge>
        <Badge variant="outline">Variance: {k.cost_variance_percent != null ? `${Number(k.cost_variance_percent).toFixed(1)}%` : '—'}</Badge>
        <Badge variant="outline">Leakage alerts: {k.cost_leakage_alert_count ?? 0}</Badge>
        <Badge variant="outline">Pending budget approvals: {k.pending_budget_approvals ?? 0}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Kpi title="Total HR cost" value={fmtMoney(snap.total_hr_cost ?? k.total_hr_cost)} />
        <Kpi title="Total workforce cost" value={fmtMoney(snap.total_workforce_cost ?? k.total_workforce_cost)} />
        <Kpi title="Budget vs actual" value={`${fmtMoney(snap.budget_total)} / ${fmtMoney(snap.actual_spend_total)}`} />
        <Kpi title="Automation savings (YTD)" value={fmtMoney(snap.automation_savings_total ?? k.automation_savings_total)} hint="Realized + estimated" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader>
            <CardTitle>Top savings opportunities</CardTitle>
            <CardDescription>Prioritized pipeline (seed/demo)</CardDescription>
          </CardHeader>
          <CardContent>
            {savingsChart.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={savingsChart}>
                  <XAxis dataKey="id" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="est" fill="#6366F1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-muted-foreground">No savings opportunities.</div>
            )}
            <div className="mt-2 text-sm">
              <Link className="text-indigo-600 hover:underline" to="/cost-optimization-automation/savings-opportunities">
                Open savings pipeline →
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Module coverage</CardTitle>
            <CardDescription>Record counts from seeded collections</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            {bundle ? (
              <>
                <div>Workforce cost rows: {bundle.workforce_cost?.records ?? '—'}</div>
                <div>Automation ROI rows: {bundle.automation_roi?.records ?? '—'}</div>
                <div>Forecasts: {bundle.forecasts?.records ?? '—'}</div>
                <div>Overrun predictions: {bundle.risk?.overrun_predictions ?? '—'}</div>
                <div>Efficiency risks: {bundle.risk?.efficiency_risks ?? '—'}</div>
              </>
            ) : (
              <div>Bundle summary unavailable.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent HR operations cost</CardTitle>
          <CardDescription>Drill-down by process type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Process</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(ops || []).slice(0, 8).map((r, idx) => (
                  <TableRow key={r.operation_cost_id || idx}>
                    <TableCell>{r.process_type}</TableCell>
                    <TableCell>{r.department}</TableCell>
                    <TableCell>{fmtMoney(r.total_cost)}</TableCell>
                    <TableCell>{r.snapshot_date}</TableCell>
                  </TableRow>
                ))}
                {!ops?.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground text-sm">
                      No rows.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <Link className="block p-4 rounded-lg border bg-white hover:border-indigo-300 transition-colors" to="/cost-optimization-automation/budget-spend-control">
          <div className="font-semibold">Budget & spend</div>
          <div className="text-muted-foreground">Variance, overspend, approvals</div>
        </Link>
        <Link className="block p-4 rounded-lg border bg-white hover:border-indigo-300 transition-colors" to="/cost-optimization-automation/automation-roi-savings">
          <div className="font-semibold">Automation ROI</div>
          <div className="text-muted-foreground">Hours saved, cost saved, productivity</div>
        </Link>
        <Link className="block p-4 rounded-lg border bg-white hover:border-indigo-300 transition-colors" to="/cost-optimization-automation/ai-copilot">
          <div className="font-semibold">AI copilot</div>
          <div className="text-muted-foreground">Mock NL queries with audit trail</div>
        </Link>
      </div>
    </div>
  );
}
