import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Loader2, ArrowRight, ExternalLink } from 'lucide-react';
import { workforceIntelModuleApi } from '@/shared/lib/api';
import { getWfiRouteConfig } from './routeTable';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';

const COA_RELATED = {
  'cost-compensation': {
    title: 'Spend control & automation',
    body: 'For savings scenarios, automation ROI, and cost programs, use Cost Optimization & Automation.',
    to: '/cost-optimization-automation/dashboard',
    cta: 'Open COA dashboard',
  },
  'cost-optimization': {
    title: 'Not the same as COA',
    body: 'This view is workforce planning levers. Enterprise spend optimization and automation live in COA.',
    to: '/cost-optimization-automation/scenario-modeling',
    cta: 'Open COA scenario modeling',
  },
  'cost-risk-budget': {
    title: 'Budget & overrun programs',
    body: 'Operationalize cost risk responses and executive cost packs in COA.',
    to: '/cost-optimization-automation/cost-forecasting',
    cta: 'Open COA cost forecasting',
  },
};

const inferColumns = (rows) => {
  const r = (rows || [])[0];
  if (!r) return [];
  const keys = Object.keys(r).filter((k) => k !== '_id');
  const preferred = ['snapshot_date', 'department', 'business_unit', 'geography', 'created_at', 'generated_on'];
  keys.sort((a, b) => (preferred.includes(a) ? -1 : 0) - (preferred.includes(b) ? -1 : 0) || a.localeCompare(b));
  return keys.slice(0, 10);
};

export default function WfiWorkspacePage() {
  const { pathname } = useLocation();
  const cfg = useMemo(() => getWfiRouteConfig(pathname), [pathname]);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');

  const fetchRows = async () => {
    if (!cfg) return;
    setLoading(true);
    try {
      if (cfg.kind === 'list') {
        const res = await workforceIntelModuleApi.listByPath(cfg.apiPath, filter ? { q: filter } : {});
        setRows(res.data?.items || []);
      } else if (cfg.kind === 'executive') {
        const res = await workforceIntelModuleApi.getExecutiveSummary();
        setRows([res.data?.executive_snapshot || {}]);
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

  const columns = useMemo(() => inferColumns(rows), [rows]);
  const title = useMemo(() => cfg?.path?.split('/').slice(-1)[0]?.replace(/-/g, ' ') || 'Workspace', [cfg]);
  const coaHint = cfg?.kind === 'list' && cfg.apiPath ? COA_RELATED[cfg.apiPath] : null;

  if (cfg?.kind === 'legacy_link') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="capitalize">{title}</CardTitle>
          <CardDescription>This page is served by an existing module.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to={cfg.legacyPath}>
              Open legacy page <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold capitalize">{title}</div>
          <div className="text-sm text-muted-foreground">Workforce intelligence drill-down table</div>
        </div>
      </div>

      {coaHint ? (
        <Alert className="border-emerald-200 bg-emerald-50/70">
          <AlertTitle className="text-emerald-950">{coaHint.title}</AlertTitle>
          <AlertDescription className="text-emerald-950/90 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span>{coaHint.body}</span>
            <Button asChild size="sm" variant="outline" className="shrink-0 border-emerald-300">
              <Link to={coaHint.to}>
                {coaHint.cta} <ExternalLink className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Records</CardTitle>
          <CardDescription>{rows.length} rows</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {cfg?.kind === 'list' ? (
            <div className="flex gap-2">
              <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter (client-side hint)..." />
              <Button variant="secondary" onClick={() => fetchRows()}>
                Apply
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

