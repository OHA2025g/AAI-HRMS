import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui/button';

export default function DashboardActionStrip({ title, message, actionLabel = 'Take action →', actionPath, secondaryLabel, onSecondary }) {
  if (!title && !message) return null;
  return (
    <div className="hd-glass-card p-5 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-violet-50 to-sky-50 border-violet-200">
      <div className="min-w-0">
        <h3 className="font-bold text-slate-900">{title}</h3>
        {message ? <p className="text-sm text-slate-600 mt-1">{message}</p> : null}
      </div>
      <div className="flex gap-2 shrink-0">
        {secondaryLabel ? (
          <Button variant="outline" size="sm" onClick={onSecondary}>
            {secondaryLabel}
          </Button>
        ) : null}
        {actionPath ? (
          <Button size="sm" className="bg-violet-600 hover:bg-violet-700" asChild>
            <Link to={actionPath}>{actionLabel}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
