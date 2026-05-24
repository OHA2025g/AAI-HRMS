import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpDown, AlertTriangle } from 'lucide-react';
import { Badge } from '../ui/badge';
import ChartCard from './ChartCard';
import { cn } from '../../lib/utils';

const SORT_KEYS = {
  candidate_name: 'candidate_name',
  job_title: 'job_title',
  days_in_offer: 'days_in_offer',
  entered_offer_at: 'entered_offer_at',
};

function SortIcon({ active, direction }) {
  if (!active) return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />;
  return direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />;
}

const OFFER_STATUS_BADGE = {
  SENT: 'bg-blue-100 text-blue-700',
  NEGOTIATION: 'bg-amber-100 text-amber-700',
  ACCEPTED: 'bg-emerald-100 text-emerald-700',
  DECLINED: 'bg-red-100 text-red-700',
};

export default function OfferAgingPanel({ offerAging = [] }) {
  const [sortKey, setSortKey] = useState(SORT_KEYS.days_in_offer);
  const [sortDir, setSortDir] = useState('desc');

  const sorted = useMemo(() => {
    const rows = [...offerAging];
    rows.sort((a, b) => {
      const mult = sortDir === 'asc' ? 1 : -1;
      if (sortKey === SORT_KEYS.days_in_offer) {
        return mult * ((a.days_in_offer ?? 0) - (b.days_in_offer ?? 0));
      }
      if (sortKey === SORT_KEYS.entered_offer_at) {
        return mult * String(a.entered_offer_at || '').localeCompare(String(b.entered_offer_at || ''));
      }
      return mult * String(a[sortKey] || '').localeCompare(String(b[sortKey] || ''));
    });
    return rows;
  }, [offerAging, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir(key === SORT_KEYS.candidate_name || key === SORT_KEYS.job_title ? 'asc' : 'desc');
  };

  const headerClass = (key) =>
    cn('pb-2 font-medium select-none cursor-pointer hover:text-slate-700', sortKey === key && 'text-slate-800');

  return (
    <ChartCard
      title="Offer ageing"
      testId="offer-aging-panel"
      empty={sorted.length === 0}
      emptyMessage="No pending offers in scope"
      emptyHeight={160}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label="Offer ageing by candidate">
          <thead>
            <tr className="text-left text-slate-500 border-b">
              <th className={headerClass(SORT_KEYS.candidate_name)} onClick={() => toggleSort(SORT_KEYS.candidate_name)}>
                <span className="inline-flex items-center gap-1">
                  Candidate
                  <SortIcon active={sortKey === SORT_KEYS.candidate_name} direction={sortDir} />
                </span>
              </th>
              <th className={headerClass(SORT_KEYS.job_title)} onClick={() => toggleSort(SORT_KEYS.job_title)}>
                <span className="inline-flex items-center gap-1">
                  Role
                  <SortIcon active={sortKey === SORT_KEYS.job_title} direction={sortDir} />
                </span>
              </th>
              <th className={headerClass(SORT_KEYS.days_in_offer)} onClick={() => toggleSort(SORT_KEYS.days_in_offer)}>
                <span className="inline-flex items-center gap-1">
                  Days
                  <SortIcon active={sortKey === SORT_KEYS.days_in_offer} direction={sortDir} />
                </span>
              </th>
              <th className="pb-2 font-medium">Status</th>
              <th className={headerClass(SORT_KEYS.entered_offer_at)} onClick={() => toggleSort(SORT_KEYS.entered_offer_at)}>
                <span className="inline-flex items-center gap-1">
                  Entered
                  <SortIcon active={sortKey === SORT_KEYS.entered_offer_at} direction={sortDir} />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.application_id} className="border-b border-slate-50 last:border-0">
                <td className="py-2.5 pr-2">
                  <Link
                    to={`/candidates/${row.candidate_id}`}
                    className="font-medium text-indigo-600 hover:underline"
                  >
                    {row.candidate_name}
                  </Link>
                </td>
                <td className="py-2.5 pr-2 text-slate-700">{row.job_title}</td>
                <td className="py-2.5 pr-2">
                  <span className={cn('inline-flex items-center gap-1 font-semibold', row.sla_breached ? 'text-red-600' : 'text-slate-900')}>
                    {row.sla_breached ? <AlertTriangle className="w-3.5 h-3.5" aria-hidden /> : null}
                    {row.days_in_offer}d
                  </span>
                </td>
                <td className="py-2.5 pr-2">
                  {row.offer_status ? (
                    <Badge className={OFFER_STATUS_BADGE[row.offer_status] || 'bg-slate-100 text-slate-700'}>
                      {row.offer_status.replace(/_/g, ' ')}
                    </Badge>
                  ) : (
                    <span className="text-slate-400 text-xs">—</span>
                  )}
                </td>
                <td className="py-2.5 text-slate-500 text-xs">
                  {row.entered_offer_at ? new Date(row.entered_offer_at).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}
