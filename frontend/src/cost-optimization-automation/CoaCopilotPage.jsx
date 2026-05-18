import React, { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { costOptimizationModuleApi } from '../lib/api';

export default function CoaCopilotPage() {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState(null);

  const ask = async () => {
    if (!q.trim()) return toast.error('Enter a query');
    setLoading(true);
    try {
      const res = await costOptimizationModuleApi.copilotQuery({
        query_text: q.trim(),
        query_type: 'cost',
        source_type: 'ui',
        is_mock: true,
      });
      setResp(res.data || null);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Copilot query failed');
    } finally {
      setLoading(false);
    }
  };

  const answer = resp?.response_payload?.answer;
  const drills = resp?.response_payload?.suggested_drilldowns || [];

  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl font-semibold">AI Copilot — Cost & Automation</div>
        <div className="text-sm text-muted-foreground">
          Mock contract with persisted audit trail; swap for LLM in production
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Ask a question</CardTitle>
          <CardDescription>Examples: “Where is spend trending up?”, “Top automation ROI?”</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type your cost / automation question…" />
          <Button onClick={ask} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Ask
          </Button>
        </CardContent>
      </Card>

      {resp ? (
        <Card>
          <CardHeader>
            <CardTitle>Response</CardTitle>
            <CardDescription>Query ID: {resp.query_id || resp.id}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">{answer || '—'}</div>
            <div className="flex flex-wrap gap-2">
              {drills.map((d) => (
                <Badge key={d.path} variant="secondary">
                  {d.label} · {d.path}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
