import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { executiveApi, executiveKpiAdminApi } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Loader2 } from 'lucide-react';

const AdminExecutiveKpiPage = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);
  const [warn, setWarn] = useState('');
  const [critical, setCritical] = useState('');

  const [defsLoading, setDefsLoading] = useState(true);
  const [definitions, setDefinitions] = useState([]);
  const [defEditing, setDefEditing] = useState(null);
  const [defForm, setDefForm] = useState({
    description: '',
    formula: '',
    owner_role: '',
    steward_team: '',
    source_system: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await executiveKpiAdminApi.listThresholds();
      setRows(res.data?.items || []);
    } catch {
      toast.error('Failed to load KPI thresholds');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDefinitions = useCallback(async () => {
    setDefsLoading(true);
    try {
      const res = await executiveApi.getM9KpiDefinitions();
      setDefinitions(res.data?.items || []);
    } catch {
      toast.error('Failed to load KPI definitions');
    } finally {
      setDefsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    loadDefinitions();
  }, [load, loadDefinitions]);

  const startEdit = (row) => {
    setEditing(row.kpi_id);
    setWarn(String(row.warn ?? ''));
    setCritical(String(row.critical ?? ''));
  };

  const save = async () => {
    if (!editing) return;
    try {
      await executiveKpiAdminApi.updateThreshold(editing, {
        warn: warn === '' ? undefined : Number(warn),
        critical: critical === '' ? undefined : Number(critical),
      });
      toast.success(`Updated ${editing}`);
      setEditing(null);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Save failed');
    }
  };

  const reset = async (kpiId) => {
    try {
      await executiveKpiAdminApi.resetThreshold(kpiId);
      toast.success(`Reset ${kpiId} to defaults`);
      if (editing === kpiId) setEditing(null);
      await load();
    } catch {
      toast.error('Reset failed');
    }
  };

  const startDefEdit = (row) => {
    setDefEditing(row.kpi_id);
    setDefForm({
      description: row.description || '',
      formula: row.formula || '',
      owner_role: row.owner_role || '',
      steward_team: row.steward_team || '',
      source_system: row.source_system || '',
    });
  };

  const saveDefinition = async () => {
    if (!defEditing) return;
    try {
      await executiveKpiAdminApi.updateDefinition(defEditing, {
        description: defForm.description.trim() || undefined,
        formula: defForm.formula.trim() || undefined,
        owner_role: defForm.owner_role.trim() || undefined,
        steward_team: defForm.steward_team.trim() || undefined,
        source_system: defForm.source_system.trim() || undefined,
      });
      toast.success(`Updated definition ${defEditing}`);
      setDefEditing(null);
      await loadDefinitions();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Save failed');
    }
  };

  const resetDefinition = async (kpiId) => {
    try {
      await executiveKpiAdminApi.resetDefinition(kpiId);
      toast.success(`Reset ${kpiId} to catalog default`);
      if (defEditing === kpiId) setDefEditing(null);
      await loadDefinitions();
    } catch {
      toast.error('Reset failed');
    }
  };

  if (loading && defsLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1
          className="text-2xl font-bold text-slate-900"
          style={{ fontFamily: 'Outfit' }}
          data-testid="admin-executive-kpi-heading"
        >
          Executive KPI configuration
        </h1>
        <p className="text-slate-600 mt-1 text-sm">
          Manage thresholds for hero tile status and semantic definitions shown in tooltips.
        </p>
        <Button asChild variant="link" className="px-0 mt-1 text-indigo-600">
          <Link to="/executive-kpis">← Back to Executive KPI Dashboard</Link>
        </Button>
      </div>

      <Tabs defaultValue="thresholds">
        <TabsList>
          <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
          <TabsTrigger value="definitions">KPI definitions</TabsTrigger>
        </TabsList>

        <TabsContent value="thresholds" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">KPI thresholds</CardTitle>
              <CardDescription>Overrides stored in MongoDB; unset rows use built-in defaults.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>KPI</TableHead>
                    <TableHead>Warn</TableHead>
                    <TableHead>Critical</TableHead>
                    <TableHead>Override</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.kpi_id}>
                      <TableCell className="font-mono text-xs">{row.kpi_id}</TableCell>
                      <TableCell>
                        {editing === row.kpi_id ? (
                          <Input className="h-8 w-20" value={warn} onChange={(e) => setWarn(e.target.value)} />
                        ) : (
                          row.warn
                        )}
                      </TableCell>
                      <TableCell>
                        {editing === row.kpi_id ? (
                          <Input className="h-8 w-20" value={critical} onChange={(e) => setCritical(e.target.value)} />
                        ) : (
                          row.critical
                        )}
                      </TableCell>
                      <TableCell>{row.has_override ? 'Yes' : 'Default'}</TableCell>
                      <TableCell className="text-right space-x-1">
                        {editing === row.kpi_id ? (
                          <>
                            <Button size="sm" onClick={save}>
                              Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" onClick={() => startEdit(row)}>
                              Edit
                            </Button>
                            {row.has_override ? (
                              <Button size="sm" variant="ghost" onClick={() => reset(row.kpi_id)}>
                                Reset
                              </Button>
                            ) : null}
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="definitions" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">KPI definitions</CardTitle>
              <CardDescription>
                Edit description, formula, and ownership. Overrides merge with the built-in catalog on the executive dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {defsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>KPI</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Override</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {definitions.map((row) => (
                      <TableRow key={row.kpi_id}>
                        <TableCell className="font-mono text-xs">{row.kpi_id}</TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell className="text-sm">{row.owner_role}</TableCell>
                        <TableCell>{row.has_override ? 'Yes' : 'Default'}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="sm" variant="outline" onClick={() => startDefEdit(row)}>
                            Edit
                          </Button>
                          {row.has_override ? (
                            <Button size="sm" variant="ghost" onClick={() => resetDefinition(row.kpi_id)}>
                              Reset
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {defEditing ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Edit {defEditing}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>Description</Label>
                  <Input
                    value={defForm.description}
                    onChange={(e) => setDefForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Formula</Label>
                  <Input
                    value={defForm.formula}
                    onChange={(e) => setDefForm((f) => ({ ...f, formula: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Owner role</Label>
                    <Input
                      value={defForm.owner_role}
                      onChange={(e) => setDefForm((f) => ({ ...f, owner_role: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Steward team</Label>
                    <Input
                      value={defForm.steward_team}
                      onChange={(e) => setDefForm((f) => ({ ...f, steward_team: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Source system</Label>
                    <Input
                      value={defForm.source_system}
                      onChange={(e) => setDefForm((f) => ({ ...f, source_system: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={saveDefinition}>Save definition</Button>
                  <Button variant="ghost" onClick={() => setDefEditing(null)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminExecutiveKpiPage;
