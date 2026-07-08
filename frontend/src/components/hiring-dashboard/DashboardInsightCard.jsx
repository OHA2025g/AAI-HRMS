import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { shortenInsightActionLabel } from '../../lib/insightActionLabel';

const SEVERITY_CLASS = {
  red: 'hd-insight-red',
  orange: 'hd-insight-orange',
  blue: 'hd-insight-blue',
  green: 'hd-insight-green',
};

export default function DashboardInsightCard({
  severity = 'blue',
  title,
  message,
  actionLabel,
  actionPath,
  llmPowered = false,
}) {
  return (
    <div className={cn('hd-insight-card', SEVERITY_CLASS[severity] || SEVERITY_CLASS.blue)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4>{title}</h4>
        {llmPowered ? (
          <span
            className="inline-flex shrink-0 items-center rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-700"
            data-testid="insight-card-llm-badge"
          >
            LLM
          </span>
        ) : null}
      </div>
      <p>{message}</p>
      {actionPath ? (
        <Link to={actionPath} className="hd-insight-mini-btn text-violet-700">
          {shortenInsightActionLabel(actionLabel || 'View Details')}
        </Link>
      ) : null}
    </div>
  );
}
