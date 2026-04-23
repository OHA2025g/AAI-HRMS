import React, { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { employeeSatisfactionEngagementApi } from '../lib/api';
import { useEngagementPermissions } from './useEngagementPermissions';
import { useAuth } from '../context/AuthContext';

export default function EseCopilotPage() {
  const { user } = useAuth();
  const perm = useEngagementPermissions(user);
  const [q, setQ] = useState('');
  const [ans, setAns] = useState('');
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!perm.canAi) {
      toast.error('AI engagement features require admin or HR admin.');
      return;
    }
    setLoading(true);
    try {
      const res = await employeeSatisfactionEngagementApi.copilotQuery({ query: q });
      setAns(res.data?.answer || JSON.stringify(res.data));
      toast.success('Query recorded');
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Copilot failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Engagement Copilot</h1>
        <p className="text-sm text-muted-foreground">Ask for intervention ideas and experience insights (demo).</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Natural language</CardTitle>
          <CardDescription>Requires engagement AI permission (admin / hr_admin).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ese-q">Question</Label>
            <Textarea id="ese-q" value={q} onChange={(e) => setQ(e.target.value)} rows={4} placeholder="How can we improve manager connect in Engineering?" />
          </div>
          <Button onClick={run} disabled={loading || !q.trim()}>
            {loading ? 'Running…' : 'Run'}
          </Button>
          {ans ? (
            <div className="rounded-md border bg-muted/40 p-3 text-sm whitespace-pre-wrap">{ans}</div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
