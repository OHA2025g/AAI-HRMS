import React from 'react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

const OPTIONS = [
  { days: 7, label: '7d' },
  { days: 30, label: '30d' },
  { days: 90, label: '90d' },
];

export default function PeriodToggle({ value, onChange, disabled }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
      {OPTIONS.map(({ days, label }) => (
        <Button
          key={days}
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          className={cn(
            'h-8 px-3 text-xs font-medium rounded-md',
            value === days ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:text-slate-900'
          )}
          onClick={() => onChange(days)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
