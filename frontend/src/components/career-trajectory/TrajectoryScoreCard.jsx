import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { cn } from '@/lib/utils';

export function TrajectoryScoreCard({ label, scoreData, highlightRisk, onExplain }) {
  const score = scoreData?.score ?? 0;
  const color =
    highlightRisk
      ? score >= 60
        ? 'text-rose-600'
        : score >= 35
          ? 'text-amber-600'
          : 'text-emerald-600'
      : score >= 80
        ? 'text-emerald-600'
        : score >= 60
          ? 'text-indigo-600'
          : score >= 40
            ? 'text-amber-600'
            : 'text-rose-600';

  return (
    <Card className="h-full border-slate-200/80 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={cn('text-3xl font-bold', color)} style={{ fontFamily: 'Outfit' }}>
          {Math.round(score)}%
        </p>
        {scoreData?.risk_level ? (
          <p className="text-xs text-slate-500 mt-1">Risk: {scoreData.risk_level}</p>
        ) : null}
        {scoreData?.explanation ? (
          <p className="text-xs text-slate-600 mt-2 line-clamp-3">{scoreData.explanation}</p>
        ) : null}
        {scoreData?.confidence ? (
          <p className="text-[10px] uppercase tracking-wide text-slate-400 mt-2">Confidence: {scoreData.confidence}</p>
        ) : null}
        {onExplain ? (
          <button
            type="button"
            onClick={onExplain}
            aria-label={`View explainability for ${label}`}
            className="text-xs text-indigo-600 hover:underline mt-2"
          >
            View explainability
          </button>
        ) : null}
      </CardContent>
    </Card>
  );
}
