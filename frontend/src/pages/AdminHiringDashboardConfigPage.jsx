import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle,
  BarChart3,
  Check,
  ExternalLink,
  Loader2,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { adminApi, jobsApi } from '../lib/api';
import { Switch } from '../components/ui/switch';
import { cn } from '../lib/utils';
import {
  DEFAULT_RULE_FLAGS,
  DEFAULT_STAGE_SLA,
  RULE_MATRIX,
} from '../lib/hiringDashboardConfigConstants';
import {
  auditEntryChip,
  auditEntryIcon,
  computeConfigHealth,
  formatStageLabel,
  PRIMARY_RULE_IDS,
  slaBarWidth,
} from '../lib/hiringDashboardConfigUtils';
import HiringDashboardConfigOrgFilterBar from '../components/admin/hiring-dashboard-config/HiringDashboardConfigOrgFilterBar';
import { SMART_HIRING_ONLY } from '../config/appModules';

const AdminHiringDashboardConfigPage = () => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [lowFitThreshold, setLowFitThreshold] = useState('50');
  const [stuckCriticalCount, setStuckCriticalCount] = useState('25');
  const [monthlyHireTarget, setMonthlyHireTarget] = useState('10');
  const [staleReqZeroDays, setStaleReqZeroDays] = useState('90');
  const [stageSlaDays, setStageSlaDays] = useState({ ...DEFAULT_STAGE_SLA });
  const [ruleFlags, setRuleFlags] = useState({ ...DEFAULT_RULE_FLAGS });
  const [llmInsightsEnabled, setLlmInsightsEnabled] = useState(false);
  const [auditTrail, setAuditTrail] = useState([]);
  const [openJobs, setOpenJobs] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await adminApi.getHiringDashboardConfig();
      const data = res.data || {};
      setLowFitThreshold(String(data.low_fit_threshold ?? 50));
      setStuckCriticalCount(String(data.stuck_critical_count ?? 25));
      setMonthlyHireTarget(String(data.monthly_hire_target ?? 10));
      setStaleReqZeroDays(String(data.stale_req_zero_interviews_days ?? 90));
      setStageSlaDays({ ...DEFAULT_STAGE_SLA, ...(data.stage_sla_days || {}) });
      setRuleFlags({ ...DEFAULT_RULE_FLAGS, ...(data.rule_flags || {}) });
      setLlmInsightsEnabled(Boolean(data.llm_insights_enabled));
      setAuditTrail(Array.isArray(data.audit_trail) ? data.audit_trail : []);
      setUpdatedAt(data.updated_at || null);
    } catch {
      setLoadError('Failed to load hiring dashboard configuration.');
      toast.error('Failed to load hiring dashboard configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await jobsApi.list('OPEN');
        if (!alive) return;
        setOpenJobs(Array.isArray(res.data) ? res.data : []);
      } catch {
        if (!alive) return;
        setOpenJobs([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const payload = useMemo(
    () => ({
      low_fit_threshold: Number(lowFitThreshold),
      stuck_critical_count: Number(stuckCriticalCount),
      monthly_hire_target: Number(monthlyHireTarget),
      stale_req_zero_interviews_days: Number(staleReqZeroDays),
      stage_sla_days: Object.fromEntries(
        Object.entries(stageSlaDays).map(([k, v]) => [k, Number(v) || 0])
      ),
      rule_flags: ruleFlags,
      llm_insights_enabled: llmInsightsEnabled,
    }),
    [lowFitThreshold, stuckCriticalCount, monthlyHireTarget, staleReqZeroDays, stageSlaDays, ruleFlags, llmInsightsEnabled]
  );

  const activeRuleCount = useMemo(
    () => Object.values(ruleFlags).filter(Boolean).length,
    [ruleFlags]
  );

  const configHealth = useMemo(
    () =>
      computeConfigHealth({
        stageSlaDays,
        lowFitThreshold,
        stuckCriticalCount,
        monthlyHireTarget,
        staleReqZeroDays,
      }),
    [stageSlaDays, lowFitThreshold, stuckCriticalCount, monthlyHireTarget, staleReqZeroDays]
  );

  const primaryRules = useMemo(
    () => RULE_MATRIX.filter((rule) => PRIMARY_RULE_IDS.includes(rule.id)),
    []
  );

  const extendedRules = useMemo(
    () => RULE_MATRIX.filter((rule) => !PRIMARY_RULE_IDS.includes(rule.id)),
    []
  );

  const save = async () => {
    setSaving(true);
    try {
      const res = await adminApi.updateHiringDashboardConfig(payload);
      setUpdatedAt(res.data?.updated_at || new Date().toISOString());
      toast.success('Hiring dashboard thresholds saved');
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = () => {
    setLowFitThreshold('50');
    setStuckCriticalCount('25');
    setMonthlyHireTarget('10');
    setStaleReqZeroDays('90');
    setStageSlaDays({ ...DEFAULT_STAGE_SLA });
    setRuleFlags({ ...DEFAULT_RULE_FLAGS });
    setLlmInsightsEnabled(false);
  };

  const toggleRuleFlag = (flagKey, checked) => {
    setRuleFlags((prev) => ({ ...prev, [flagKey]: checked }));
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ ...payload, updated_at: updatedAt }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hiring-dashboard-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const viewApiPayload = async () => {
    const text = JSON.stringify(payload, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      toast.success('API payload copied to clipboard');
    } catch {
      toast.message('Current API payload', { description: text.slice(0, 240) });
    }
  };

  const renderAuditIcon = (kind) => {
    if (kind === 'warning') {
      return <AlertTriangle className="h-4 w-4" aria-hidden />;
    }
    if (kind === 'reset') {
      return <RotateCcw className="h-4 w-4" aria-hidden />;
    }
    return <Check className="h-4 w-4" aria-hidden />;
  };

  return (
    <div
      className="hiring-dashboard-root top-operational hdc-root"
      data-testid="admin-hiring-config-page"
    >
      {SMART_HIRING_ONLY ? (
        <header className="hdc-topbar" aria-label="Hiring dashboard config filters">
          <h3 className="hdc-topbar-title">Hiring dashboard config</h3>
          <HiringDashboardConfigOrgFilterBar jobs={openJobs} />
        </header>
      ) : null}

      <div className="hdc-content">
        <div className="hdc-page-head">
          <div>
            <div className="hdc-title-row">
              <span className="hdc-title-icon" aria-hidden>
                <BarChart3 className="h-6 w-6" />
              </span>
              <div>
                <h1>Smart Hiring Dashboard Config</h1>
                <p>
                  Control alert thresholds, SLA ageing rules, and trend targets used by the hiring-pack
                  API.
                </p>
              </div>
            </div>
            <Link to="/dashboard" className="hdc-link">
              Open Smart Hiring Dashboard <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          <button
            type="button"
            className="hdc-btn hdc-btn-primary"
            onClick={save}
            disabled={saving || loading}
            data-testid="hiring-dashboard-config-save"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Save configuration
          </button>
        </div>

        {loading ? (
          <div className="hdc-loading">
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
          </div>
        ) : loadError ? (
          <div className="hdc-card hdc-error-card">
            <p>{loadError}</p>
            <button type="button" className="hdc-btn hdc-btn-secondary" onClick={load}>
              Retry
            </button>
          </div>
        ) : (
          <>
            <section className="hdc-grid">
              <div className="hdc-card">
                <div className="hdc-section-head">
                  <div>
                    <h2>Alert thresholds</h2>
                    <p>Changes apply on the next hiring-pack request. Cache invalidates immediately.</p>
                  </div>
                  <span className="hdc-badge">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Live configuration
                  </span>
                </div>
                <div className="hdc-form-grid">
                  <div className="hdc-field">
                    <label htmlFor="low-fit">
                      Low fit threshold <small>%</small>
                    </label>
                    <div className="hdc-input-wrap">
                      <input
                        id="low-fit"
                        type="number"
                        min={0}
                        max={100}
                        value={lowFitThreshold}
                        onChange={(e) => setLowFitThreshold(e.target.value)}
                      />
                      <span>%</span>
                    </div>
                  </div>
                  <div className="hdc-field">
                    <label htmlFor="stuck-critical">Stuck candidates — critical count</label>
                    <input
                      id="stuck-critical"
                      type="number"
                      min={1}
                      value={stuckCriticalCount}
                      onChange={(e) => setStuckCriticalCount(e.target.value)}
                    />
                  </div>
                  <div className="hdc-field">
                    <label htmlFor="hire-target">
                      Monthly hire target <small>trends line</small>
                    </label>
                    <input
                      id="hire-target"
                      type="number"
                      min={0}
                      value={monthlyHireTarget}
                      onChange={(e) => setMonthlyHireTarget(e.target.value)}
                    />
                  </div>
                  <div className="hdc-field">
                    <label htmlFor="stale-zero">
                      Stale requisition with zero interviews <small>days</small>
                    </label>
                    <input
                      id="stale-zero"
                      type="number"
                      min={30}
                      value={staleReqZeroDays}
                      onChange={(e) => setStaleReqZeroDays(e.target.value)}
                    />
                  </div>
                </div>
                <div className="hdc-note">
                  Recommended: use lower alert thresholds for critical roles and stricter SLA windows
                  for interview stages.
                </div>
              </div>

              <div className="hdc-side-stack">
                <div className="hdc-card hdc-score-card">
                  <div className="hdc-section-head">
                    <div>
                      <h2>Config health</h2>
                      <p>Completeness and operational readiness</p>
                    </div>
                  </div>
                  <div className="hdc-score">
                    {configHealth}
                    <span>/100</span>
                  </div>
                  <div className="hdc-mini-kpis">
                    <div className="hdc-mini">
                      <b>{Object.keys(stageSlaDays).length}</b>
                      <span>SLA stages mapped</span>
                    </div>
                    <div className="hdc-mini">
                      <b>{activeRuleCount}</b>
                      <span>Alert rules active</span>
                    </div>
                  </div>
                  <div
                    className={cn(
                      'hdc-alert',
                      configHealth >= 85 ? 'hdc-alert-green' : 'hdc-alert-orange'
                    )}
                  >
                    <b>{configHealth >= 85 ? '✓ Ready for production' : 'Review recommended'}</b>
                    <span>
                      {configHealth >= 85
                        ? 'No blocking configuration gaps detected.'
                        : 'Some thresholds may need attention before go-live.'}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="hdc-grid hdc-grid-full">
              <div className="hdc-card">
                <div className="hdc-section-head">
                  <div>
                    <h2>Stage SLA settings</h2>
                    <p>Maximum days before a candidate/stage is marked as stuck.</p>
                  </div>
                  <span className="hdc-badge">{Object.keys(stageSlaDays).length} stages</span>
                </div>
                <div className="hdc-sla-list">
                  {Object.entries(stageSlaDays).map(([stage, days]) => (
                    <div key={stage} className="hdc-sla-row">
                      <div className="hdc-stage">{formatStageLabel(stage)}</div>
                      <div className="hdc-progress">
                        <i style={{ width: slaBarWidth(days) }} />
                      </div>
                      <input
                        id={`sla-${stage}`}
                        type="number"
                        min={1}
                        value={days}
                        onChange={(e) =>
                          setStageSlaDays((prev) => ({ ...prev, [stage]: e.target.value }))
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="hdc-actions">
                  <button
                    type="button"
                    className="hdc-btn hdc-btn-primary"
                    onClick={save}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                    Save configuration
                  </button>
                  <button type="button" className="hdc-btn hdc-btn-secondary" onClick={resetDefaults}>
                    <RotateCcw className="h-4 w-4" aria-hidden /> Reset to defaults
                  </button>
                </div>
              </div>

              <div className="hdc-side-stack">
                <div className="hdc-card">
                  <div className="hdc-section-head">
                    <div>
                      <h2>Configuration audit</h2>
                      <p>Recent admin changes</p>
                    </div>
                  </div>
                  <div className="hdc-audit" data-testid="hiring-config-audit-trail">
                    {auditTrail.length ? (
                      auditTrail.map((entry) => {
                        const iconKind = auditEntryIcon(entry);
                        return (
                          <div
                            key={entry.id || entry.created_at}
                            className="hdc-audit-item"
                            data-testid="hiring-config-audit-entry"
                          >
                            <span className={cn('hdc-audit-ico', iconKind === 'warning' && 'hdc-audit-ico-warn')}>
                              {renderAuditIcon(iconKind)}
                            </span>
                            <div>
                              <b>{entry.summary || 'Configuration saved'}</b>
                              <span>
                                {entry.user_name || 'Admin'}
                                {entry.created_at
                                  ? ` · ${new Date(entry.created_at).toLocaleString()}`
                                  : ''}
                              </span>
                            </div>
                            <span className="hdc-chip">{auditEntryChip(entry)}</span>
                          </div>
                        );
                      })
                    ) : updatedAt ? (
                      <div className="hdc-audit-item">
                        <span className="hdc-audit-ico">
                          <Check className="h-4 w-4" aria-hidden />
                        </span>
                        <div>
                          <b>Configuration saved</b>
                          <span>{new Date(updatedAt).toLocaleString()}</span>
                        </div>
                        <span className="hdc-chip">Config</span>
                      </div>
                    ) : (
                      <p className="hdc-muted">No saved configuration yet — using defaults.</p>
                    )}
                  </div>
                </div>

                <div className="hdc-card">
                  <div className="hdc-section-head">
                    <div>
                      <h2>Quick actions</h2>
                      <p>Administrative shortcuts</p>
                    </div>
                  </div>
                  <div className="hdc-quick-actions">
                    <Link to="/dashboard?tab=analytics" className="hdc-btn hdc-btn-secondary hdc-btn-block">
                      Preview impact on dashboard
                    </Link>
                    <button type="button" className="hdc-btn hdc-btn-secondary hdc-btn-block" onClick={exportJson}>
                      Export config JSON
                    </button>
                    <button type="button" className="hdc-btn hdc-btn-secondary hdc-btn-block" onClick={viewApiPayload}>
                      View API payload
                    </button>
                  </div>
                  {updatedAt ? (
                    <p className="hdc-last-saved">
                      <Check className="h-3.5 w-3.5" aria-hidden />
                      Last saved {new Date(updatedAt).toLocaleString()}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="hdc-card hdc-card-full">
              <div className="hdc-section-head">
                <div>
                  <h2>Rule activation matrix</h2>
                  <p>Enable or disable alert rules for governance and operating controls.</p>
                </div>
              </div>
              <div className="hdc-rule-grid">
                {primaryRules.map((rule) => {
                  const enabled = Boolean(ruleFlags[rule.flagKey]);
                  return (
                    <div key={rule.id} className="hdc-rule">
                      <div className="hdc-rule-head">
                        <h4>{rule.title}</h4>
                        <Switch
                          checked={enabled}
                          onCheckedChange={(checked) => toggleRuleFlag(rule.flagKey, checked)}
                          data-testid={`hiring-rule-toggle-${rule.id}`}
                          className="hdc-switch data-[state=checked]:bg-emerald-500"
                          aria-label={`Toggle ${rule.title}`}
                        />
                      </div>
                      <p>{rule.description}</p>
                    </div>
                  );
                })}
              </div>

              {extendedRules.length ? (
                <div className="hdc-extended-rules">
                  <h3>Extended alert rules</h3>
                  <div className="hdc-rule-grid hdc-rule-grid-extended">
                    {extendedRules.map((rule) => {
                      const enabled = Boolean(ruleFlags[rule.flagKey]);
                      return (
                        <div key={rule.id} className="hdc-rule">
                          <div className="hdc-rule-head">
                            <h4>{rule.title}</h4>
                            <Switch
                              checked={enabled}
                              onCheckedChange={(checked) => toggleRuleFlag(rule.flagKey, checked)}
                              data-testid={`hiring-rule-toggle-${rule.id}`}
                              className="hdc-switch data-[state=checked]:bg-emerald-500"
                              aria-label={`Toggle ${rule.title}`}
                            />
                          </div>
                          <p>{rule.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="hdc-llm-strip">
                <div>
                  <p className="hdc-llm-title">LLM-enhanced insights (Mistral AI)</p>
                  <p className="hdc-llm-desc">
                    Requires MISTRAL_API_KEY; runs on cached packs with separate LLM cache
                  </p>
                </div>
                <Switch
                  checked={llmInsightsEnabled}
                  onCheckedChange={setLlmInsightsEnabled}
                  data-testid="hiring-dashboard-llm-insights-toggle"
                  className="hdc-switch data-[state=checked]:bg-violet-600"
                />
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminHiringDashboardConfigPage;
