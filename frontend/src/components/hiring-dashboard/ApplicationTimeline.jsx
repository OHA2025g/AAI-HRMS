import React from 'react';
import { Badge } from '../ui/badge';
import { Clock } from 'lucide-react';

function entryTitle(entry) {
  const isOfferStatusEvent =
    entry.offer_status &&
    entry.from_stage === entry.to_stage &&
    entry.to_stage === 'OFFER';
  if (isOfferStatusEvent) {
    return `Offer — ${entry.offer_status.replace(/_/g, ' ')}`;
  }
  return entry.to_stage.replace(/_/g, ' ');
}

export default function ApplicationTimeline({ entries = [], loading = false }) {
  if (loading) {
    return <p className="text-sm text-slate-500">Loading hiring timeline…</p>;
  }
  if (!entries.length) {
    return <p className="text-sm text-slate-500">No stage history recorded for this application yet.</p>;
  }

  return (
    <ol className="relative border-l border-slate-200 ml-3 space-y-4">
      {entries.map((entry, idx) => {
        const isOfferStatusEvent =
          entry.offer_status &&
          entry.from_stage === entry.to_stage &&
          entry.to_stage === 'OFFER';

        return (
          <li key={`${entry.changed_at}-${idx}`} className="ml-4">
            <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-indigo-500 ring-4 ring-white" />
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-slate-900">{entryTitle(entry)}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {new Date(entry.changed_at).toLocaleString()}
                  {!isOfferStatusEvent && entry.from_stage
                    ? ` · from ${entry.from_stage.replace(/_/g, ' ')}`
                    : ''}
                </p>
                {entry.reason ? <p className="text-xs text-slate-600 mt-1">{entry.reason}</p> : null}
              </div>
              <div className="flex items-center gap-2">
                {entry.offer_status && !isOfferStatusEvent ? (
                  <Badge variant="outline" className="text-xs">
                    {entry.offer_status}
                  </Badge>
                ) : null}
                {entry.days_in_stage != null && !isOfferStatusEvent ? (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-100 rounded-full px-2 py-0.5">
                    <Clock className="w-3 h-3" />
                    {entry.days_in_stage}d
                  </span>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
