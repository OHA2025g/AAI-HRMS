import React from 'react';

export function CareerTimeline({ timeline = [], commandStyle = false }) {
  if (!timeline.length) {
    return (
      <p className={commandStyle ? 'ct-muted' : 'text-sm text-slate-500'}>
        No structured timeline could be extracted from this CV.
      </p>
    );
  }

  if (commandStyle) {
    return (
      <div className="ct-timeline">
        {timeline.map((role, idx) => {
          const roleTitle = role.role_title || role.title || 'Role';
          const company = role.company_name || role.organization || '';
          const start = role.start_date || role.period || '';
          const end = role.end_date || (start ? 'Present' : '');
          const location = role.location || '';
          const seniority = role.seniority_level || role.career_signal || 'Professional';
          const meta = [start, end].filter(Boolean).join(' - ');
          const detail = [meta, location, company].filter(Boolean).join(' ');

          return (
            <div key={`${company}-${roleTitle}-${idx}`} className="ct-event">
              <b>{roleTitle}</b>
              {detail ? <p>{detail}</p> : null}
              <span>{seniority}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {timeline.map((role, idx) => {
        const roleTitle = role.role_title || role.title || 'Role';
        const company = role.company_name || role.organization || '—';
        const start = role.start_date || role.period || '—';
        const end = role.end_date || '—';
        return (
          <div
            key={`${company}-${roleTitle}-${idx}`}
            className="relative border-l-2 border-indigo-200 pl-4 pb-4 last:pb-0"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-900">{roleTitle}</p>
                <p className="text-sm text-slate-600">{company}</p>
              </div>
              <span className="inline-flex items-center rounded-md border border-transparent bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                {start} → {end}
                {role.duration_months != null ? ` · ${role.duration_months}mo` : ''}
              </span>
            </div>
            {role.seniority_level ? (
              <p className="text-xs text-indigo-700 mt-1">{role.seniority_level}</p>
            ) : null}
            {role.career_signal ? <p className="text-xs text-slate-500 mt-1">{role.career_signal}</p> : null}
          </div>
        );
      })}
    </div>
  );
}
