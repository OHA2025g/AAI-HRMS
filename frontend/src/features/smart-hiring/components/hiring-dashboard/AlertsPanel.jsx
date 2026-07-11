import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Info, AlertCircle, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';

const SEVERITY = {
  critical: { icon: AlertCircle, ring: 'border-red-200 bg-red-50/50', text: 'text-red-700' },
  warning: { icon: AlertTriangle, ring: 'border-amber-200 bg-amber-50/50', text: 'text-amber-700' },
  info: { icon: Info, ring: 'border-slate-200 bg-slate-50', text: 'text-slate-700' },
};

export default function AlertsPanel({ alerts = [], dismissedIds = [], onDismiss }) {
  const visible = useMemo(
    () => alerts.filter((a) => a?.id && !dismissedIds.includes(a.id)),
    [alerts, dismissedIds]
  );

  if (!visible.length) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold" style={{ fontFamily: 'Outfit' }}>
            Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-500 py-6 text-center">No active alerts — pipeline looks healthy.</CardContent>
      </Card>
    );
  }

  return (
    <Card role="region" aria-label="Hiring alerts">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold" style={{ fontFamily: 'Outfit' }}>
          Alerts ({visible.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {visible.map((alert) => {
          const cfg = SEVERITY[alert.severity] || SEVERITY.info;
          const Icon = cfg.icon;
          return (
            <div key={alert.id} className={cn('rounded-lg border p-3 flex gap-3', cfg.ring)}>
              <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', cfg.text)} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm font-medium', cfg.text)}>{alert.title}</p>
                <p className="text-xs text-slate-600 mt-0.5">{alert.message}</p>
                {alert.action_path ? (
                  <Button asChild variant="link" size="sm" className="h-auto p-0 mt-1 text-indigo-600">
                    <Link to={alert.action_path} data-testid="hiring-alert-link">
                      View details
                    </Link>
                  </Button>
                ) : null}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {alert.count != null ? (
                  <span className="text-sm font-semibold text-slate-700">{alert.count}</span>
                ) : null}
                <button
                  type="button"
                  className="text-slate-400 hover:text-slate-600 p-1"
                  aria-label={`Dismiss alert: ${alert.title}`}
                  onClick={() => onDismiss?.(alert.id)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
