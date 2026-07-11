import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/shared/ui/badge';
import ChartCard from './ChartCard';
import { pipelinePathForStage } from '@/shared/lib/hiringDashboardDrill';

const STATUS_COLORS = {
  SENT: 'bg-blue-100 text-blue-700',
  NEGOTIATION: 'bg-amber-100 text-amber-700',
  ACCEPTED: 'bg-emerald-100 text-emerald-700',
  DECLINED: 'bg-red-100 text-red-700',
  UNSET: 'bg-slate-100 text-slate-600',
};

export default function OfferStatusStrip({ offerStatusCounts = [] }) {
  const navigate = useNavigate();
  if (!offerStatusCounts.length) return null;

  return (
    <ChartCard title="Offer status breakdown" testId="offer-status-strip">
      <div className="flex flex-wrap gap-2">
        {offerStatusCounts.map(({ status, label, count }) => (
          <button
            key={status}
            type="button"
            onClick={() => navigate(pipelinePathForStage(`OFFER_${status}`))}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Badge className={STATUS_COLORS[status] || STATUS_COLORS.UNSET}>{label}</Badge>
            <span className="font-semibold text-slate-900">{count}</span>
          </button>
        ))}
      </div>
    </ChartCard>
  );
}
