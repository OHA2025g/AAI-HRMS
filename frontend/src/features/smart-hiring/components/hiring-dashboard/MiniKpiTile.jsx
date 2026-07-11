import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/shared/ui/card';
import { cn } from '@/shared/lib/utils';

/** Compact KPI tile for secondary hiring metrics (Phase 3.10 / 3.11). */
export default function MiniKpiTile({
  label,
  value,
  deltaPct,
  subtitle,
  icon: Icon,
  iconClassName,
  href,
  testId,
}) {
  const inner = (
    <CardContent className="p-3 md:p-4">
      <div className="flex items-start gap-3">
        {Icon ? (
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', iconClassName)}>
            <Icon className="w-4 h-4" />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-500 font-medium">{label}</p>
          <p className="text-lg md:text-xl font-bold text-slate-900 mt-0.5" style={{ fontFamily: 'Outfit' }}>
            {value ?? '—'}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {deltaPct != null ? (
              <span
                className={cn(
                  'text-xs font-medium',
                  deltaPct > 0 ? 'text-emerald-600' : deltaPct < 0 ? 'text-red-600' : 'text-slate-500'
                )}
              >
                {deltaPct > 0 ? '+' : ''}
                {deltaPct}%
              </span>
            ) : null}
            {subtitle ? <span className="text-xs text-slate-500">{subtitle}</span> : null}
          </div>
        </div>
      </div>
    </CardContent>
  );

  const card = (
    <Card className={cn('card-hover h-full', href && 'cursor-pointer')} data-testid={testId}>
      {inner}
    </Card>
  );

  if (href) {
    return (
      <Link to={href} className="block h-full">
        {card}
      </Link>
    );
  }

  return card;
}
