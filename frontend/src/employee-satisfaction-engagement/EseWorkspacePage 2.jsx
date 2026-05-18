import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Loader2 } from 'lucide-react';
import { employeeSatisfactionEngagementApi } from '../lib/api';
import { getEseRouteConfig } from './routeTable';

const inferColumns = (rows) => {
  const r = (rows || [])[0];
  if (!r) return [];
  const keys = Object.keys(r).filter((k) => k !== '_id');
  const preferred = [
    'snapshot_date',
    'campaign_name',
    'submitted_on',
    'department',
    'created_at',
    'generated_at',
    'checkin_date',
    'employee_id',
  ];
  keys.sort((a, b) => (preferred.includes(a) ? -1 : 0) - (preferred.includes(b) ? -1 : 0) || a.localeCompare(b));
  return keys.slice(0, 12);
};

export default function EseWorkspacePage() {
  const { pathname } = useLocation();
  const cfg = useMemo(() => getEseRouteConfig(pathname), [pathname]);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [exec, setExec] = useState(null);
  const [strat, setStrat] = useState(null);
  const [scenarioOut, setScenarioOut] = useState(null);
  const [scenType, setScenType] = useState('recognition_program_expansion');
  const [scenBase, setScenBase] = useState('0.72');

  const title = useMemo(() => cfg?.path?.split('/').slice(-1)[0]?.replace(/-/g, ' ') || 'Workspace', [cfg]);

  const fetchRows = async () => {
    if (!cfg) return;
    setLoading(true);
    try {
      if (cfg.kind === 'list') {
        const res = await employeeSatisfactionEngagementApi.listBySegment(cfg.apiPath, filter ? { q: filter } : {});
        setRows(res.data?.items || []);
      } else if (cfg.kind === 'executive') {
        const res = await employeeSatisfactionEngagementApi.getExecutiveSummary();
        setExec(res.data?.executive_snapshot || null);
        setRows([]);
      } else if (cfg.kind === 'strategic') {
        const res = await employeeSatisfactionEngagementApi.getStrategicSummary();
        setStrat(res.data?.strategic_snapshot || null);
        setRows([]);
      } else if (cfg.kind === 'scenario') {
        const resList = await employeeSatisfactionEngagementApi.listBySegment('scenario-modeling');
        setRows(resList.data?.items || []);
        setScenarioOut(null);
      } else {
        setRows([]);
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to load workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const runScenario = async () => {
    setLoading(true);
    try {
      const res = await employeeSatisfactionEngagementApi.scenarioWhatIf({
        scenario_type: scenType,
        inputs: { baseline_engagement_score: parseFloat(scenBase, 10) || 0.72 },
      });
      setScenarioOut(res.data || null);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Scenario failed');
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo(() => inferColumns(rows), [rows]);

  if (cfg?.kind === 'executive') {
    return (
      <div className="space-y-4">
        <div>
          <div className="text-2xl font-semibold capitalize">{title}</div>
          <div className="text-sm text-muted-foreground">Executive experience narrative and indices</div>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{exec?.summary_type || 'Executive summary'}</CardTitle>
              <CardDescription>
                Risk {exec?.risk_index} · Opportunity {exec?.opportunity_index}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-slate-50 p-3 rounded-md overflow-auto max-h-[420px]">
                {JSON.stringify(exec?.summary_payload || exec, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (cfg?.kind === 'strategic') {
    return (
      <div className="space-y-4">
        <div>
          <div className="text-2xl font-semibold capitalize">{title}</div>
          <div className="text-sm text-muted-foreground">Strategic workforce experience intelligence</div>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Strategic snapshot</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-slate-50 p-3 rounded-md overflow-auto max-h-[420px]">
                {JSON.stringify(strat, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (cfg?.kind === 'scenario') {
    return (
      <div className="space-y-4">
        <div>
          <div className="text-2xl font-semibold">Scenario modeling & what-if</div>
          <div className="text-sm text-muted-foreground">Deterministic mock — saved scenarios below</div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>What-if</CardTitle>
            <CardDescription>Engagement projection (mock)</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 items-end">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Scenario type</div>
              <Input value={scenType} onChange={(e) => setScenType(e.target.value)} />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Baseline engagement (0–1)</div>
              <Input value={scenBase} onChange={(e) => setScenBase(e.target.value)} />
            </div>
            <Button type="button" onClick={() => runScenario()}>
              Run
            </Button>
          </CardContent>
        </Card>

        {scenarioOut ? (
          <Card>
            <CardHeader>
              <CardTitle>Output</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-slate-50 p-3 rounded-md overflow-auto">{JSON.stringify(scenarioOut, null, 2)}</pre>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Saved scenarios</CardTitle>
            <CardDescription>{rows.length} rows</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columns.map((c) => (
                        <TableHead key={c}>{c}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(rows || []).slice(0, 100).map((r, idx) => (
                      <TableRow key={r.id || idx}>
                        {columns.map((c) => (
                          <TableCell key={c}>{String(r?.[c] ?? '-')}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                    {!rows.length ? (
                      <TableRow>
                        <TableCell colSpan={Math.max(1, columns.length)} className="text-muted-foreground text-sm">
                          No rows.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold capitalize">{title}</div>
          <div className="text-sm text-muted-foreground">Drill-down records</div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Records</CardTitle>
          <CardDescription>{rows.length} rows</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {cfg?.kind === 'list' ? (
            <div className="flex gap-2">
              <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter hint…" />
              <Button variant="secondary" onClick={() => fetchRows()}>
                Refresh
              </Button>
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((c) => (
                      <TableHead key={c}>{c}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rows || []).slice(0, 200).map((r, idx) => (
                    <TableRow key={r.id || idx}>
                      {columns.map((c) => (
                        <TableCell key={c}>{String(r?.[c] ?? '-')}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={Math.max(1, columns.length)} className="text-sm text-muted-foreground">
                        No records.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
