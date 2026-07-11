import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toast } from 'sonner';
import { workflowAutomationAdminApi } from '@/shared/lib/api';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Input } from '@/shared/ui/input';
import { Loader2 } from 'lucide-react';

const defaultFlow = (rule) => {
  const at = rule?.action_type || 'NOOP';
  return {
    nodes: [
      {
        id: 'trigger',
        type: 'input',
        position: { x: 40, y: 120 },
        data: { label: `Trigger: ${rule?.trigger_type || 'MANUAL'}` },
      },
      {
        id: 'action-1',
        position: { x: 320, y: 100 },
        data: {
          label: `Action: ${at}`,
          action_type: at,
          action_config: rule?.action_config && typeof rule.action_config === 'object' ? { ...rule.action_config } : {},
        },
      },
    ],
    edges: [
      {
        id: 'e-t-a',
        source: 'trigger',
        target: 'action-1',
        markerEnd: { type: MarkerType.ArrowClosed },
      },
    ],
  };
};

const WorkflowDesignerPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const ruleIdParam = searchParams.get('ruleId') || '';

  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState([]);
  const [selectedId, setSelectedId] = useState(ruleIdParam);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selNode, setSelNode] = useState(null);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
    [setEdges],
  );

  const loadRules = useCallback(async () => {
    const r = await workflowAutomationAdminApi.listRules();
    setRules(r.data || []);
  }, []);

  const applyRuleGraph = useCallback(
    (rule) => {
      const fg = rule?.flow_graph;
      if (fg?.nodes?.length && fg?.edges) {
        setNodes(fg.nodes);
        setEdges(fg.edges);
      } else {
        const d = defaultFlow(rule);
        setNodes(d.nodes);
        setEdges(d.edges);
      }
    },
    [setNodes, setEdges],
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await loadRules();
      } catch (e) {
        toast.error('Failed to load rules');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadRules]);

  useEffect(() => {
    if (!selectedId || !rules.length) return;
    const rule = rules.find((x) => x.id === selectedId);
    if (rule) applyRuleGraph(rule);
  }, [selectedId, rules, applyRuleGraph]);

  const onSelectRule = (id) => {
    setSelectedId(id);
    setSearchParams(id ? { ruleId: id } : {});
    setSelNode(null);
  };

  const onSaveFlow = async () => {
    if (!selectedId) {
      toast.error('Select a rule');
      return;
    }
    try {
      await workflowAutomationAdminApi.updateRule(selectedId, {
        flow_graph: { nodes, edges },
      });
      toast.success('Flow saved — runs use this graph when nodes exist');
      await loadRules();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Save failed');
    }
  };

  const onNodeClick = (_, node) => {
    setSelNode(node);
  };

  const updateActionType = (at) => {
    if (!selNode) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selNode.id ? { ...n, data: { ...n.data, action_type: at, label: `Action: ${at}` } } : n,
      ),
    );
    setSelNode((sn) => (sn && sn.id === selNode.id ? { ...sn, data: { ...sn.data, action_type: at, label: `Action: ${at}` } } : sn));
  };

  const updateWebhookUrl = (url) => {
    if (!selNode) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selNode.id
          ? { ...n, data: { ...n.data, action_config: { ...(n.data.action_config || {}), url } } }
          : n,
      ),
    );
    setSelNode((sn) => {
      if (!sn || sn.id !== selNode.id) return sn;
      return {
        ...sn,
        data: { ...sn.data, action_config: { ...(sn.data.action_config || {}), url } },
      };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const isActionNode = selNode && selNode.id !== 'trigger' && selNode.type !== 'input';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
            Workflow designer
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Visual graph (React Flow) → saved as <code className="text-xs bg-slate-100 px-1 rounded">flow_graph</code>.
            Connect trigger → actions. Multiple actions run in edge order.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/admin/workflow-automation">← Rule list</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Rule</CardTitle>
          <CardDescription>Select a rule, edit the graph, then Save.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 items-end">
          <div className="min-w-[240px] flex-1">
            <Label>Workflow rule</Label>
            <Select value={selectedId || undefined} onValueChange={onSelectRule}>
              <SelectTrigger>
                <SelectValue placeholder="Choose rule…" />
              </SelectTrigger>
              <SelectContent>
                {rules.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={onSaveFlow} disabled={!selectedId}>
            Save flow_graph
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <div className="xl:col-span-3 h-[560px] border rounded-lg bg-slate-50 overflow-hidden">
          {selectedId ? (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              fitView
            >
              <Background />
              <Controls />
              <MiniMap />
            </ReactFlow>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">Select a rule to edit</div>
          )}
        </div>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Node inspector</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {!selNode ? <p className="text-slate-500">Click an action node</p> : null}
            {isActionNode ? (
              <>
                <div>
                  <Label>action_type</Label>
                  <Select value={selNode.data?.action_type || 'NOOP'} onValueChange={updateActionType}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NOOP">NOOP</SelectItem>
                      <SelectItem value="REPROCESS_LIFECYCLE">REPROCESS_LIFECYCLE</SelectItem>
                      <SelectItem value="NOTIFY_HR">NOTIFY_HR</SelectItem>
                      <SelectItem value="HTTP_WEBHOOK">HTTP_WEBHOOK</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {selNode.data?.action_type === 'HTTP_WEBHOOK' ? (
                  <div>
                    <Label>Webhook URL (https)</Label>
                    <Input
                      className="mt-1"
                      value={selNode.data?.action_config?.url || ''}
                      onChange={(e) => updateWebhookUrl(e.target.value)}
                      placeholder="https://api.partner.com/hooks/hrms"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      Body template (optional): use {'{rule_id}'}, {'{rule_name}'}, {'{timestamp}'} in rule JSON.
                    </p>
                  </div>
                ) : null}
              </>
            ) : selNode ? (
              <p className="text-slate-600">Trigger node — type is controlled by the rule record.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WorkflowDesignerPage;
