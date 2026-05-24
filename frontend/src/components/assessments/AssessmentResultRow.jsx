import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '../ui/badge';

export default function AssessmentResultRow({ submission }) {
  const [open, setOpen] = useState(false);
  const answers = submission?.answers || [];
  const hasAnswers = answers.length > 0;

  return (
    <>
      <tr
        className={`border-b border-slate-100 ${hasAnswers ? 'cursor-pointer hover:bg-slate-50' : ''}`}
        onClick={() => hasAnswers && setOpen((v) => !v)}
        data-testid={`result-row-${submission.id}`}
      >
        <td className="py-3">
          <div className="flex items-center gap-1">
            {hasAnswers ? (
              open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />
            ) : null}
            {submission.candidate_name}
          </div>
        </td>
        <td>{submission.assessment_title}</td>
        <td>{submission.score_pct != null ? `${submission.score_pct}%` : '—'}</td>
        <td>
          {submission.passed ? (
            <Badge className="bg-emerald-100 text-emerald-700">Pass</Badge>
          ) : (
            <Badge className="bg-red-100 text-red-700">Fail</Badge>
          )}
        </td>
        <td>{submission.completed_at ? new Date(submission.completed_at).toLocaleDateString() : '—'}</td>
      </tr>
      {open && hasAnswers ? (
        <tr className="bg-slate-50/80">
          <td colSpan={5} className="px-4 py-3">
            <p className="text-xs font-semibold text-slate-600 mb-2">Per-question breakdown</p>
            <div className="space-y-2">
              {answers.map((ans, idx) => (
                <div key={ans.question_id || idx} className="rounded border border-slate-200 bg-white p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-slate-800">{ans.question_text || `Question ${idx + 1}`}</p>
                    <div className="flex gap-2 text-xs">
                      {ans.marks_awarded != null && ans.max_marks != null ? (
                        <Badge variant="outline">
                          {ans.marks_awarded}/{ans.max_marks}
                        </Badge>
                      ) : null}
                      {ans.auto_scored != null ? (
                        <Badge variant="secondary">{ans.auto_scored ? 'Auto-scored' : 'Manual'}</Badge>
                      ) : null}
                    </div>
                  </div>
                  {ans.response != null && String(ans.response).trim() ? (
                    <p className="text-slate-600 mt-1 whitespace-pre-wrap">{String(ans.response)}</p>
                  ) : (
                    <p className="text-slate-400 mt-1 italic">No response recorded</p>
                  )}
                </div>
              ))}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
