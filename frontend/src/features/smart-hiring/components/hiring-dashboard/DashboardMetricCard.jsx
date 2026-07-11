import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/shared/lib/utils';
import DashboardGlassCard from './DashboardGlassCard';
import Sparkline from './Sparkline';
import { formatDelta } from '@/shared/hooks/useHiringDashboard';

export default function DashboardMetricCard({
  label,
  value,
  valueNode,
  deltaPct,
  subtitle,
  subtitleClassName,
  href,
  sparkline,
  sparklineVariant,
  sparklineColor = '#6d4cff',
  windowDays = 30,
  className,
  testId,
}) {
  const delta = formatDelta(deltaPct, windowDays);
  const inner = (
    <DashboardGlassCard
      className={cn('hd-kpi-card hd-kpi-tile', href && 'cursor-pointer hover:shadow-lg transition-shadow', className)}
      data-testid={testId}
    >
      <p className="hd-kpi-label">{label}</p>
      {valueNode ?? (
        <p className="hd-kpi-num" style={{ fontFamily: 'Outfit, Inter, sans-serif' }}>
          {value ?? '—'}
        </p>
      )}
      {delta ? (
        <p
          className={cn(
            'mt-2',
            deltaPct > 0 ? 'hd-kpi-delta-up' : deltaPct < 0 ? 'hd-kpi-delta-down' : 'text-slate-500 text-[13px]'
          )}
        >
          {deltaPct > 0 ? '↑' : deltaPct < 0 ? '↓' : ''} {delta}
        </p>
      ) : subtitle ? (
        <p className={cn('text-[13px] mt-2', subtitleClassName || 'text-slate-500')}>{subtitle}</p>
      ) : null}
      {sparklineVariant === 'mock-gradient' ? (
        <div className="hd-kpi-spark-mock" aria-hidden />
      ) : null}
      {sparkline?.length && sparklineVariant !== 'mock-gradient' ? (
        <Sparkline values={sparkline} stroke={sparklineColor} className="mt-3 h-7" />
      ) : null}
    </DashboardGlassCard>
  );
  if (href) return <Link to={href}>{inner}</Link>;
  return inner;
}
