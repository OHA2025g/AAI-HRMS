import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';

const SEV = {
  high: { icon: AlertTriangle, className: 'border-rose-200 bg-rose-50/60' },
  medium: { icon: Info, className: 'border-amber-200 bg-amber-50/50' },
  low: { icon: Info, className: 'border-slate-200 bg-slate-50/50' },
};

export function ExecutiveInsightsPanel({ insights = [] }) {
  if (!insights.length) {
    return (
      <Card className="border-emerald-100 bg-emerald-50/30">
        <CardContent className="py-4 text-sm text-emerald-800">
          No critical alerts for the current scope and period.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="summary" data-testid="executive-insights-panel">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Needs attention</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {insights.map((item, i) => {
          const cfg = SEV[item.severity] || SEV.low;
          const Icon = cfg.icon;
          return (
            <div key={`${item.title}-${i}`} className={`rounded-lg border p-3 flex gap-3 ${cfg.className}`}>
              <Icon className="h-5 w-5 shrink-0 mt-0.5 text-slate-700" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 text-sm">{item.title}</p>
                <p className="text-xs text-slate-600 mt-0.5">{item.body}</p>
                {item.link_path ? (
                  <Button asChild variant="link" className="h-auto p-0 mt-1 text-indigo-600 text-xs">
                    <Link to={item.link_path}>
                      View details <ArrowRight className="h-3 w-3 ml-0.5 inline" />
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
