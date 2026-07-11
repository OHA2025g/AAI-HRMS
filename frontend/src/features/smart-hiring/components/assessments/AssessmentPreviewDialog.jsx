import React, { useEffect, useState } from 'react';
import { assessmentsApi } from '@/shared/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import AssessmentAuditLogPanel from './AssessmentAuditLogPanel';
import AssessmentVersionHistoryPanel from './AssessmentVersionHistoryPanel';

export default function AssessmentPreviewDialog({ open, assessmentId, onOpenChange }) {
  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [itemRows, setItemRows] = useState([]);
  const [itemLoading, setItemLoading] = useState(false);

  useEffect(() => {
    if (!open || !assessmentId) return;
    let cancelled = false;
    setLoading(true);
    setAssessment(null);
    setItemRows([]);
    (async () => {
      try {
        const res = await assessmentsApi.get(assessmentId);
        if (!cancelled) setAssessment(res.data || null);
      } catch (e) {
        toast.error(e.response?.data?.detail || 'Failed to load assessment');
        onOpenChange(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, assessmentId, onOpenChange]);

  const loadItemAnalysis = async () => {
    if (!assessmentId || itemRows.length) return;
    setItemLoading(true);
    try {
      const res = await assessmentsApi.itemAnalysis(assessmentId);
      setItemRows(res.data || []);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to load item analysis');
    } finally {
      setItemLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'Outfit' }}>{assessment?.title || 'Assessment Preview'}</DialogTitle>
          <DialogDescription>
            {assessment?.questions?.length ?? 0} questions · {assessment?.duration_minutes ?? '—'} min ·{' '}
            {assessment?.total_marks ?? '—'} marks
            {assessment?.rubric?.pass_threshold != null ? ` · Pass ${assessment.rubric.pass_threshold}%` : ''}
            {assessment?.version != null ? ` · v${assessment.version}` : ''}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : assessment ? (
          <Tabs defaultValue="questions" onValueChange={(v) => v === 'insights' && loadItemAnalysis()}>
            <TabsList>
              <TabsTrigger value="questions">Questions</TabsTrigger>
              <TabsTrigger value="insights">Item analysis</TabsTrigger>
              <TabsTrigger value="history" data-testid="assessment-preview-history-tab">History</TabsTrigger>
            </TabsList>
            <TabsContent value="questions" className="space-y-4 max-h-[70vh] overflow-auto pr-2 mt-4">
              {(assessment.questions || []).map((q, idx) => (
                <Card key={q.id || idx}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex justify-between gap-2">
                      <span>Q{idx + 1}. {q.question_text}</span>
                      <Badge variant="secondary">
                        {q.question_type} · {q.max_marks ?? 10} marks · {q.difficulty || 'MEDIUM'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {Array.isArray(q.options) && q.options.length ? (
                      <ol className="list-decimal pl-5 text-sm">
                        {q.options.map((o, i) => (
                          <li key={i}>{o}</li>
                        ))}
                      </ol>
                    ) : (
                      <p className="text-sm text-slate-500">Free response</p>
                    )}
                    {q.skill_tested ? <p className="text-xs text-slate-500 mt-2">Skill: {q.skill_tested}</p> : null}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
            <TabsContent value="insights" className="mt-4 max-h-[70vh] overflow-auto">
              {itemLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
              ) : itemRows.length ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b">
                      <th className="pb-2">Question</th>
                      <th className="pb-2">Attempts</th>
                      <th className="pb-2">% correct</th>
                      <th className="pb-2">Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemRows.map((row) => (
                      <tr key={row.question_id} className="border-b border-slate-100">
                        <td className="py-2 pr-2 max-w-xs truncate">{row.question_text}</td>
                        <td>{row.attempts}</td>
                        <td>{row.pct_correct != null ? `${row.pct_correct}%` : '—'}</td>
                        <td>
                          {row.flag === 'too_hard' ? (
                            <Badge className="bg-red-100 text-red-700">Too hard</Badge>
                          ) : row.flag === 'too_easy' ? (
                            <Badge className="bg-amber-100 text-amber-800">Too easy</Badge>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-slate-500 py-8 text-center">
                  Score more submissions to populate item analysis
                </p>
              )}
            </TabsContent>
            <TabsContent value="history" className="mt-4 max-h-[70vh] overflow-auto space-y-4">
              <AssessmentVersionHistoryPanel assessmentId={assessmentId} />
              <AssessmentAuditLogPanel assessmentId={assessmentId} />
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
