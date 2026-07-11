import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { workflowAutomationAdminApi } from '@/shared/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Badge } from '@/shared/ui/badge';
import { Loader2, Play, Trash2, RefreshCw, PenLine } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

const AdminWorkflowAutomationPage = () => {
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState([]);
  const [runs, setRuns] = useState([]);
  const [baselines, setBaselines] = useState([]);

  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState('MANUAL');
  const [minPending, setMinPending] = useState('5');
  const [actionType, setActionType] = useState('NOOP');
  const [actionLimit, setActionLimit] = useState('50');
  const [maxRetries, setMaxRetries] = useState('3');
  const [scheduleIntervalMinutes, setScheduleIntervalMinutes] = useState('60');
  const [inboundWebhookSecret, setInboundWebhookSecret] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookMethod, setWebhookMethod] = useState('POST');

  const [blKey, setBlKey] = useState('REPROCESS_LIFECYCLE');
  const [blLabel, setBlLabel] = useState('Manual lifecycle triage');
  const [blMinutes, setBlMinutes] = useState('15');
  const [blRate, setBlRate] = useState('0');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, runRes, bRes] = await Promise.all([
        workflowAutomationAdminApi.listRules(),
        workflowAutomationAdminApi.listRuns({ limit: 30 }),
        workflowAutomationAdminApi.listBaselines(),
      ]);
      setRules(rRes.data || []);
      setRuns(runRes.data || []);
      setBaselines(bRes.data || []);
    } catch (e) {
      toast.error('Failed to load workflow automation');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onCreateRule = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    const trigger_config =
      triggerType === 'ON_LIFECYCLE_PENDING_THRESHOLD' ? { min_pending: Number(minPending) || 1 } : {};
    let action_config = {};
    if (actionType === 'REPROCESS_LIFECYCLE') {
      action_config = { limit: Number(actionLimit) || 50 };
    }
    if (actionType === 'NOTIFY_HR') {
      action_config = { title: 'Workflow fired', message: `Rule: ${name.trim()}` };
    }
    if (actionType === 'HTTP_WEBHOOK') {
      const url = webhookUrl.trim();
      if (!url.startsWith('https://')) {
        toast.error('HTTP_WEBHOOK requires an https:// URL');
        return;
      }
      action_config = { url, method: (webhookMethod || 'POST').toUpperCase() };
    }
    const body = {
      name: name.trim(),
      enabled: true,
      trigger_type: triggerType,
      trigger_config,
      action_type: actionType,
      action_config,
      max_retries: Number(maxRetries) || 3,
      retry_backoff_sec: 2,
    };
    if (triggerType === 'ON_SCHEDULE') {
      body.schedule_interval_minutes = Math.max(5, Math.min(10080, Number(scheduleIntervalMinutes) || 60));
    }
    if (triggerType === 'WEBHOOK_INBOUND') {
      body.inbound_webhook_secret = inboundWebhookSecret.trim();
    }
    try {
      const res = await workflowAutomationAdminApi.createRule(body);
      toast.success('Rule created');
      if (res.data?.inbound_webhook_path) {
        toast.info(`Inbound URL: ${res.data.inbound_webhook_path} — use X-Workflow-Token header`);
      }
      setName('');
      setInboundWebhookSecret('');
      setWebhookUrl('');
      await refresh();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Create failed');
    }
  };

  const onExecute = async (id) => {
    try {
      const res = await workflowAutomationAdminApi.executeRule(id);
      toast.success(`Run ${res.data?.status}: ${JSON.stringify(res.data?.detail || {})}`);
      await refresh();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Execute failed');
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this rule?')) return;
    try {
      await workflowAutomationAdminApi.deleteRule(id);
      toast.success('Deleted');
      await refresh();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Delete failed');
    }
  };

  const onDispatch = async () => {
    try {
      const res = await workflowAutomationAdminApi.dispatchTriggered();
      toast.success(`Dispatched: ${res.data?.executed ?? 0} executed, ${res.data?.skipped ?? 0} skipped`);
      if (res.data?.errors?.length) toast.info(res.data.errors.join('; '));
      await refresh();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Dispatch failed');
    }
  };

  const onCreateBaseline = async () => {
    try {
      await workflowAutomationAdminApi.createBaseline({
        workflow_key: blKey.trim().toUpperCase(),
        label: blLabel.trim(),
        minutes_per_run: Number(blMinutes) || 0,
        hourly_fully_loaded_cost_usd: Number(blRate) || 0,
      });
      toast.success('Baseline saved');
      await refresh();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Baseline save failed');
    }
  };

  const onDeleteBaseline = async (id) => {
    if (!window.confirm('Delete baseline?')) return;
    try {
      await workflowAutomationAdminApi.deleteBaseline(id);
      await refresh();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
            Workflow automation
          </h1>
          <p className="text-slate-600 mt-1">M7-1 — trigger / rule / action, retries, baselines for savings</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/workflow-automation/designer" className="inline-flex items-center">
              <PenLine className="w-4 h-4 mr-1" />
              Visual designer
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
          <Button variant="secondary" size="sm" onClick={onDispatch}>
            Dispatch (threshold + schedule)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Create rule</CardTitle>
            <CardDescription>
              MANUAL / inbound webhook: run via Execute or POST to inbound URL. Threshold + ON_SCHEDULE: also via Dispatch
              cron-loop.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nightly lifecycle sweep" />
            </div>
            <div>
              <Label>Trigger</Label>
              <Select value={triggerType} onValueChange={setTriggerType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">MANUAL</SelectItem>
                  <SelectItem value="ON_LIFECYCLE_PENDING_THRESHOLD">ON_LIFECYCLE_PENDING_THRESHOLD</SelectItem>
                  <SelectItem value="ON_SCHEDULE">ON_SCHEDULE</SelectItem>
                  <SelectItem value="WEBHOOK_INBOUND">WEBHOOK_INBOUND</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {triggerType === 'ON_LIFECYCLE_PENDING_THRESHOLD' ? (
              <div>
                <Label>Min pending events</Label>
                <Input value={minPending} onChange={(e) => setMinPending(e.target.value)} type="number" min={1} />
              </div>
            ) : null}
            {triggerType === 'ON_SCHEDULE' ? (
              <div>
                <Label>Interval (minutes, 5–10080)</Label>
                <Input
                  value={scheduleIntervalMinutes}
                  onChange={(e) => setScheduleIntervalMinutes(e.target.value)}
                  type="number"
                  min={5}
                  max={10080}
                />
              </div>
            ) : null}
            {triggerType === 'WEBHOOK_INBOUND' ? (
              <div>
                <Label>Inbound secret (min 8 chars, stored hashed)</Label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={inboundWebhookSecret}
                  onChange={(e) => setInboundWebhookSecret(e.target.value)}
                  placeholder="shared secret for X-Workflow-Token"
                />
              </div>
            ) : null}
            <div>
              <Label>Action</Label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOOP">NOOP</SelectItem>
                  <SelectItem value="REPROCESS_LIFECYCLE">REPROCESS_LIFECYCLE</SelectItem>
                  <SelectItem value="NOTIFY_HR">NOTIFY_HR</SelectItem>
                  <SelectItem value="HTTP_WEBHOOK">HTTP_WEBHOOK</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {actionType === 'HTTP_WEBHOOK' ? (
              <div className="space-y-2">
                <div>
                  <Label>HTTPS URL</Label>
                  <Input
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://partner.example.com/hook"
                  />
                </div>
                <div>
                  <Label>Method</Label>
                  <Select value={webhookMethod} onValueChange={setWebhookMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-slate-500">
                  Multi-step flows: use <Link className="underline" to="/admin/workflow-automation/designer">Workflow designer</Link>{' '}
                  to add nodes and webhook steps.
                </p>
              </div>
            ) : null}
            {actionType === 'REPROCESS_LIFECYCLE' ? (
              <div>
                <Label>Enqueue limit</Label>
                <Input value={actionLimit} onChange={(e) => setActionLimit(e.target.value)} type="number" min={1} />
              </div>
            ) : null}
            <div>
              <Label>Max retries</Label>
              <Input value={maxRetries} onChange={(e) => setMaxRetries(e.target.value)} type="number" min={1} max={8} />
            </div>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={onCreateRule}>Create rule</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manual baselines (M7-3)</CardTitle>
            <CardDescription>Map workflow_key (usually action_type) to minutes / hour cost.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>workflow_key</Label>
              <Input value={blKey} onChange={(e) => setBlKey(e.target.value)} />
            </div>
            <div>
              <Label>Label</Label>
              <Input value={blLabel} onChange={(e) => setBlLabel(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Minutes / run</Label>
                <Input value={blMinutes} onChange={(e) => setBlMinutes(e.target.value)} type="number" min={0} />
              </div>
              <div>
                <Label>Hourly cost USD</Label>
                <Input value={blRate} onChange={(e) => setBlRate(e.target.value)} type="number" min={0} />
              </div>
            </div>
            <Button variant="secondary" onClick={onCreateBaseline}>Save baseline</Button>
            <div className="text-xs text-slate-500 pt-2">
              Existing: {baselines.map((b) => (
                <Badge key={b.id} variant="outline" className="mr-1 mb-1 cursor-pointer" onClick={() => onDeleteBaseline(b.id)}>
                  {b.workflow_key} ({b.minutes_per_run}m) ×
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Flow</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-xs">{r.trigger_type}</TableCell>
                  <TableCell className="text-xs">{r.action_type}</TableCell>
                  <TableCell className="text-xs">
                    {r.flow_graph?.nodes?.length ? (
                      <Badge variant="outline">{r.flow_graph.nodes.length} nodes</Badge>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>{r.enabled ? <Badge>on</Badge> : <Badge variant="secondary">off</Badge>}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="secondary" asChild>
                      <Link
                        to={`/admin/workflow-automation/designer?ruleId=${encodeURIComponent(r.id)}`}
                        className="inline-flex items-center"
                      >
                        <PenLine className="w-3 h-3 mr-1" />
                        Design
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onExecute(r.id)}>
                      <Play className="w-3 h-3 mr-1" />
                      Run
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onDelete(r.id)}>
                      <Trash2 className="w-3 h-3 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-500">No rules yet</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent runs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Rule</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((x) => (
                <TableRow key={x.id}>
                  <TableCell className="text-xs whitespace-nowrap">{String(x.created_at || '').slice(0, 19)}</TableCell>
                  <TableCell className="text-xs">{x.rule_name || x.rule_id}</TableCell>
                  <TableCell>
                    <Badge variant={x.status === 'FAILED' ? 'destructive' : 'secondary'}>{x.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs max-w-md truncate">{JSON.stringify(x.detail || x.error || {})}</TableCell>
                </TableRow>
              ))}
              {runs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-slate-500">No runs yet</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminWorkflowAutomationPage;
