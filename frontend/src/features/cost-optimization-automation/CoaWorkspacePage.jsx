import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Loader2 } from 'lucide-react';
import { costOptimizationModuleApi } from '@/shared/lib/api';
import { getCoaRouteConfig } from './routeTable';

const inferColumns = (rows) => {
  const r = (rows || [])[0];
  if (!r) return [];
  const keys = Object.keys(r).filter((k) => k !== '_id');
  const preferred = ['snapshot_date', 'department', 'business_unit', 'geography', 'created_at', 'generated_at', 'vendor_name', 'process_name'];
  keys.sort((a, b) => (preferred.includes(a) ? -1 : 0) - (preferred.includes(b) ? -1 : 0) || a.localeCompare(b));
  return keys.slice(0, 12);
};

export default function CoaWorkspacePage() {
  const { pathname } = useLocation();
  const cfg = useMemo(() => getCoaRouteConfig(pathname), [pathname]);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [exec, setExec] = useState(null);
  const [strat, setStrat] = useState(null);
  const [scenarioOut, setScenarioOut] = useState(null);
  const [scenType, setScenType] = useState('automation_expansion');
  const [scenBase, setScenBase] = useState('10');

  const title = useMemo(() => cfg?.path?.split('/').slice(-1)[0]?.replace(/-/g, ' ') || 'Workspace', [cfg]);

  const fetchRows = async () => {
    if (!cfg) return;
    setLoading(true);
    try {
      if (cfg.kind === 'list') {
        const res = await costOptimizationModuleApi.listBySegment(cfg.apiPath, filter ? { q: filter } : {});
        setRows(res.data?.items || []);
      } else if (cfg.kind === 'executive') {
        const res = await costOptimizationModuleApi.getExecutiveSummary();
        setExec(res.data?.executive_snapshot || null);
        setRows([]);
      } else if (cfg.kind === 'strategic') {
        const res = await costOptimizationModuleApi.getStrategicSummary();
        setStrat(res.data?.strategic_snapshot || null);
        setRows([]);
      } else if (cfg.kind === 'scenario') {
        const resList = await costOptimizationModuleApi.listBySegment('scenario-modeling');
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
      const res = await costOptimizationModuleApi.scenarioWhatIf({
        scenario_type: scenType,
        inputs: { baseline_spend_millions: parseFloat(scenBase, 10) || 10 },
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
          <div className="text-sm text-muted-foreground">Board-ready snapshot and narrative hooks</div>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{exec?.summary_type || 'Executive summary'}</CardTitle>
              <CardDescription>Risk {exec?.risk_index} · Opportunity {exec?.opportunity_index}</CardDescription>
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
          <div className="text-sm text-muted-foreground">Indices, risk map, and strategic recommendations</div>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Strategic snapshot</CardTitle>
              <CardDescription>
                Efficiency {strat?.cost_efficiency_index} · Automation maturity {strat?.automation_maturity_index}
              </CardDescription>
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
          <div className="text-sm text-muted-foreground">Deterministic mock engine + saved scenarios (table)</div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>What-if</CardTitle>
            <CardDescription>Quick projection (mock)</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 items-end">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Scenario type</div>
              <Input value={scenType} onChange={(e) => setScenType(e.target.value)} placeholder="automation_expansion" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Baseline spend (M$)</div>
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
          <div className="text-sm text-muted-foreground">Drill-down records (filters apply client-side hint)</div>
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
              <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter (pass-through hint)…" />
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
