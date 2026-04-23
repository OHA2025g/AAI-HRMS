import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Loader2, ArrowRight, ExternalLink } from 'lucide-react';
import { employeeSatisfactionEngagementApi } from '../lib/api';
import { getEseRouteConfig } from './routeTable';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';

/** ESE mirrors WFI data for context; canonical predictive views live in WFI. */
const WFI_OPEN_IN = {
  wfi_burnout: {
    to: '/workforce-intelligence/burnout-wellbeing-risk',
    title: 'Canonical view: burnout & wellbeing risk',
    body: 'This table shows ESE-linked snapshots. For the full WFI predictive workspace, open Workforce Intelligence.',
  },
  wfi_attrition: {
    to: '/workforce-intelligence/attrition-flight-risk',
    title: 'Canonical view: attrition & flight risk',
    body: 'Attrition and flight-risk analytics are owned in Workforce Intelligence.',
  },
  wfi_ai_recommendations: {
    to: '/workforce-intelligence/ai-recommendations',
    title: 'Canonical view: AI workforce recommendations',
    body: 'Workforce-level AI recommendations are maintained in WFI.',
  },
  wfi_forecasts: {
    to: '/workforce-intelligence/forecasting',
    title: 'Canonical view: workforce forecasting',
    body: 'Forecasting models and scenarios are authored in Workforce Intelligence.',
  },
};

const inferColumns = (rows) => {
  const r = (rows || [])[0];
  if (!r) return [];
  const keys = Object.keys(r).filter((k) => k !== '_id');
  const preferred = ['snapshot_date', 'id', 'name', 'title', 'status', 'created_at', 'generated_at', 'generated_on'];
  keys.sort((a, b) => (preferred.includes(a) ? -1 : 0) - (preferred.includes(b) ? -1 : 0) || a.localeCompare(b));
  return keys.slice(0, 12);
};

export default function EseWorkspacePage() {
  const { pathname } = useLocation();
  const cfg = useMemo(() => getEseRouteConfig(pathname), [pathname]);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');

  const fetchRows = async () => {
    if (!cfg) return;
    setLoading(true);
    try {
      let res;
      if (cfg.kind === 'list' && cfg.segment) {
        res = await employeeSatisfactionEngagementApi.listBySegment(cfg.segment, filter ? { q: filter } : {});
        setRows(res.data?.items || []);
      } else if (cfg.kind === 'elm_grievances') {
        res = await employeeSatisfactionEngagementApi.listElmGrievances(filter ? { q: filter } : {});
        setRows(res.data?.items || []);
      } else if (cfg.kind === 'wfi_burnout') {
        res = await employeeSatisfactionEngagementApi.listWfiBurnout(filter ? { q: filter } : {});
        setRows(res.data?.items || []);
      } else if (cfg.kind === 'wfi_attrition') {
        res = await employeeSatisfactionEngagementApi.listWfiAttrition(filter ? { q: filter } : {});
        setRows(res.data?.items || []);
      } else if (cfg.kind === 'wfi_ai_recommendations') {
        res = await employeeSatisfactionEngagementApi.listWfiAiRecommendations(filter ? { q: filter } : {});
        setRows(res.data?.items || []);
      } else if (cfg.kind === 'wfi_forecasts') {
        res = await employeeSatisfactionEngagementApi.listWfiForecasts(filter ? { q: filter } : {});
        setRows(res.data?.items || []);
      } else if (cfg.kind === 'executive') {
        res = await employeeSatisfactionEngagementApi.getExecutiveSummary();
        setRows([res.data?.executive_snapshot || {}]);
      } else {
        setRows([]);
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to load workspace');
      setRows([]);
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
  const wfiLink = cfg?.kind ? WFI_OPEN_IN[cfg.kind] : null;
  const showElmGrievanceLink = cfg?.kind === 'elm_grievances';

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
              Open linked page <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl font-semibold capitalize">{title}</div>
        <div className="text-sm text-muted-foreground">Employee satisfaction & engagement workspace</div>
      </div>

      {wfiLink ? (
        <Alert className="border-indigo-200 bg-indigo-50/80">
          <AlertTitle className="text-indigo-900">{wfiLink.title}</AlertTitle>
          <AlertDescription className="text-indigo-900/90 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span>{wfiLink.body}</span>
            <Button asChild size="sm" variant="default" className="shrink-0">
              <Link to={wfiLink.to}>
                Open in Workforce Intelligence <ExternalLink className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {cfg?.kind === 'executive' ? (
        <Alert>
          <AlertTitle>Executive intelligence</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span>For cross-workforce executive signals, see Workforce Intelligence.</span>
            <Button asChild size="sm" variant="outline">
              <Link to="/workforce-intelligence/executive-intelligence">Open WFI executive view</Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {showElmGrievanceLink ? (
        <Alert className="border-amber-200 bg-amber-50/80">
          <AlertTitle>Source of truth: Employee Lifecycle</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span>Formal grievance cases and workflow are managed under Employee Relations in ELM.</span>
            <Button asChild size="sm" variant="secondary">
              <Link to="/employee-lifecycle-management/employee-relations">
                Open ELM — Employee relations <ExternalLink className="h-4 w-4 ml-2" />
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
          {cfg?.kind === 'list' || cfg?.kind?.startsWith('wfi_') || cfg?.kind === 'elm_grievances' || cfg?.kind === 'executive' ? (
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
            <div className="border rounded-md overflow-x-auto">
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
                        <TableCell key={c} className="max-w-[240px] truncate">
                          {typeof r?.[c] === 'object' ? JSON.stringify(r[c]) : String(r?.[c] ?? '-')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={Math.max(1, columns.length)} className="text-muted-foreground">
                        No rows yet — run the ESE seed script or add records.
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
