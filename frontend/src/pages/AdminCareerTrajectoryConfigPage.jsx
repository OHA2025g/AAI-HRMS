import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Sparkles } from 'lucide-react';
import { careerTrajectoryApi, jobsApi } from '../lib/api';
import { OVERALL_WEIGHT_LABELS, SUB_WEIGHT_GROUPS } from '../lib/careerTrajectoryConfig';
import { cn } from '../lib/utils';
import {
  CHART_SHORT_LABELS,
  chartBarHeight,
  chartBarLeft,
  getBalancingRecommendations,
  getDimensionPreviewRows,
  getModelReadiness,
  percentToWeight,
  sumWeights,
  weightBarWidth,
  weightToPercent,
} from '../lib/careerTrajectoryConfigUtils';
import CareerTrajectoryConfigOrgFilterBar from '../components/admin/career-trajectory-config/CareerTrajectoryConfigOrgFilterBar';
import { SMART_HIRING_ONLY } from '../config/appModules';

const TABS = [
  { id: 'overall', label: 'Overall weights' },
  { id: 'sub', label: 'Dimension sub-weights' },
  { id: 'fairness', label: 'Fairness guardrails' },
  { id: 'training', label: 'Training history' },
];

const buildDefaultSubWeights = () => {
  const out = {};
  SUB_WEIGHT_GROUPS.forEach((g) => {
    out[g.dimension] = {};
    g.fields.forEach((f) => {
      out[g.dimension][f.key] = f.defaultWeight;
    });
  });
  return out;
};

const buildDefaultWeights = () => {
  const out = {};
  OVERALL_WEIGHT_LABELS.forEach(({ key, defaultWeight }) => {
    out[key] = defaultWeight;
  });
  return out;
};

const AdminCareerTrajectoryConfigPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [training, setTraining] = useState(false);
  const [activeTab, setActiveTab] = useState('overall');
  const [weights, setWeights] = useState(buildDefaultWeights);
  const [subWeights, setSubWeights] = useState(buildDefaultSubWeights);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [fairness, setFairness] = useState(null);
  const [openJobs, setOpenJobs] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await careerTrajectoryApi.getConfig();
      const ow = res.data?.overall_weights || {};
      setWeights({ ...buildDefaultWeights(), ...ow });
      setSubWeights({ ...buildDefaultSubWeights(), ...(res.data?.sub_weights || {}) });
      setUpdatedAt(res.data?.updated_at || null);
      try {
        const fair = await careerTrajectoryApi.getFairnessSummary({ limit: 500, days: 90 });
        setFairness(fair.data);
      } catch {
        setFairness(null);
      }
    } catch {
      toast.error('Failed to load career trajectory scoring config');
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

  const weightSum = useMemo(() => sumWeights(weights), [weights]);
  const weightSumPct = Math.round(weightSum * 100);
  const weightSumOk = Math.abs(weightSum - 1) <= 0.02;
  const readiness = useMemo(
    () => getModelReadiness({ weightSum, fairness }),
    [weightSum, fairness]
  );
  const balancing = useMemo(() => getBalancingRecommendations(weights), [weights]);
  const dimensionPreview = useMemo(() => getDimensionPreviewRows(weights), [weights]);

  const resetDefaults = () => {
    setWeights(buildDefaultWeights());
    setSubWeights(buildDefaultSubWeights());
  };

  const save = async () => {
    if (!weightSumOk) {
      toast.error('Overall weights should sum to approximately 100%');
      return;
    }
    setSaving(true);
    try {
      const payload = { overall_weights: {}, sub_weights: {} };
      OVERALL_WEIGHT_LABELS.forEach(({ key }) => {
        payload.overall_weights[key] = Number(weights[key]) || 0;
      });
      SUB_WEIGHT_GROUPS.forEach((g) => {
        payload.sub_weights[g.dimension] = {};
        g.fields.forEach((f) => {
          payload.sub_weights[g.dimension][f.key] = Number(subWeights[g.dimension]?.[f.key]) || 0;
        });
      });
      await careerTrajectoryApi.updateConfig(payload);
      toast.success('Career trajectory saved');
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const downloadTrainingExport = async () => {
    try {
      const res = await careerTrajectoryApi.exportTraining({ format: 'csv', limit: 200 });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'career-trajectory-training.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Training export failed');
    }
  };

  const trainMl = async (labelSource = 'trajectory') => {
    setTraining(true);
    try {
      const res = await careerTrajectoryApi.trainMlCalibration(200, labelSource);
      toast.success(
        `ML trained (${res.data?.samples || 0} samples, ${labelSource === 'hr' ? 'HR stage' : 'trajectory'} labels)`
      );
    } catch (e) {
      toast.error(e?.response?.data?.detail?.message || e?.response?.data?.detail || 'Train failed');
    } finally {
      setTraining(false);
    }
  };

  const updateWeightPercent = (key, percentValue) => {
    setWeights((prev) => ({ ...prev, [key]: percentToWeight(percentValue) }));
  };

  const renderWeightActions = () => (
    <div className="ctw-actions">
      <button type="button" className="ctw-btn ctw-btn-primary" onClick={save} disabled={saving || loading} data-testid="career-traj-config-save">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        Save all weights
      </button>
      <button type="button" className="ctw-btn" onClick={resetDefaults}>
        Reset to defaults
      </button>
      <button type="button" className="ctw-btn" onClick={() => trainMl('trajectory')} disabled={training}>
        Train ML (trajectory)
      </button>
      <button type="button" className="ctw-btn" onClick={() => trainMl('hr')} disabled={training}>
        Train ML (HR outcomes)
      </button>
    </div>
  );

  return (
    <div className="hiring-dashboard-root top-operational ctw-root" data-testid="career-traj-config-command-root">
      {SMART_HIRING_ONLY ? (
        <header className="ctw-topbar" aria-label="Career trajectory filters">
          <div className="ctw-topbar-left">
            <div className="ctw-page-label">Career trajectory</div>
            <CareerTrajectoryConfigOrgFilterBar jobs={openJobs} />
          </div>
        </header>
      ) : null}

      <div className="ctw-content">
        <div className="ctw-header">
          <div>
            <div className="ctw-eyebrow">
              <Sparkles className="h-5 w-5" aria-hidden />
              <span>AI Hiring Intelligence</span>
            </div>
            <h1>Career trajectory scoring</h1>
            <p>
              Adjust composite and dimension sub-weights used by the trajectory model. Changes apply to all new
              analyses.
            </p>
            <Link to="/ai-hiring/candidate-fit/career-trajectory" className="ctw-link">
              Open trajectory analyzer →
            </Link>
          </div>
          <div className="ctw-header-actions">
            <button type="button" className="ctw-btn" onClick={downloadTrainingExport}>
              Download training export
            </button>
            <button type="button" className="ctw-btn ctw-btn-green" onClick={() => trainMl('trajectory')} disabled={training}>
              Train ML
            </button>
            <button type="button" className="ctw-btn ctw-btn-primary" onClick={save} disabled={saving || loading} data-testid="career-traj-config-save-top">
              Save all weights
            </button>
          </div>
        </div>

        <div className="ctw-fairness-row">
          <div className="ctw-score-card" data-testid="career-traj-fairness-dashboard">
            <div>
              <h3>Fairness monitoring</h3>
              <p>Aggregated DEI guardrail results across trajectory reports in the last 90 days.</p>
            </div>
            <div className="ctw-metric-row">
              <div className="ctw-metric">
                <span>Reports sampled</span>
                <b>{fairness?.total_reports ?? '—'}</b>
              </div>
              <div className="ctw-metric">
                <span>Passed</span>
                <b className="ctw-pass">{fairness?.passed ?? '—'}</b>
              </div>
              <div className="ctw-metric">
                <span>Review required</span>
                <b>{fairness?.review_required ?? '—'}</b>
              </div>
              <div className="ctw-metric">
                <span>Pass rate</span>
                <b>{fairness?.pass_rate_pct != null ? `${fairness.pass_rate_pct}%` : '—'}</b>
              </div>
            </div>
          </div>

          <div className="ctw-card">
            <h3>Model readiness</h3>
            <p>Weight total, fairness review, and export status.</p>
            <div className="ctw-training-row">
              <div className="ctw-train">
                <span className={cn('ctw-tag', readiness.weightSumOk ? 'green' : 'orange')}>
                  {readiness.weightSumOk ? 'OK' : 'Review'}
                </span>
                <b>{readiness.weightSum}</b>
                <p>Weight sum</p>
              </div>
              <div className="ctw-train">
                <span className={cn('ctw-tag', readiness.guardrailsReview ? 'orange' : 'green')}>
                  {readiness.guardrailsReview ? 'Review' : 'OK'}
                </span>
                <b>{readiness.guardrails}</b>
                <p>Guardrails</p>
              </div>
              <div className="ctw-train">
                <span className="ctw-tag blue">Ready</span>
                <b>{readiness.dimensions}</b>
                <p>Dimensions</p>
              </div>
              <div className="ctw-train">
                <span className="ctw-tag purple">Live</span>
                <b>{readiness.scoringPack}</b>
                <p>Scoring pack</p>
              </div>
            </div>
          </div>
        </div>

        <div className="ctw-tabs" role="tablist" aria-label="Configuration sections">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={cn('ctw-tab', activeTab === tab.id && 'active')}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="ctw-loading">
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
          </div>
        ) : (
          <>
            {activeTab === 'overall' ? (
              <>
                <section className="ctw-weight-panel">
                  <div className="ctw-card">
                    <div className="ctw-section-head">
                      <div>
                        <h3>Overall score weights</h3>
                        <p>
                          Sum must equal 100.
                          {updatedAt ? ` Last updated ${new Date(updatedAt).toLocaleString()}.` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="ctw-form-grid">
                      {OVERALL_WEIGHT_LABELS.map(({ key, label }) => (
                        <div key={key} className="ctw-weight-item">
                          <label htmlFor={`w-${key}`}>{label}</label>
                          <div className="ctw-progress">
                            <i style={{ width: weightBarWidth(weights[key]) }} />
                          </div>
                          <input
                            id={`w-${key}`}
                            type="number"
                            min={0}
                            max={100}
                            value={weightToPercent(weights[key])}
                            onChange={(e) => updateWeightPercent(key, e.target.value)}
                          />
                          <span className="ctw-pct">%</span>
                        </div>
                      ))}
                    </div>
                    <div className={cn('ctw-total', weightSumOk && 'ok')}>
                      <span>Total configured weight</span>
                      <b>{weightSumPct}%</b>
                    </div>
                    {renderWeightActions()}
                  </div>

                  <div className="ctw-side-stack">
                    <div className="ctw-card">
                      <h3>Weight distribution</h3>
                      <p>Visual check to avoid over-indexing on any single signal.</p>
                      <div className="ctw-distribution">
                        {OVERALL_WEIGHT_LABELS.map(({ key }, index) => (
                          <div
                            key={key}
                            className="ctw-bar"
                            style={{
                              left: chartBarLeft(index, OVERALL_WEIGHT_LABELS.length),
                              height: chartBarHeight(weights[key]),
                            }}
                          >
                            <span>{weightToPercent(weights[key])}</span>
                            <label>{CHART_SHORT_LABELS[key] || key}</label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="ctw-card ctw-dimension-card">
                      <h3>Recommended balancing</h3>
                      <p>AI checks across hiring maturity, role complexity, and fairness signals.</p>
                      {balancing.map((item) => (
                        <div key={item.title} className="ctw-dim">
                          <div>
                            <b>{item.title}</b>
                            <p>{item.description}</p>
                          </div>
                          <span>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="ctw-grid-two">
                  <div className="ctw-card">
                    <h3>Dimension sub-weight preview</h3>
                    <p>Preview of how each high-level dimension can be decomposed into sub-signals.</p>
                    <div className="ctw-audit">
                      {dimensionPreview.map((row) => (
                        <div key={row.key} className="ctw-audit-row">
                          <div>
                            <b>{row.title}</b>
                            <p>{row.description}</p>
                          </div>
                          <span className={cn('ctw-tag', row.tagClass)}>{row.tag}</span>
                          <b>{row.percent}%</b>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="ctw-card">
                    <h3>Audit & governance trail</h3>
                    <p>Configuration controls for admin review and model governance.</p>
                    <div className="ctw-audit">
                      <div className="ctw-audit-row">
                        <div>
                          <b>Last configuration change</b>
                          <p>
                            {updatedAt
                              ? `${new Date(updatedAt).toLocaleString()} by QA Admin`
                              : 'No saved configuration yet'}
                          </p>
                        </div>
                        <span className="ctw-tag green">{updatedAt ? 'Saved' : 'Default'}</span>
                        <b>v2</b>
                      </div>
                      <div className="ctw-audit-row">
                        <div>
                          <b>Fairness guardrail review</b>
                          <p>
                            {fairness?.review_required
                              ? `${fairness.review_required} reports require manual review before model promotion.`
                              : 'No open guardrail reviews.'}
                          </p>
                        </div>
                        <span className={cn('ctw-tag', fairness?.review_required ? 'orange' : 'green')}>
                          {fairness?.review_required ? 'Open' : 'Clear'}
                        </span>
                        <b>{fairness?.review_required ?? 0}</b>
                      </div>
                      <div className="ctw-audit-row">
                        <div>
                          <b>Training export</b>
                          <p>Export current weights, samples, and scored outcomes.</p>
                        </div>
                        <span className="ctw-tag blue">Ready</span>
                        <button type="button" className="ctw-btn ctw-btn-sm" onClick={downloadTrainingExport}>
                          Export
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              </>
            ) : null}

            {activeTab === 'sub' ? (
              <section className="ctw-sub-grid">
                {SUB_WEIGHT_GROUPS.map((group) => (
                  <div key={group.dimension} className="ctw-card">
                    <h3>{group.label}</h3>
                    <div className="ctw-form-grid">
                      {group.fields.map((f) => (
                        <div key={f.key} className="ctw-weight-item ctw-weight-item-sub">
                          <label htmlFor={`sw-${group.dimension}-${f.key}`}>{f.label}</label>
                          <div className="ctw-progress">
                            <i
                              style={{
                                width: weightBarWidth(subWeights[group.dimension]?.[f.key], 50),
                              }}
                            />
                          </div>
                          <input
                            id={`sw-${group.dimension}-${f.key}`}
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={weightToPercent(subWeights[group.dimension]?.[f.key])}
                            onChange={(e) =>
                              setSubWeights((prev) => ({
                                ...prev,
                                [group.dimension]: {
                                  ...(prev[group.dimension] || {}),
                                  [f.key]: percentToWeight(e.target.value),
                                },
                              }))
                            }
                          />
                          <span className="ctw-pct">%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {renderWeightActions()}
              </section>
            ) : null}

            {activeTab === 'fairness' ? (
              <section className="ctw-card" data-testid="career-traj-fairness-tab">
                <h3>Fairness guardrails</h3>
                <p>DEI guardrail outcomes and review queue for trajectory reports in the last 90 days.</p>
                <div className="ctw-metric-row ctw-metric-row-spaced">
                  <div className="ctw-metric">
                    <span>Reports sampled</span>
                    <b>{fairness?.total_reports ?? 0}</b>
                  </div>
                  <div className="ctw-metric">
                    <span>Passed</span>
                    <b className="ctw-pass">{fairness?.passed ?? 0}</b>
                  </div>
                  <div className="ctw-metric">
                    <span>Review required</span>
                    <b>{fairness?.review_required ?? 0}</b>
                  </div>
                  <div className="ctw-metric">
                    <span>Pass rate</span>
                    <b>{fairness?.pass_rate_pct ?? 0}%</b>
                  </div>
                </div>
                <div className="ctw-audit ctw-audit-spaced">
                  <div className="ctw-audit-row">
                    <div>
                      <b>Tenure stability bias check</b>
                      <p>Keep tenure stability below 12% to reduce bias risk.</p>
                    </div>
                    <span className={cn('ctw-tag', weightToPercent(weights.tenure_stability) < 12 ? 'green' : 'orange')}>
                      {weightToPercent(weights.tenure_stability) < 12 ? 'OK' : 'Review'}
                    </span>
                    <b>{weightToPercent(weights.tenure_stability)}%</b>
                  </div>
                  <div className="ctw-audit-row">
                    <div>
                      <b>Manual review queue</b>
                      <p>Reports flagged for admin review before model promotion.</p>
                    </div>
                    <span className={cn('ctw-tag', fairness?.review_required ? 'orange' : 'green')}>
                      {fairness?.review_required ? 'Open' : 'Clear'}
                    </span>
                    <b>{fairness?.review_required ?? 0}</b>
                  </div>
                </div>
              </section>
            ) : null}

            {activeTab === 'training' ? (
              <section className="ctw-card">
                <h3>Training history</h3>
                <p>Export labeled samples and run ML calibration for trajectory scoring.</p>
                <div className="ctw-training-row ctw-training-row-spaced">
                  <div className="ctw-train">
                    <span className="ctw-tag blue">Export</span>
                    <b>CSV</b>
                    <p>Training samples</p>
                  </div>
                  <div className="ctw-train">
                    <span className="ctw-tag purple">Trajectory</span>
                    <b>200</b>
                    <p>Sample limit</p>
                  </div>
                  <div className="ctw-train">
                    <span className="ctw-tag green">HR</span>
                    <b>200</b>
                    <p>HR outcome limit</p>
                  </div>
                  <div className="ctw-train">
                    <span className="ctw-tag orange">Last saved</span>
                    <b>{updatedAt ? new Date(updatedAt).toLocaleDateString() : '—'}</b>
                    <p>Config version</p>
                  </div>
                </div>
                {renderWeightActions()}
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminCareerTrajectoryConfigPage;
