import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

export function ExecutiveNarrativePanel({ narrative }) {
  if (!narrative?.summary && !(narrative?.bullets || []).length) return null;

  return (
    <Card data-testid="executive-narrative-panel">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Executive narrative</CardTitle>
        <CardDescription>
          Rule-based summary for leadership review — derived from current KPIs, trends, and insights.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-700">
        {narrative.summary ? <p className="leading-relaxed">{narrative.summary}</p> : null}
        {(narrative.bullets || []).length ? (
          <ul className="list-disc pl-5 space-y-1.5">
            {narrative.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
