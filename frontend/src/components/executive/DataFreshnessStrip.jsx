import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

export function DataFreshnessStrip({ freshness }) {
  const checks = freshness?.checks || [];
  if (!checks.length) return null;

  const allOk = checks.every((c) => c.sla_ok);

  return (
    <Card className={allOk ? 'border-emerald-100' : 'border-amber-200 bg-amber-50/30'}>
      <CardHeader className="py-3 pb-0">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {allOk ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-amber-600" />}
          Data freshness
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2 pt-2 pb-3">
        <TooltipProvider>
          {checks.map((c) => (
            <Tooltip key={c.source}>
              <TooltipTrigger asChild>
                <Badge variant={c.sla_ok ? 'outline' : 'destructive'} className="cursor-default">
                  {c.source.replace(/_/g, ' ')}: {c.sla_ok ? 'OK' : 'STALE'}
                  {c.age_hours != null ? ` (${c.age_hours}h)` : ''}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                SLA max {c.sla_max_age_hours}h · Last event {c.last_event_at || 'unknown'}
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
