import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

export default function HiringQuickActions({ alerts = [] }) {
  const primary = alerts.find((a) => a.severity === 'critical') || alerts[0];
  if (!primary?.action_path) {
    return null;
  }

  return (
    <Card className="border-indigo-100 bg-indigo-50/40" role="region" aria-label="Suggested hiring action">
      <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-indigo-700 font-medium">Suggested action</p>
          <p className="text-sm font-semibold text-slate-900">{primary.title}</p>
          <p className="text-xs text-slate-600 mt-0.5">{primary.message}</p>
        </div>
        <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-700 shrink-0">
          <Link to={primary.action_path}>
            Take action
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
