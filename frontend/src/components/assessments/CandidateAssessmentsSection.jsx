import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { assessmentsApi } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Loader2 } from 'lucide-react';
import CopyTakeLinkButton from './CopyTakeLinkButton';

export default function CandidateAssessmentsSection({ candidateId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!candidateId) return;
    let cancelled = false;
    setLoading(true);
    assessmentsApi
      .listSubmissions({ candidate_id: candidateId, limit: 50 })
      .then((r) => {
        if (!cancelled) setRows(Array.isArray(r.data) ? r.data : []);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [candidateId]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!rows.length) {
    return <p className="text-sm text-slate-500 py-6">No assessment submissions for this candidate.</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assessment history</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b">
              <th className="pb-2">Assessment</th>
              <th className="pb-2">Job</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Score</th>
              <th className="pb-2">Pass</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-b border-slate-100">
                <td className="py-3">{s.assessment_title}</td>
                <td>{s.job_title}</td>
                <td>
                  <Badge variant="secondary">{s.status}</Badge>
                </td>
                <td>{s.score_pct != null ? `${s.score_pct}%` : '—'}</td>
                <td>
                  {s.passed == null ? (
                    '—'
                  ) : s.passed ? (
                    <Badge className="bg-emerald-100 text-emerald-700">Pass</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-700">Fail</Badge>
                  )}
                </td>
                <td className="space-x-2">
                  {s.take_url && s.status !== 'SCORED' ? <CopyTakeLinkButton takeUrl={s.take_url} /> : null}
                  <Link to={`/assessments?tab=results`}>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
