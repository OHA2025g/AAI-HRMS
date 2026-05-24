import React from 'react';
import { Badge } from '../ui/badge';

export function CareerTimeline({ timeline = [] }) {
  if (!timeline.length) {
    return <p className="text-sm text-slate-500">No structured timeline could be extracted from this CV.</p>;
  }
  return (
    <div className="space-y-4">
      {timeline.map((role, idx) => (
        <div
          key={`${role.company_name}-${role.role_title}-${idx}`}
          className="relative border-l-2 border-indigo-200 pl-4 pb-4 last:pb-0"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-slate-900">{role.role_title}</p>
              <p className="text-sm text-slate-600">{role.company_name}</p>
            </div>
            <Badge variant="secondary" className="text-xs">
              {role.start_date || '—'} → {role.end_date || '—'}
              {role.duration_months != null ? ` · ${role.duration_months}mo` : ''}
            </Badge>
          </div>
          <p className="text-xs text-indigo-700 mt-1">{role.seniority_level}</p>
          {role.career_signal ? <p className="text-xs text-slate-500 mt-1">{role.career_signal}</p> : null}
        </div>
      ))}
    </div>
  );
}
