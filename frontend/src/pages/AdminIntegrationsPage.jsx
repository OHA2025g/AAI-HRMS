import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { adminApi } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Separator } from '../components/ui/separator';

const emptyConnector = {
  enabled: false,
  mongo_url: '',
  db_name: '',
  collection_name: '',
  client_id: '',
  client_secret: '',
  base_url: '',
  scopes: '',
};

const parseScopesToString = (scopes) => {
  if (!scopes) return '';
  if (Array.isArray(scopes)) return scopes.join(', ');
  if (typeof scopes === 'string') return scopes;
  return '';
};

const numOrUndef = (v) => {
  if (v === '' || v === undefined || v === null) return undefined;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : undefined;
};

const AdminIntegrationsPage = () => {
  const [loading, setLoading] = useState(true);
  const [configs, setConfigs] = useState({});
  const [saving, setSaving] = useState(false);
  const [health, setHealth] = useState(null);

  const form = useMemo(() => {
    const get = (key) => configs?.[key] || {};
    return {
      COMPANY_DB_CANDIDATES: {
        ...emptyConnector,
        enabled: !!get('COMPANY_DB_CANDIDATES')?.enabled || false,
        mongo_url: get('COMPANY_DB_CANDIDATES')?.mongo_url || '',
        db_name: get('COMPANY_DB_CANDIDATES')?.db_name || '',
        collection_name: get('COMPANY_DB_CANDIDATES')?.collection_name || '',
      },
      LINKEDIN: {
        ...emptyConnector,
        enabled: !!get('LINKEDIN')?.enabled || false,
        mongo_url: get('LINKEDIN')?.mongo_url || '',
        db_name: get('LINKEDIN')?.db_name || '',
        collection_name: get('LINKEDIN')?.collection_name || '',
        client_id: get('LINKEDIN')?.client_id || '',
        client_secret: get('LINKEDIN')?.client_secret || '',
        base_url: get('LINKEDIN')?.base_url || '',
        scopes: parseScopesToString(get('LINKEDIN')?.scopes),
      },
      NAUKRI: {
        ...emptyConnector,
        enabled: !!get('NAUKRI')?.enabled || false,
        mongo_url: get('NAUKRI')?.mongo_url || '',
        db_name: get('NAUKRI')?.db_name || '',
        collection_name: get('NAUKRI')?.collection_name || '',
        client_id: get('NAUKRI')?.client_id || '',
        client_secret: get('NAUKRI')?.client_secret || '',
        base_url: get('NAUKRI')?.base_url || '',
        scopes: parseScopesToString(get('NAUKRI')?.scopes),
      },
      MONSTER: {
        ...emptyConnector,
        enabled: !!get('MONSTER')?.enabled || false,
        mongo_url: get('MONSTER')?.mongo_url || '',
        db_name: get('MONSTER')?.db_name || '',
        collection_name: get('MONSTER')?.collection_name || '',
        client_id: get('MONSTER')?.client_id || '',
        client_secret: get('MONSTER')?.client_secret || '',
        base_url: get('MONSTER')?.base_url || '',
        scopes: parseScopesToString(get('MONSTER')?.scopes),
      },
    };
  }, [configs]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await adminApi.getConnectorConfigs();
        setConfigs(res.data || {});
      } catch (e) {
        toast.error('Failed to load connector configs');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (loading) return;
    (async () => {
      try {
        const res = await adminApi.getConnectorsHealth();
        setHealth(res.data);
      } catch {
        setHealth(null);
      }
    })();
  }, [loading, configs]);

  const updateField = (key, field, value) => {
    setConfigs((prev) => ({
      ...prev,
      [key]: {
        ...(prev?.[key] || {}),
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payloads = [
        {
          name: 'COMPANY_DB_CANDIDATES',
          data: {
            enabled: !!form.COMPANY_DB_CANDIDATES.enabled,
            mongo_url: form.COMPANY_DB_CANDIDATES.mongo_url || null,
            db_name: form.COMPANY_DB_CANDIDATES.db_name || null,
            collection_name: form.COMPANY_DB_CANDIDATES.collection_name || null,
          },
        },
        {
          name: 'LINKEDIN',
          data: {
            enabled: !!form.LINKEDIN.enabled,
            mongo_url: form.LINKEDIN.mongo_url || null,
            db_name: form.LINKEDIN.db_name || null,
            collection_name: form.LINKEDIN.collection_name || null,
            client_id: form.LINKEDIN.client_id || null,
            client_secret: (form.LINKEDIN.client_secret || '').trim() || undefined,
            base_url: form.LINKEDIN.base_url || null,
            scopes: form.LINKEDIN.scopes || undefined,
            oauth_token_url: configs.LINKEDIN?.oauth_token_url || undefined,
            refresh_token: (configs.LINKEDIN?.refresh_token || '').trim() || undefined,
            page_size: numOrUndef(configs.LINKEDIN?.page_size),
            max_retries: numOrUndef(configs.LINKEDIN?.max_retries),
            min_interval_ms: numOrUndef(configs.LINKEDIN?.min_interval_ms),
          },
        },
        {
          name: 'NAUKRI',
          data: {
            enabled: !!form.NAUKRI.enabled,
            mongo_url: form.NAUKRI.mongo_url || null,
            db_name: form.NAUKRI.db_name || null,
            collection_name: form.NAUKRI.collection_name || null,
            client_id: form.NAUKRI.client_id || null,
            client_secret: (form.NAUKRI.client_secret || '').trim() || undefined,
            base_url: form.NAUKRI.base_url || null,
            scopes: form.NAUKRI.scopes || undefined,
            oauth_token_url: configs.NAUKRI?.oauth_token_url || undefined,
            refresh_token: (configs.NAUKRI?.refresh_token || '').trim() || undefined,
            page_size: numOrUndef(configs.NAUKRI?.page_size),
            max_retries: numOrUndef(configs.NAUKRI?.max_retries),
            min_interval_ms: numOrUndef(configs.NAUKRI?.min_interval_ms),
          },
        },
        {
          name: 'MONSTER',
          data: {
            enabled: !!form.MONSTER.enabled,
            mongo_url: form.MONSTER.mongo_url || null,
            db_name: form.MONSTER.db_name || null,
            collection_name: form.MONSTER.collection_name || null,
            client_id: form.MONSTER.client_id || null,
            client_secret: (form.MONSTER.client_secret || '').trim() || undefined,
            base_url: form.MONSTER.base_url || null,
            scopes: form.MONSTER.scopes || undefined,
            oauth_token_url: configs.MONSTER?.oauth_token_url || undefined,
            refresh_token: (configs.MONSTER?.refresh_token || '').trim() || undefined,
            page_size: numOrUndef(configs.MONSTER?.page_size),
            max_retries: numOrUndef(configs.MONSTER?.max_retries),
            min_interval_ms: numOrUndef(configs.MONSTER?.min_interval_ms),
          },
        },
      ];

      for (const p of payloads) {
        await adminApi.updateConnectorConfig(p.name, p.data);
      }

      toast.success('Connector configs saved');
      const res = await adminApi.getConnectorConfigs();
      setConfigs(res.data || {});
    } catch (e) {
      toast.error('Failed to save connector configs');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Integrations</h1>
        <p className="text-slate-600 mt-1">
          Configure company candidate source and official connector credentials for LinkedIn, Naukri, and Monster.
        </p>
      </div>

      {health && (
        <Card>
          <CardHeader>
            <CardTitle>Connector health</CardTitle>
            <CardDescription>Last HTTP/Mongo fetch status (M1 productionization).</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {Object.entries(health).map(([k, v]) => (
              <div key={k} className="border rounded-md p-3 space-y-1">
                <div className="font-semibold text-slate-800">{k}</div>
                <div className="text-slate-600">Enabled: {v.enabled ? 'yes' : 'no'}</div>
                <div className="text-slate-600">Healthy: {v.health_ok == null ? '—' : v.health_ok ? 'yes' : 'no'}</div>
                <div className="text-xs text-slate-500 break-all">{v.health_detail || '—'}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Company Candidates Source</CardTitle>
          <CardDescription>Provide the external Mongo location/path where company candidates live.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={!!configs.COMPANY_DB_CANDIDATES?.enabled}
              onChange={(e) => updateField('COMPANY_DB_CANDIDATES', 'enabled', e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm text-slate-700">Enable external company DB</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mongo URL</Label>
              <Input
                value={configs.COMPANY_DB_CANDIDATES?.mongo_url || ''}
                onChange={(e) => updateField('COMPANY_DB_CANDIDATES', 'mongo_url', e.target.value)}
                placeholder="mongodb://host:27017"
              />
            </div>
            <div className="space-y-2">
              <Label>DB Name</Label>
              <Input
                value={configs.COMPANY_DB_CANDIDATES?.db_name || ''}
                onChange={(e) => updateField('COMPANY_DB_CANDIDATES', 'db_name', e.target.value)}
                placeholder="aai_hrms"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Collection Name</Label>
            <Input
              value={configs.COMPANY_DB_CANDIDATES?.collection_name || ''}
              onChange={(e) => updateField('COMPANY_DB_CANDIDATES', 'collection_name', e.target.value)}
              placeholder="candidates"
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>LinkedIn (Official API)</CardTitle>
          <CardDescription>
            OAuth (client credentials + optional refresh), paging, retries, and throttling (M1). Point <code>oauth_token_url</code> at the
            vendor token endpoint when it differs from <code>{'{base}'}/oauth/token</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={!!configs.LINKEDIN?.enabled}
              onChange={(e) => updateField('LINKEDIN', 'enabled', e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm text-slate-700">Enable LinkedIn connector</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client ID</Label>
              <Input value={configs.LINKEDIN?.client_id || ''} onChange={(e) => updateField('LINKEDIN', 'client_id', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Client Secret / Token</Label>
              <Input
                type="password"
                value={configs.LINKEDIN?.client_secret || ''}
                onChange={(e) => updateField('LINKEDIN', 'client_secret', e.target.value)}
                placeholder="Paste secret/token"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Base URL</Label>
            <Input value={configs.LINKEDIN?.base_url || ''} onChange={(e) => updateField('LINKEDIN', 'base_url', e.target.value)} placeholder="https://api.linkedin.com/v2" />
          </div>

          <div className="space-y-2">
            <Label>Scopes (comma-separated)</Label>
            <Textarea
              value={configs.LINKEDIN?.scopes || ''}
              onChange={(e) => updateField('LINKEDIN', 'scopes', e.target.value)}
              placeholder="r_basicprofile, r_emailaddress"
            />
          </div>

          <Separator className="my-2" />
          <p className="text-xs font-medium text-slate-500 uppercase">OAuth &amp; HTTP ingestion</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>OAuth token URL (optional)</Label>
              <Input
                value={configs.LINKEDIN?.oauth_token_url || ''}
                onChange={(e) => updateField('LINKEDIN', 'oauth_token_url', e.target.value)}
                placeholder="https://www.linkedin.com/oauth/v2/accessToken"
              />
            </div>
            <div className="space-y-2">
              <Label>Refresh token (optional)</Label>
              <Input
                type="password"
                value={configs.LINKEDIN?.refresh_token || ''}
                onChange={(e) => updateField('LINKEDIN', 'refresh_token', e.target.value)}
                placeholder="Stored server-side; not shown after save"
              />
            </div>
            <div className="space-y-2">
              <Label>Page size</Label>
              <Input
                type="number"
                min={1}
                value={configs.LINKEDIN?.page_size ?? ''}
                onChange={(e) => updateField('LINKEDIN', 'page_size', e.target.value)}
                placeholder="50"
              />
            </div>
            <div className="space-y-2">
              <Label>Max retries</Label>
              <Input
                type="number"
                min={1}
                value={configs.LINKEDIN?.max_retries ?? ''}
                onChange={(e) => updateField('LINKEDIN', 'max_retries', e.target.value)}
                placeholder="3"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Min interval (ms) between pages</Label>
              <Input
                type="number"
                min={0}
                value={configs.LINKEDIN?.min_interval_ms ?? ''}
                onChange={(e) => updateField('LINKEDIN', 'min_interval_ms', e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <Separator className="my-3" />
          <div className="space-y-2">
            <Label>External Mongo (optional)</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mongo URL</Label>
                <Input
                  value={configs.LINKEDIN?.mongo_url || ''}
                  onChange={(e) => updateField('LINKEDIN', 'mongo_url', e.target.value)}
                  placeholder="mongodb://host:27017"
                />
              </div>
              <div className="space-y-2">
                <Label>DB Name</Label>
                <Input
                  value={configs.LINKEDIN?.db_name || ''}
                  onChange={(e) => updateField('LINKEDIN', 'db_name', e.target.value)}
                  placeholder="aai_hrms"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Collection Name</Label>
              <Input
                value={configs.LINKEDIN?.collection_name || ''}
                onChange={(e) => updateField('LINKEDIN', 'collection_name', e.target.value)}
                placeholder="candidates"
              />
            </div>

            <div className="text-xs text-slate-500">
              If provided, backend will try external Mongo ingestion first, then fall back to <code>base_url</code>.
            </div>
          </div>

          <div className="text-xs text-slate-500">
            Saving will store secrets server-side; the UI will not display saved secrets again.
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Naukri (Official API)</CardTitle>
          <CardDescription>Client credentials + scopes used by the connector (implementation stub until official access).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={!!configs.NAUKRI?.enabled}
              onChange={(e) => updateField('NAUKRI', 'enabled', e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm text-slate-700">Enable Naukri connector</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client ID</Label>
              <Input value={configs.NAUKRI?.client_id || ''} onChange={(e) => updateField('NAUKRI', 'client_id', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Client Secret / Token</Label>
              <Input
                type="password"
                value={configs.NAUKRI?.client_secret || ''}
                onChange={(e) => updateField('NAUKRI', 'client_secret', e.target.value)}
                placeholder="Paste secret/token"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Base URL</Label>
            <Input value={configs.NAUKRI?.base_url || ''} onChange={(e) => updateField('NAUKRI', 'base_url', e.target.value)} placeholder="https://api.naukri.com/..." />
          </div>

          <div className="space-y-2">
            <Label>Scopes (comma-separated)</Label>
            <Textarea
              value={configs.NAUKRI?.scopes || ''}
              onChange={(e) => updateField('NAUKRI', 'scopes', e.target.value)}
              placeholder="..."
            />
          </div>

          <Separator className="my-2" />
          <p className="text-xs font-medium text-slate-500 uppercase">OAuth &amp; HTTP ingestion</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>OAuth token URL (optional)</Label>
              <Input
                value={configs.NAUKRI?.oauth_token_url || ''}
                onChange={(e) => updateField('NAUKRI', 'oauth_token_url', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Refresh token (optional)</Label>
              <Input
                type="password"
                value={configs.NAUKRI?.refresh_token || ''}
                onChange={(e) => updateField('NAUKRI', 'refresh_token', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Page size</Label>
              <Input
                type="number"
                min={1}
                value={configs.NAUKRI?.page_size ?? ''}
                onChange={(e) => updateField('NAUKRI', 'page_size', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Max retries</Label>
              <Input
                type="number"
                min={1}
                value={configs.NAUKRI?.max_retries ?? ''}
                onChange={(e) => updateField('NAUKRI', 'max_retries', e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Min interval (ms)</Label>
              <Input
                type="number"
                min={0}
                value={configs.NAUKRI?.min_interval_ms ?? ''}
                onChange={(e) => updateField('NAUKRI', 'min_interval_ms', e.target.value)}
              />
            </div>
          </div>

          <Separator className="my-3" />
          <div className="space-y-2">
            <Label>External Mongo (optional)</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mongo URL</Label>
                <Input
                  value={configs.NAUKRI?.mongo_url || ''}
                  onChange={(e) => updateField('NAUKRI', 'mongo_url', e.target.value)}
                  placeholder="mongodb://host:27017"
                />
              </div>
              <div className="space-y-2">
                <Label>DB Name</Label>
                <Input
                  value={configs.NAUKRI?.db_name || ''}
                  onChange={(e) => updateField('NAUKRI', 'db_name', e.target.value)}
                  placeholder="aai_hrms"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Collection Name</Label>
              <Input
                value={configs.NAUKRI?.collection_name || ''}
                onChange={(e) => updateField('NAUKRI', 'collection_name', e.target.value)}
                placeholder="candidates"
              />
            </div>

            <div className="text-xs text-slate-500">
              If provided, backend will try external Mongo ingestion first, then fall back to <code>base_url</code>.
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Monster (Official API)</CardTitle>
          <CardDescription>Same ingestion stack as Naukri: OAuth, paging, retries, optional external Mongo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={!!configs.MONSTER?.enabled}
              onChange={(e) => updateField('MONSTER', 'enabled', e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm text-slate-700">Enable Monster connector</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client ID</Label>
              <Input value={configs.MONSTER?.client_id || ''} onChange={(e) => updateField('MONSTER', 'client_id', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Client Secret / Token</Label>
              <Input
                type="password"
                value={configs.MONSTER?.client_secret || ''}
                onChange={(e) => updateField('MONSTER', 'client_secret', e.target.value)}
                placeholder="Paste secret/token"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Base URL</Label>
            <Input value={configs.MONSTER?.base_url || ''} onChange={(e) => updateField('MONSTER', 'base_url', e.target.value)} placeholder="https://api.monster.com/..." />
          </div>

          <div className="space-y-2">
            <Label>Scopes (comma-separated)</Label>
            <Textarea
              value={configs.MONSTER?.scopes || ''}
              onChange={(e) => updateField('MONSTER', 'scopes', e.target.value)}
              placeholder="..."
            />
          </div>

          <Separator className="my-2" />
          <p className="text-xs font-medium text-slate-500 uppercase">OAuth &amp; HTTP ingestion</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>OAuth token URL (optional)</Label>
              <Input
                value={configs.MONSTER?.oauth_token_url || ''}
                onChange={(e) => updateField('MONSTER', 'oauth_token_url', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Refresh token (optional)</Label>
              <Input
                type="password"
                value={configs.MONSTER?.refresh_token || ''}
                onChange={(e) => updateField('MONSTER', 'refresh_token', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Page size</Label>
              <Input
                type="number"
                min={1}
                value={configs.MONSTER?.page_size ?? ''}
                onChange={(e) => updateField('MONSTER', 'page_size', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Max retries</Label>
              <Input
                type="number"
                min={1}
                value={configs.MONSTER?.max_retries ?? ''}
                onChange={(e) => updateField('MONSTER', 'max_retries', e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Min interval (ms)</Label>
              <Input
                type="number"
                min={0}
                value={configs.MONSTER?.min_interval_ms ?? ''}
                onChange={(e) => updateField('MONSTER', 'min_interval_ms', e.target.value)}
              />
            </div>
          </div>

          <Separator className="my-3" />
          <div className="space-y-2">
            <Label>External Mongo (optional)</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mongo URL</Label>
                <Input
                  value={configs.MONSTER?.mongo_url || ''}
                  onChange={(e) => updateField('MONSTER', 'mongo_url', e.target.value)}
                  placeholder="mongodb://host:27017"
                />
              </div>
              <div className="space-y-2">
                <Label>DB Name</Label>
                <Input
                  value={configs.MONSTER?.db_name || ''}
                  onChange={(e) => updateField('MONSTER', 'db_name', e.target.value)}
                  placeholder="aai_hrms"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Collection Name</Label>
              <Input
                value={configs.MONSTER?.collection_name || ''}
                onChange={(e) => updateField('MONSTER', 'collection_name', e.target.value)}
                placeholder="candidates"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
          {saving ? 'Saving...' : 'Save Connector Configs'}
        </Button>
      </div>
    </div>
  );
};

export default AdminIntegrationsPage;

