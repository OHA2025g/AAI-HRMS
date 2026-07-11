import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog';
import {
  ASSESSMENT_FEATURE_FLAG_LABELS,
  ASSESSMENT_KPI_META,
} from '@/shared/config/assessmentKpiConfig';

export default function AssessmentMetricGlossary({ featureFlags = null, commandStyle = false }) {
  const [open, setOpen] = useState(false);
  const entries = Object.entries(ASSESSMENT_KPI_META);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {commandStyle ? (
          <button
            type="button"
            className="as-btn"
            data-testid="assessment-metric-glossary-btn"
            aria-label="Open assessment metrics glossary"
          >
            ⓘ Metric glossary
          </button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            data-testid="assessment-metric-glossary-btn"
            aria-label="Open assessment metrics glossary"
          >
            <HelpCircle className="w-4 h-4" />
            Metric glossary
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white border-slate-200">
        <DialogHeader>
          <DialogTitle>Assessment metrics glossary</DialogTitle>
          <DialogDescription>
            Definitions for KPI tiles and charts on the Assessments Command Center.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm bg-white">
          <thead>
            <tr className="text-left text-slate-500 border-b">
              <th className="pb-2 pr-4 font-medium">Metric</th>
              <th className="pb-2 pr-4 font-medium">Definition</th>
              <th className="pb-2 font-medium">Formula</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([key, meta]) => (
              <tr key={key} className="border-b border-slate-100 align-top">
                <td className="py-2 pr-4 font-medium text-slate-900">{meta.label}</td>
                <td className="py-2 pr-4 text-slate-600">{meta.definition}</td>
                <td className="py-2 text-slate-500 font-mono text-xs">{meta.formula}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {featureFlags ? (
          <div className="mt-6 pt-4 border-t">
            <h4 className="text-sm font-semibold text-slate-900 mb-2">Feature flags</h4>
            <ul className="space-y-1 text-sm">
              {Object.entries(featureFlags).map(([key, enabled]) => (
                <li key={key} className="flex items-center justify-between gap-4">
                  <span className="text-slate-600">
                    {ASSESSMENT_FEATURE_FLAG_LABELS[key] || key}
                  </span>
                  <span className={enabled ? 'text-emerald-600' : 'text-slate-400'}>
                    {enabled ? 'On' : 'Off'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
