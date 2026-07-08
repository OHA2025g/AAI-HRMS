import React from 'react';
import { cn } from '../../lib/utils';

const OPTIONS = [
  { days: 7, label: '7d', mockLabel: 'Last 7 days' },
  { days: 30, label: '30d', mockLabel: 'Last 30 days' },
  { days: 90, label: '90d', mockLabel: 'Last 90 days' },
];

export default function PeriodToggle({ value, onChange, disabled, variant = 'default' }) {
  if (variant === 'overview-mock') {
    const active = OPTIONS.find((o) => o.days === value) || OPTIONS[1];
    const nextIndex = (OPTIONS.findIndex((o) => o.days === value) + 1) % OPTIONS.length;
    return (
      <button
        type="button"
        disabled={disabled}
        className="btn"
        onClick={() => onChange(OPTIONS[nextIndex].days)}
        data-testid="overview-period-btn"
      >
        📅 {active.mockLabel}
      </button>
    );
  }

  if (variant === 'pill-mock') {
    return (
      <div className="inline-flex items-center gap-2">
        {OPTIONS.map(({ days, label }) => (
          <button
            key={days}
            type="button"
            disabled={disabled}
            className="btn"
            style={value === days ? { color: '#4f46e5', background: '#f5f3ff' } : undefined}
            onClick={() => onChange(days)}
          >
            {label}
          </button>
        ))}
      </div>
    );
  }

  if (variant === 'pill') {
    return (
      <div className="inline-flex items-center gap-2">
        {OPTIONS.map(({ days, label }) => (
          <button
            key={days}
            type="button"
            disabled={disabled}
            className={cn('hd-btn', value === days && 'hd-btn-active')}
            onClick={() => onChange(days)}
          >
            {label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
      {OPTIONS.map(({ days, label }) => (
        <button
          key={days}
          type="button"
          disabled={disabled}
          className={cn(
            'h-8 px-3 text-xs font-medium rounded-md transition-colors',
            value === days ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:text-slate-900'
          )}
          onClick={() => onChange(days)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
