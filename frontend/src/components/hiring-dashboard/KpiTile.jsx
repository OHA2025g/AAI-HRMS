import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { cn } from '../../lib/utils';
import Sparkline from './Sparkline';

const STATUS_RING = {
  ok: 'border-emerald-200 bg-emerald-50',
  watch: 'border-amber-200 bg-amber-50',
  critical: 'border-red-200 bg-red-50',
};

const ALERT_ICONS = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

export default function KpiTile({
  label,
  value,
  deltaPct,
  subtitle,
  icon: Icon,
  iconClassName,
  href,
  onClick,
  sparkline,
  sparklineColor = '#6366F1',
  compact = false,
}) {
  const inner = (
    <CardContent className={cn('p-4 md:p-5', compact && 'p-3')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p
            className={cn('text-slate-500 font-medium line-clamp-1', compact ? 'text-xs' : 'text-sm')}
            title={label}
          >
            {label}
          </p>
          <p
            className={cn('font-bold text-slate-900 mt-1', compact ? 'text-xl' : 'text-2xl md:text-3xl')}
            style={{ fontFamily: 'Outfit' }}
          >
            {value ?? '—'}
          </p>
          {!compact && sparkline ? <Sparkline values={sparkline} stroke={sparklineColor} className="mt-1" /> : null}
          {(deltaPct != null || (subtitle && !compact)) ? (
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
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
              {subtitle && !compact ? (
                <span className="text-xs text-slate-500 line-clamp-1" title={subtitle}>
                  {subtitle}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        {Icon ? (
          <KpiIconBox className={cn(iconClassName, compact && 'w-9 h-9')}>
            <Icon className={cn(compact ? 'w-4 h-4' : 'w-5 h-5')} />
          </KpiIconBox>
        ) : null}
      </div>
    </CardContent>
  );

  const cardClass = cn('card-hover', (href || onClick) && 'cursor-pointer');

  if (href) {
    return (
      <Link to={href} className="block">
        <Card className={cardClass}>{inner}</Card>
      </Link>
    );
  }

  return (
    <Card className={cardClass} onClick={onClick} role={onClick ? 'button' : undefined}>
      {inner}
    </Card>
  );
}

function KpiIconBox({ children, className }) {
  return (
    <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', className)}>
      {children}
    </div>
  );
}

export function HealthStrip({ score, status, asOf, windowDays, refetching, topAlerts = [], presentationMode = false }) {
  const alerts = (topAlerts || []).slice(0, 3);

  return (
    <Card className={cn('border', STATUS_RING[status] || STATUS_RING.watch)} data-testid="hiring-health-strip">
      <CardContent
        className={cn(
          'p-4 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4',
          presentationMode && 'p-6'
        )}
      >
        <div className="shrink-0">
          <p className="text-xs uppercase tracking-wide text-slate-600 font-medium">Hiring health</p>
          <p
            className={cn('font-bold text-slate-900', presentationMode ? 'text-4xl' : 'text-2xl')}
            style={{ fontFamily: 'Outfit' }}
          >
            {score}
            <span className={cn('font-normal text-slate-500', presentationMode ? 'text-xl' : 'text-base')}> / 100</span>
          </p>
          <div className="text-sm text-slate-600 mt-1">
            <p>Last {windowDays} days</p>
            {asOf ? <p className="text-xs text-slate-500">As of {new Date(asOf).toLocaleString()}</p> : null}
            {refetching ? <p className="text-xs text-indigo-600">Updating…</p> : null}
          </div>
        </div>

        {alerts.length > 0 ? (
          <div className="flex-1 min-w-0 border-t lg:border-t-0 lg:border-l border-slate-200/80 pt-3 lg:pt-0 lg:pl-4">
            <p className="text-xs uppercase tracking-wide text-slate-600 font-medium mb-2">Top alerts</p>
            <ul className="space-y-2" data-testid="health-strip-alerts">
              {alerts.map((alert) => {
                const Icon = ALERT_ICONS[alert.severity] || Info;
                const content = (
                  <span className="inline-flex items-start gap-2 text-sm text-slate-700 hover:text-indigo-700">
                    <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{alert.title}</span>
                  </span>
                );
                return (
                  <li key={alert.id}>
                    {alert.action_path ? (
                      <Link to={alert.action_path} data-testid="health-strip-alert-link">
                        {content}
                      </Link>
                    ) : (
                      content
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
