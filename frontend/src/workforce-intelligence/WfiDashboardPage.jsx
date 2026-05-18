import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { workforceIntelModuleApi } from '../lib/api';

const Kpi = ({ title, value, hint }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardDescription>{title}</CardDescription>
      <CardTitle className="text-2xl">{value}</CardTitle>
      {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
    </CardHeader>
  </Card>
);

export default function WfiDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const res = await workforceIntelModuleApi.getDashboardSummary();
        setData(res.data || null);
      } catch (e) {
        toast.error(e?.response?.data?.detail || 'Failed to load workforce dashboard');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const k = data?.kpis || {};
  const snapshot = data?.snapshot || {};
  const gaps = useMemo(() => data?.top_skill_gaps || [], [data]);
  const changes = useMemo(() => data?.recent_workforce_changes || [], [data]);

  const chartData = useMemo(
    () =>
      (gaps || []).map((r) => ({
        skill: r.skill_name,
        gap: r.gap ?? Math.max(0, (r.demand_count || 0) - (r.supply_count || 0)),
      })),
    [gaps]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold">Workforce Dashboard</div>
          <div className="text-sm text-muted-foreground">
            Strategic visibility + optimization + predictive decision support
          </div>
        </div>
        <div className="text-xs text-muted-foreground">Generated: {data?.generated_at || '-'}</div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading dashboard…
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">Snapshot: {snapshot.snapshot_date || '-'}</Badge>
        <Badge variant="outline">Avg utilization: {k.average_utilization ?? snapshot.average_utilization ?? 0}%</Badge>
        <Badge variant="outline">Bench: {k.bench_population ?? snapshot.bench_population ?? 0}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Kpi title="Total workforce" value={k.total_workforce ?? 0} />
        <Kpi title="Active workforce" value={k.active_workforce ?? 0} />
        <Kpi title="Inactive workforce" value={k.inactive_workforce ?? 0} />
        <Kpi title="Critical alerts" value={k.critical_alert_count ?? 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader>
            <CardTitle>Top skill gaps</CardTitle>
            <CardDescription>Derived from skill inventory and demand signals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData}>
                  <XAxis dataKey="skill" tick={{ fontSize: 11 }} interval={0} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="gap" fill="#6366F1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-muted-foreground">No gap data.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent workforce changes</CardTitle>
            <CardDescription>Latest employee updates (for drill-down)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(changes || []).map((r) => (
                    <TableRow key={r.id || r.employee_code}>
                      <TableCell>
                        <div className="font-medium">{r.full_name || '-'}</div>
                        <div className="text-xs text-muted-foreground">{r.employee_code || r.id}</div>
                      </TableCell>
                      <TableCell>{r.department || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === 'ACTIVE' ? 'default' : 'secondary'}>{r.status || '-'}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.updated_at || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {changes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-sm text-muted-foreground">
                        No recent changes.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

