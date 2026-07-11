import React from 'react';
import {
  AlertTriangle,
  Heart,
  HelpCircle,
  Shield,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip';
import { formatDelta, statusBorderClass } from '@/shared/config/executiveKpiConfig';
import { cn } from '@/shared/lib/utils';

const ICONS = {
  users: Users,
  trending: TrendingUp,
  target: Target,
  alert: AlertTriangle,
  heart: Heart,
  shield: Shield,
};

export function ExecutiveKpiTile({
  label,
  value,
  hint,
  status = 'ok',
  icon = 'users',
  delta,
  definition,
  onClick,
  className,
}) {
  const Icon = ICONS[icon] || Users;
  const deltaStr = formatDelta(delta?.delta_pct);
  const deltaUp = delta?.delta_pct != null && Number(delta.delta_pct) > 0;

  const defBody = definition ? (
    <div className="max-w-xs space-y-1 text-left">
      <p className="font-medium">{definition.name || label}</p>
      {definition.description ? <p className="opacity-90">{definition.description}</p> : null}
      {definition.formula ? <p className="opacity-75 text-[10px]">Formula: {definition.formula}</p> : null}
      {definition.owner_role ? (
        <p className="opacity-75 text-[10px]">Owner: {definition.owner_role}</p>
      ) : null}
    </div>
  ) : null;

  return (
    <Card
      className={cn(
        'card-hover transition-shadow',
        statusBorderClass(status),
        onClick && 'cursor-pointer',
        className,
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p className="text-sm text-slate-500 font-medium truncate">{label}</p>
              {definition ? (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="text-slate-400 hover:text-slate-600"
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`About ${label}`}
                      >
                        <HelpCircle className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-slate-900 text-white max-w-sm">
                      {defBody}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : null}
            </div>
            <p className="text-2xl md:text-3xl font-bold text-slate-900 mt-1" style={{ fontFamily: 'Outfit' }}>
              {value ?? '—'}
            </p>
            {deltaStr ? (
              <div
                className={cn(
                  'flex items-center gap-1 mt-2 text-xs font-medium',
                  deltaUp ? 'text-rose-600' : 'text-emerald-600',
                )}
              >
                {deltaUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                <span>{deltaStr} vs prior snapshot</span>
              </div>
            ) : null}
            {hint ? <p className="text-xs text-slate-500 mt-2">{hint}</p> : null}
          </div>
          <div
            className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
              status === 'critical'
                ? 'bg-rose-100 text-rose-600'
                : status === 'warn'
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-indigo-100 text-indigo-600',
            )}
          >
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
