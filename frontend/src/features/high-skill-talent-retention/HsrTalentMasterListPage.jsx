import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { normalizeEmployeeCodeParam } from '@/shared/lib/drillQueryParams';
import { toast } from 'sonner';
import { highSkillRetentionApi } from '@/shared/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Badge } from '@/shared/ui/badge';
import { Loader2, Plus } from 'lucide-react';

function initialSearchFromParams(searchParams) {
  return (
    normalizeEmployeeCodeParam(searchParams.get('q')) ||
    normalizeEmployeeCodeParam(searchParams.get('employee_code')) ||
    ''
  );
}

const HsrTalentMasterListPage = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [filters, setFilters] = useState(() => ({
    q: initialSearchFromParams(searchParams),
    risk: 'all',
    segment: 'all',
  }));

  useEffect(() => {
    const nextQ = initialSearchFromParams(searchParams);
    if (nextQ && nextQ !== filters.q) {
      setFilters((f) => ({ ...f, q: nextQ }));
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const params = useMemo(() => {
    const skip = (page - 1) * pageSize;
    return {
      skip,
      limit: pageSize,
      q: filters.q || undefined,
      risk: filters.risk !== 'all' ? filters.risk : undefined,
      segment: filters.segment !== 'all' ? filters.segment : undefined,
    };
  }, [filters, page]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await highSkillRetentionApi.listProfiles(params);
      const payload = res.data || {};
      setRows(payload.items || []);
      setTotal(payload.total || 0);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to load talent profiles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const drillQuery =
    normalizeEmployeeCodeParam(searchParams.get('employee_code')) ||
    normalizeEmployeeCodeParam(searchParams.get('q'));

  if (loading && rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
            High-Skill Talent Master
          </h1>
          <p className="text-slate-600 mt-1 text-sm">Profiles, criticality, risk, successor coverage, and interventions.</p>
        </div>
        <Button asChild>
          <Link to="/high-skill-talent-retention/talent-master/new">
            <Plus className="w-4 h-4 mr-2" />
            New profile
          </Link>
        </Button>
      </div>

      {drillQuery ? (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 flex flex-wrap items-center justify-between gap-2"
          data-testid="hsr-talent-master-drill-banner"
        >
          <span>
            Drill-down from Executive KPIs: employee <strong>{drillQuery}</strong>
          </span>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="h-8 bg-white">
              <Link to={`/high-skill-talent-retention/dashboard?employee_code=${encodeURIComponent(drillQuery)}`}>
                Open retention dashboard
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-8 bg-white">
              <Link to="/executive-kpis">Executive KPIs</Link>
            </Button>
          </div>
        </div>
      ) : null}

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Input
            placeholder="Search employee, code, skill, dept"
            className="max-w-xs"
            value={filters.q}
            onChange={(e) => {
              setPage(1);
              setFilters((f) => ({ ...f, q: e.target.value }));
            }}
          />
          <Select
            value={filters.risk}
            onValueChange={(v) => {
              setPage(1);
              setFilters((f) => ({ ...f, risk: v }));
            }}
          >
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Risk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All risk</SelectItem>
              <SelectItem value="LOW">LOW</SelectItem>
              <SelectItem value="MEDIUM">MEDIUM</SelectItem>
              <SelectItem value="HIGH">HIGH</SelectItem>
              <SelectItem value="CRITICAL">CRITICAL</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.segment}
            onValueChange={(v) => {
              setPage(1);
              setFilters((f) => ({ ...f, segment: v }));
            }}
          >
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Segment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All segments</SelectItem>
              <SelectItem value="CRITICAL_EXPERT">CRITICAL_EXPERT</SelectItem>
              <SelectItem value="SCARCE_SKILL">SCARCE_SKILL</SelectItem>
              <SelectItem value="HIGH_PERFORMER">HIGH_PERFORMER</SelectItem>
              <SelectItem value="FUTURE_LEADER">FUTURE_LEADER</SelectItem>
              <SelectItem value="CLIENT_SPECIALIST">CLIENT_SPECIALIST</SelectItem>
              <SelectItem value="HIGH_RISK">HIGH_RISK</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardContent className="pt-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Talent Code</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Primary Skill</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Successor</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.talent_code}</TableCell>
                  <TableCell className="font-mono text-xs">{r.employee_id}</TableCell>
                  <TableCell>{r.department || '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{r.manager_id || '—'}</TableCell>
                  <TableCell>{r.primary_skill}</TableCell>
                  <TableCell>
                    <Badge variant={r.current_risk_level === 'CRITICAL' ? 'destructive' : 'outline'}>
                      {r.current_risk_level}
                    </Badge>
                  </TableCell>
                  <TableCell>{r.successor_available_flag ? <Badge>Yes</Badge> : '—'}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`/high-skill-talent-retention/talent-master/${encodeURIComponent(r.id)}`}>View</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/high-skill-talent-retention/talent-master/${encodeURIComponent(r.id)}/edit`}>Edit</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {rows.length === 0 ? <p className="text-sm text-slate-500 py-6 text-center">No profiles match filters.</p> : null}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          Page {page} / {totalPages} · {total} total
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HsrTalentMasterListPage;

