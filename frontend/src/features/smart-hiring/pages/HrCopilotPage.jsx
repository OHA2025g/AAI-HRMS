import React, { useState } from 'react';
import { toast } from 'sonner';
import { hrCopilotApi } from '@/shared/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Textarea } from '@/shared/ui/textarea';
import { Loader2 } from 'lucide-react';

const HrCopilotPage = () => {
  const [message, setMessage] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [sending, setSending] = useState(false);
  const [lastReply, setLastReply] = useState(null);

  const send = async () => {
    const m = message.trim();
    if (!m) {
      toast.error('Enter a message');
      return;
    }
    setSending(true);
    try {
      const res = await hrCopilotApi.chat({
        message: m,
        session_id: sessionId || undefined,
      });
      const data = res.data || {};
      setLastReply(data);
      if (data.session_id) setSessionId(data.session_id);
      setMessage('');
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Chat failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>HR Copilot</h1>
        <p className="text-slate-600 mt-1">M7-2 — intent routing, permission checks, audited turns</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Message</CardTitle>
          <CardDescription>
            Try: “automation status”, “reprocess lifecycle events”, “lookup employee E1234”, or “help”.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask in natural language…"
            disabled={sending}
          />
          <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={send} disabled={sending}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Send
          </Button>
          {sessionId ? (
            <p className="text-xs text-slate-500">Session: {sessionId.slice(0, 8)}…</p>
          ) : null}
        </CardContent>
      </Card>

      {lastReply ? (
        <Card>
          <CardHeader>
            <CardTitle>Reply</CardTitle>
            <CardDescription>
              Intent: {lastReply.intent}
              {lastReply.intent_source ? ` · source: ${lastReply.intent_source}` : ''}
              {lastReply.hf_model ? ` · HF: ${lastReply.hf_model}` : ''}
              {lastReply.hf_score != null ? ` (score ${lastReply.hf_score})` : ''}
              {' · audit '}{lastReply.audit_id?.slice(0, 8)}…
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <pre className="whitespace-pre-wrap text-sm text-slate-800 bg-slate-50 rounded-md p-4 border">
              {lastReply.reply}
            </pre>
            {lastReply.actions?.length ? (
              <div className="text-xs text-slate-600">
                <span className="font-semibold">Actions: </span>
                {JSON.stringify(lastReply.actions)}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default HrCopilotPage;
