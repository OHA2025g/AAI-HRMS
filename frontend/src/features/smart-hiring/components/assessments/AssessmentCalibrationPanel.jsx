import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';

export default function AssessmentCalibrationPanel({ calibration }) {
  if (!calibration) return null;
  const lowPass = calibration.low_pass_assessments || [];
  const stale = calibration.stale_unused_assessments || [];
  const hardest = calibration.hardest_questions || [];

  if (!lowPass.length && !stale.length && !hardest.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calibration insights</CardTitle>
          <CardDescription>Quality signals from scored submissions</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-500 py-6 text-center">
          No calibration alerts yet — score more submissions to populate insights.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="assessment-calibration-panel">
      <CardHeader>
        <CardTitle>Calibration insights</CardTitle>
        <CardDescription>Low pass rates, stale tests, and difficult questions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {lowPass.length > 0 ? (
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-2">Pass rate below 40%</h4>
            <ul className="space-y-2 text-sm">
              {lowPass.map((a) => (
                <li key={a.assessment_id} className="flex justify-between gap-2 border rounded-md p-2">
                  <span>{a.title}</span>
                  <Badge className="bg-red-100 text-red-700">{a.pass_rate_pct}% · {a.completed} scored</Badge>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {stale.length > 0 ? (
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-2">Unused for 30+ days</h4>
            <ul className="space-y-2 text-sm">
              {stale.map((a) => (
                <li key={a.assessment_id} className="flex justify-between gap-2 border rounded-md p-2">
                  <span>{a.title}</span>
                  <Badge variant="secondary">No invites</Badge>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {hardest.length > 0 ? (
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-2">Hardest questions</h4>
            <ul className="space-y-2 text-sm">
              {hardest.map((q) => (
                <li key={`${q.assessment_id}-${q.question_id}`} className="border rounded-md p-2">
                  <p className="font-medium text-slate-800">{q.assessment_title}</p>
                  <p className="text-slate-600 line-clamp-2">{q.question_text}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {q.pct_correct != null ? `${q.pct_correct}% correct` : '—'}
                    {q.flag ? ` · ${q.flag.replace(/_/g, ' ')}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
