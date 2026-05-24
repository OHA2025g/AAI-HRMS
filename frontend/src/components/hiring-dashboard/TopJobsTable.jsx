import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

const SORT_KEYS = {
  title: 'title',
  open_days: 'open_days',
  pipeline_count: 'pipeline_count',
  avg_fit_score: 'avg_fit_score',
};

function compareJobs(a, b, key, direction) {
  const mult = direction === 'asc' ? 1 : -1;
  if (key === 'title') {
    return mult * String(a.title || '').localeCompare(String(b.title || ''));
  }
  if (key === 'avg_fit_score') {
    const av = a.avg_fit_score ?? -1;
    const bv = b.avg_fit_score ?? -1;
    return mult * (av - bv);
  }
  return mult * ((a[key] ?? 0) - (b[key] ?? 0));
}

function SortIcon({ active, direction }) {
  if (!active) return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />;
  return direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />;
}

export default function TopJobsTable({ topJobs = [] }) {
  const [sortKey, setSortKey] = useState(SORT_KEYS.pipeline_count);
  const [sortDir, setSortDir] = useState('desc');

  const sortedJobs = useMemo(() => {
    const rows = [...topJobs];
    rows.sort((a, b) => compareJobs(a, b, sortKey, sortDir));
    return rows;
  }, [topJobs, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir(key === 'title' ? 'asc' : 'desc');
  };

  const headerClass = (key) =>
    cn(
      'pb-2 font-medium select-none cursor-pointer hover:text-slate-700',
      sortKey === key && 'text-slate-800'
    );

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold" style={{ fontFamily: 'Outfit' }}>
          Top open roles
        </CardTitle>
        <Button asChild variant="ghost" size="sm" className="text-indigo-600">
          <Link to="/jobs">All jobs</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {sortedJobs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className={headerClass(SORT_KEYS.title)} onClick={() => toggleSort(SORT_KEYS.title)}>
                    <span className="inline-flex items-center gap-1">
                      Role
                      <SortIcon active={sortKey === SORT_KEYS.title} direction={sortDir} />
                    </span>
                  </th>
                  <th className={headerClass(SORT_KEYS.open_days)} onClick={() => toggleSort(SORT_KEYS.open_days)}>
                    <span className="inline-flex items-center gap-1">
                      Open
                      <SortIcon active={sortKey === SORT_KEYS.open_days} direction={sortDir} />
                    </span>
                  </th>
                  <th
                    className={headerClass(SORT_KEYS.pipeline_count)}
                    onClick={() => toggleSort(SORT_KEYS.pipeline_count)}
                  >
                    <span className="inline-flex items-center gap-1">
                      Pipeline
                      <SortIcon active={sortKey === SORT_KEYS.pipeline_count} direction={sortDir} />
                    </span>
                  </th>
                  <th
                    className={headerClass(SORT_KEYS.avg_fit_score)}
                    onClick={() => toggleSort(SORT_KEYS.avg_fit_score)}
                  >
                    <span className="inline-flex items-center gap-1">
                      Avg fit
                      <SortIcon active={sortKey === SORT_KEYS.avg_fit_score} direction={sortDir} />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedJobs.map((job) => (
                  <tr key={job.job_id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2.5 pr-2">
                      <Link to={`/jobs/${job.job_id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                        {job.title}
                      </Link>
                      <Badge variant="secondary" className="ml-2 text-[10px]">
                        {job.status}
                      </Badge>
                    </td>
                    <td className="py-2.5">{job.open_days}d</td>
                    <td className="py-2.5">{job.pipeline_count}</td>
                    <td className="py-2.5">{job.avg_fit_score != null ? `${Math.round(job.avg_fit_score)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-slate-500">No open jobs in scope</div>
        )}
      </CardContent>
    </Card>
  );
}
