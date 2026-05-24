import React from 'react';
import { Clock } from 'lucide-react';

export default function DataFreshnessBadge({ asOf, freshness = 'live', cacheSeconds }) {
  if (!asOf) return null;
  const label = freshness === 'cached' ? 'Cached' : 'Live';
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
      <Clock className="w-3.5 h-3.5" />
      <span>
        {label} · as of {new Date(asOf).toLocaleString()}
        {cacheSeconds ? ` · refreshes every ${cacheSeconds}s` : ''}
      </span>
    </div>
  );
}
