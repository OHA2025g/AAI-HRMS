import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Badge } from '@/shared/ui/badge';
import { CHART_COLORS } from '@/shared/config/executiveKpiConfig';
import { normalizeCandidateSourceParam, normalizeSentimentParam } from '@/shared/lib/drillQueryParams';
import { chartTitleCase } from '@/shared/lib/chartTitleCase';
import { ExecutiveSectionSkeleton } from './ExecutiveSectionSkeleton';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

const RISK_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 };

function SortableHead({ label, sortKey, activeKey, direction, onSort }) {
  const active = activeKey === sortKey;
  const Icon = active ? (direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <TableHead>
      <button
        type="button"
        className="inline-flex items-center gap-1 font-medium hover:text-slate-900"
        onClick={() => onSort(sortKey)}
      >
        {label}
        <Icon className={`w-3.5 h-3.5 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
      </button>
    </TableHead>
  );
}

export function SkillGapsChart({ gaps = [], analystMode }) {
  const navigate = useNavigate();
  const data = useMemo(
    () =>
      (gaps || []).slice(0, 8).map((g) => ({
        ...g,
        name: g.skill_name,
      })),
    [gaps],
  );

  if (!data.length) {
    return <p className="text-slate-500 text-sm">No skill gap data. Add workforce skills in Workforce Intelligence.</p>;
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
          <XAxis dataKey="skill_name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={70} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar
            dataKey="demand_count"
            name="Demand"
            fill="#94A3B8"
            radius={[2, 2, 0, 0]}
            onClick={(row) => row?.skill_name && navigate(`/workforce-intelligence/dashboard?skill=${encodeURIComponent(row.skill_name)}`)}
            cursor="pointer"
          />
          <Bar
            dataKey="supply_count"
            name="Supply"
            fill="#10B981"
            radius={[2, 2, 0, 0]}
            onClick={(row) => row?.skill_name && navigate(`/workforce-intelligence/dashboard?skill=${encodeURIComponent(row.skill_name)}`)}
            cursor="pointer"
          />
          <Bar
            dataKey="gap"
            name="Gap"
            fill="#6366F1"
            radius={[4, 4, 0, 0]}
            onClick={(row) => row?.skill_name && navigate(`/workforce-intelligence/dashboard?skill=${encodeURIComponent(row.skill_name)}`)}
            cursor="pointer"
          />
        </BarChart>
      </ResponsiveContainer>
      {analystMode ? (
        <Table className="mt-4 text-xs">
          <TableHeader>
            <TableRow>
              <TableHead>Skill</TableHead>
              <TableHead>Demand</TableHead>
              <TableHead>Supply</TableHead>
              <TableHead>Gap</TableHead>
              <TableHead>Priority</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((r) => (
              <TableRow key={r.skill_name}>
                <TableCell>{r.skill_name}</TableCell>
                <TableCell>{r.demand_count}</TableCell>
                <TableCell>{r.supply_count}</TableCell>
                <TableCell>{r.gap}</TableCell>
                <TableCell>{r.priority}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
      <Button asChild variant="link" className="mt-2 px-0 text-indigo-600">
        <Link to="/workforce-intelligence/executive-intelligence">Open workforce intelligence →</Link>
      </Button>
    </div>
  );
}

export function SourceMixDonut({ mix = {} }) {
  const navigate = useNavigate();
  const data = useMemo(
    () =>
      Object.entries(mix || {}).map(([name, value], i) => ({
        name,
        value,
        fill: CHART_COLORS[i % CHART_COLORS.length],
      })),
    [mix],
  );

  const handleSliceClick = (entry) => {
    const src = normalizeCandidateSourceParam(entry?.name) || String(entry?.name || '').trim().toUpperCase();
    if (!src) return;
    navigate(`/candidates?source=${encodeURIComponent(src)}`);
  };

  if (!data.length) return <p className="text-slate-500 text-sm">No candidate source data in window.</p>;
  return (
    <div>
      <p className="text-xs text-slate-500 mb-2">Click a segment to filter candidates by source.</p>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            onClick={handleSliceClick}
            cursor="pointer"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SentimentDonut({ counts = {} }) {
  const navigate = useNavigate();
  const data = useMemo(() => {
    const labels = ['POSITIVE', 'NEUTRAL', 'NEGATIVE'];
    const colors = ['#10B981', '#94A3B8', '#F43F5E'];
    return labels
      .map((name, i) => ({ name, value: counts[name] || 0, fill: colors[i] }))
      .filter((d) => d.value > 0);
  }, [counts]);

  const handleSliceClick = (entry) => {
    const label = normalizeSentimentParam(entry?.name);
    if (!label) return;
    navigate(`/employee-satisfaction-engagement/sentiment?sentiment=${encodeURIComponent(label)}`);
  };

  if (!data.length) return <p className="text-slate-500 text-sm">No pulse sentiment in window.</p>;
  return (
    <div data-testid="executive-sentiment-donut">
      <p className="text-xs text-slate-500 mb-2">Click a segment to open sentiment records in ESE.</p>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={75}
            onClick={handleSliceClick}
            cursor="pointer"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-2 mt-2">
        {data.map((d) => (
          <Button
            key={d.name}
            type="button"
            variant="link"
            size="sm"
            className="h-7 px-0 text-indigo-600"
            data-testid={`sentiment-drill-${d.name.toLowerCase()}`}
            onClick={() => handleSliceClick(d)}
          >
            {d.name} →
          </Button>
        ))}
      </div>
    </div>
  );
}

export function WorkforceTrendChart({ trends, scopeFiltered }) {
  const series = trends?.series || [];
  const scopedSeries = trends?.scoped_series || [];
  const overlay = trends?.scoped_overlay;
  const chartData = useMemo(() => {
    const scopedByPeriod = Object.fromEntries(scopedSeries.map((r) => [r.period, r]));
    const rows = series.map((row) => ({
      ...row,
      scoped_active_employee_count: scopedByPeriod[row.period]?.active_employee_count ?? null,
      scoped_attrition_rate_pct: scopedByPeriod[row.period]?.attrition_rate_pct ?? null,
    }));
    if (overlay?.active_employee_count != null) {
      rows.push({
        period: 'Current scope',
        active_employee_count: null,
        attrition_rate_pct: null,
        scoped_active_employee_count: overlay.active_employee_count,
        scoped_attrition_rate_pct: overlay.attrition_rate_pct,
        _scoped: true,
      });
    }
    return rows;
  }, [series, scopedSeries, overlay]);

  if (series.length < 2) {
    return (
      <p className="text-slate-500 text-sm">
        Generate monthly leadership snapshots to see headcount and attrition trends over time.
      </p>
    );
  }
  return (
    <div
      className="space-y-3"
      data-testid="executive-workforce-trend-chart"
      role="figure"
      aria-label="Workforce headcount and attrition trends"
    >
      {scopeFiltered ? (
        <Alert className="border-amber-200 bg-amber-50/80 py-2" data-testid="executive-trends-scope-note">
          <AlertDescription className="text-xs text-amber-950">
            Solid lines are organization-wide snapshots. Dashed lines use scoped data from snapshots saved with the
            same filters ({trends?.scoped_points_from_snapshots ?? 0} periods) plus a live point for today.
            Generate a snapshot while filters are active to grow scoped history.
          </AlertDescription>
        </Alert>
      ) : null}
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={chartData}>
          <XAxis dataKey="period" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="active_employee_count"
            name="Active (org)"
            stroke="#6366F1"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="attrition_rate_pct"
            name="Attrition % (org)"
            stroke="#F43F5E"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          {scopeFiltered ? (
            <>
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="scoped_active_employee_count"
                name="Active (scope)"
                stroke="#0EA5E9"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={{ r: 4 }}
                connectNulls
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="scoped_attrition_rate_pct"
                name="Attrition % (scope)"
                stroke="#38BDF8"
                strokeWidth={2}
                strokeDasharray="4 3"
                dot={{ r: 3 }}
                connectNulls
              />
            </>
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
      <WorkforceTrendDataTable chartData={chartData} scopeFiltered={scopeFiltered} />
    </div>
  );
}

function WorkforceTrendDataTable({ chartData, scopeFiltered }) {
  return (
    <table className="sr-only" aria-label="Workforce trend data table">
      <caption>Monthly workforce metrics used in the trend chart</caption>
      <thead>
        <tr>
          <th scope="col">Period</th>
          <th scope="col">Active (org)</th>
          <th scope="col">Attrition % (org)</th>
          {scopeFiltered ? (
            <>
              <th scope="col">Active (scope)</th>
              <th scope="col">Attrition % (scope)</th>
            </>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {chartData.map((row) => (
          <tr key={row.period}>
            <td>{row.period}</td>
            <td>{row.active_employee_count ?? '—'}</td>
            <td>{row.attrition_rate_pct ?? '—'}</td>
            {scopeFiltered ? (
              <>
                <td>{row.scoped_active_employee_count ?? '—'}</td>
                <td>{row.scoped_attrition_rate_pct ?? '—'}</td>
              </>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function RetentionRiskTable({ employees = [], analystMode }) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState('risk');
  const [sortDir, setSortDir] = useState('desc');

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  };

  const sorted = useMemo(() => {
    const list = [...(employees || [])];
    const dir = sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      if (sortKey === 'name') {
        const an = (a.full_name || a.employee_code || '').toLowerCase();
        const bn = (b.full_name || b.employee_code || '').toLowerCase();
        return an.localeCompare(bn) * dir;
      }
      if (sortKey === 'skills') {
        return ((a.critical_skills_matched || 0) - (b.critical_skills_matched || 0)) * dir;
      }
      if (sortKey === 'score') {
        return ((a.risk_score || 0) - (b.risk_score || 0)) * dir;
      }
      const ar = RISK_ORDER[a.risk_label] ?? 9;
      const br = RISK_ORDER[b.risk_label] ?? 9;
      return (ar - br) * dir;
    });
    return list;
  }, [employees, sortKey, sortDir]);

  if (!employees.length) {
    return <p className="text-slate-500 text-sm">No retention risk data for current scope.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHead label="Employee" sortKey="name" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
          <SortableHead label="Critical skills" sortKey="skills" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
          {analystMode ? (
            <SortableHead label="Score" sortKey="score" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
          ) : null}
          <SortableHead label="Risk" sortKey="risk" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.slice(0, 10).map((e) => (
          <TableRow
            key={e.employee_code}
            className="cursor-pointer hover:bg-slate-50"
            onClick={() =>
              navigate(
                `/high-skill-talent-retention/dashboard?employee_code=${encodeURIComponent(e.employee_code || '')}`,
              )
            }
          >
            <TableCell>
              <div className="font-medium">{e.full_name || '—'}</div>
              <div className="text-xs text-slate-500">{e.employee_code}</div>
            </TableCell>
            <TableCell>{e.critical_skills_matched}</TableCell>
            {analystMode ? <TableCell>{e.risk_score}</TableCell> : null}
            <TableCell>
              <Badge
                variant={e.risk_label === 'HIGH' ? 'destructive' : e.risk_label === 'MEDIUM' ? 'outline' : 'secondary'}
              >
                {e.risk_label}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function ExecutiveSection({ id, title, description, children, action, refetching, skeletonHeight = 220 }) {
  return (
    <Card id={id} className="scroll-mt-28">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>{chartTitleCase(title)}</CardTitle>
          {description ? <CardDescription className="mt-1">{description}</CardDescription> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent>
        {refetching ? <ExecutiveSectionSkeleton height={skeletonHeight} /> : children}
      </CardContent>
    </Card>
  );
}
