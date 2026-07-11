import React, { useEffect, useState } from 'react';
import { assessmentsApi } from '@/shared/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Loader2 } from 'lucide-react';

function formatAction(action) {
  return (action || '').replace(/_/g, ' ');
}

export default function AssessmentAuditLogPanel({ assessmentId = null }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    assessmentsApi
      .auditLog(assessmentId ? { assessment_id: assessmentId, limit: 100 } : { limit: 100 })
      .then((res) => {
        if (!cancelled) setRows(res.data || []);
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
  }, [assessmentId]);

  return (
    <Card data-testid="assessment-audit-log-panel">
      <CardHeader>
        <CardTitle>Activity log</CardTitle>
        <CardDescription>Invites, grading, archive, and email events</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">No audit events yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="pb-2">When</th>
                <th className="pb-2">Action</th>
                <th className="pb-2">Actor</th>
                <th className="pb-2">Assessment</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="py-2 text-slate-600 whitespace-nowrap">
                    {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
                  </td>
                  <td className="py-2 capitalize">{formatAction(row.action)}</td>
                  <td className="py-2">{row.actor_name || row.actor_id || 'System'}</td>
                  <td className="py-2 font-mono text-xs text-slate-500 truncate max-w-[120px]">
                    {row.assessment_id ? row.assessment_id.slice(0, 8) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
