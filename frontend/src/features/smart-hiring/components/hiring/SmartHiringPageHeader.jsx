import React from 'react';
import { cn } from '@/shared/lib/utils';

/**
 * Shared title + actions layout for Smart Hiring operational pages.
 */
export function SmartHiringPageHeader({
  title,
  description,
  testId,
  actions,
  filters,
  meta,
  className,
}) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-4', className)} data-testid="smart-hiring-page-header">
      <div className="space-y-3 min-w-0 flex-1">
        <div>
          <h1
            className="text-2xl md:text-3xl font-bold text-slate-900"
            style={{ fontFamily: 'Outfit' }}
            data-testid={testId}
          >
            {title}
          </h1>
          {description ? <p className="text-slate-600 mt-1">{description}</p> : null}
        </div>
        {filters}
        {meta}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
      ) : null}
    </div>
  );
}

export default SmartHiringPageHeader;
