import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet';
import { Badge } from '@/shared/ui/badge';

export function ExplainabilityDrawer({ open, onOpenChange, label, scoreData }) {
  if (!scoreData) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{label}</SheetTitle>
          <SheetDescription>Evidence-based score breakdown from CV parsing</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4 text-sm">
          <p className="text-3xl font-bold text-indigo-700" style={{ fontFamily: 'Outfit' }}>
            {Math.round(scoreData.score ?? 0)}%
          </p>
          {scoreData.confidence ? (
            <Badge variant="outline">Confidence: {scoreData.confidence}</Badge>
          ) : null}
          {scoreData.explanation ? (
            <div>
              <p className="font-medium text-slate-800 mb-1">Explanation</p>
              <p className="text-slate-600">{scoreData.explanation}</p>
            </div>
          ) : null}
          {(scoreData.positive_drivers || []).length > 0 ? (
            <div>
              <p className="font-medium text-emerald-800 mb-1">Positive drivers</p>
              <ul className="list-disc list-inside text-slate-600 space-y-1">
                {scoreData.positive_drivers.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {(scoreData.negative_drivers || []).length > 0 ? (
            <div>
              <p className="font-medium text-amber-800 mb-1">Negative drivers</p>
              <ul className="list-disc list-inside text-slate-600 space-y-1">
                {scoreData.negative_drivers.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {(scoreData.feature_contributions || []).length > 0 ? (
            <div>
              <p className="font-medium text-slate-800 mb-1">Feature contributions</p>
              <ul className="text-slate-600 space-y-1 font-mono text-xs">
                {scoreData.feature_contributions.map((c, i) => (
                  <li key={i}>
                    {c.feature}: {String(c.value)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {(scoreData.missing_evidence || []).length > 0 ? (
            <div>
              <p className="font-medium text-slate-800 mb-1">Missing evidence</p>
              <ul className="list-disc list-inside text-slate-600 space-y-1">
                {scoreData.missing_evidence.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
