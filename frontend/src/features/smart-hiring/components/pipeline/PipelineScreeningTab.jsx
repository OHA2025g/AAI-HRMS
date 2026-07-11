import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PipelineCandidateCard from './PipelineCandidateCard';
import {
  appsForStages,
  computeScreeningKpis,
  getOverallFitScore,
  extractSkills,
} from '@/shared/lib/pipelineCommandUtils';

export default function PipelineScreeningTab({
  pipeline,
  screeningApps,
  jobTitle,
  jobId,
  trajSummaries,
  trajLoading,
  onTrajRefresh,
  canMoveToAssessment,
  onMoveToAssessment,
  updating,
}) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(screeningApps[0]?.id || null);

  const kpis = computeScreeningKpis(screeningApps);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return screeningApps;
    return screeningApps.filter((app) => {
      const name = app.candidate?.full_name?.toLowerCase() || '';
      const email = app.candidate?.email?.toLowerCase() || '';
      return name.includes(q) || email.includes(q);
    });
  }, [screeningApps, search]);

  const sortedQueue = useMemo(
    () =>
      [...screeningApps].sort(
        (a, b) => (getOverallFitScore(b) ?? 0) - (getOverallFitScore(a) ?? 0)
      ),
    [screeningApps]
  );

  const alsoMoved = useMemo(() => {
    const assessment = appsForStages(pipeline, ['ASSESSMENT_SENT', 'ASSESSMENT_CLEARED']);
    return assessment.slice(0, 4);
  }, [pipeline]);

  const activeApp = screeningApps.find((a) => a.id === selectedId) || filtered[0] || screeningApps[0];
  const activeSkills = activeApp ? extractSkills(activeApp, activeApp.candidate) : [];

  return (
    <>
      <div className="pl-summary-grid">
        <div className="pl-card pl-kpi">
          <small>Screening candidates</small>
          <b>{kpis.count}</b>
          <span className="pl-up">Fit score above threshold</span>
        </div>
        <div className="pl-card pl-kpi">
          <small>Avg AI Fit</small>
          <b>{kpis.avgFit != null ? `${kpis.avgFit}%` : '—'}</b>
          <span className="pl-warn">Good match</span>
        </div>
        <div className="pl-card pl-kpi">
          <small>Pending action</small>
          <b>{kpis.pending}</b>
          <span className="pl-down">Decision required</span>
        </div>
        <div className="pl-card pl-kpi">
          <small>Recommended action</small>
          <b>{kpis.recommendedAction}</b>
          <span className="pl-up">{kpis.recommendedTarget}</span>
        </div>
      </div>

      <div className="pl-layout-screening">
        <aside className="pl-card pl-panel">
          <h3>Screening Queue</h3>
          <div className="pl-list">
            {sortedQueue.length === 0 ? (
              <p className="pl-muted">No candidates in screening.</p>
            ) : (
              sortedQueue.map((app) => (
                <button
                  key={app.id}
                  type="button"
                  className={`pl-mini-card ${selectedId === app.id ? 'active' : ''}`}
                  onClick={() => setSelectedId(app.id)}
                >
                  <div>
                    <b>{app.candidate?.full_name || 'Candidate'}</b>
                    <span>{jobTitle}</span>
                  </div>
                  <div className="pl-score-chip">
                    {getOverallFitScore(app) != null ? `${getOverallFitScore(app)}%` : '—'}
                  </div>
                </button>
              ))
            )}
            {alsoMoved.map((app) => (
              <div key={app.id} className="pl-mini-card pl-mini-card-muted">
                <div>
                  <b>{app.candidate?.full_name || 'Candidate'}</b>
                  <span>Already moved to Assessment</span>
                </div>
                <div className="pl-score-chip">
                  {getOverallFitScore(app) != null ? `${getOverallFitScore(app)}%` : '—'}
                </div>
              </div>
            ))}
          </div>
          {activeApp ? (
            <div className="pl-insight pl-insight-blue pl-insight-sidebar">
              <b>Screening insight</b>
              <p>
                {activeSkills.length >= 2
                  ? `Strong alignment with ${activeSkills.slice(0, 3).join(', ')} requirements.`
                  : 'Review fit dimensions before moving to assessment.'}
              </p>
            </div>
          ) : null}
        </aside>

        <section>
          <div className="pl-toolbar">
            <input
              className="pl-search"
              placeholder="Search screening candidates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="pl-select pl-select-inline" defaultValue="fit">
              <option value="fit">Sort: AI Fit Score</option>
            </select>
            <button type="button" className="pl-btn">
              Filters
            </button>
          </div>

          {filtered.length === 0 ? (
            <div className="pl-empty">No candidates in Screening Round.</div>
          ) : (
            <div className="pl-candidate-grid">
              {filtered.map((app) => (
                <PipelineCandidateCard
                  key={app.id}
                  app={app}
                  jobTitle={jobTitle}
                  jobId={jobId}
                  trajSummary={trajSummaries[app.candidate_id]}
                  trajLoading={trajLoading}
                  onTrajRefresh={onTrajRefresh}
                  variant="screening"
                  stageBadge="SCREENING"
                  footer={
                    <div className="pl-candidate-actions">
                      <Link to={`/candidates/${app.candidate_id}`} className="pl-btn">
                        View Profile
                      </Link>
                      <button type="button" className="pl-btn pl-btn-success" disabled={updating}>
                        Approve
                      </button>
                      {canMoveToAssessment ? (
                        <button
                          type="button"
                          className="pl-btn pl-btn-primary"
                          disabled={updating}
                          onClick={() => onMoveToAssessment(app.id)}
                          data-testid={`screening-select-${app.id}`}
                        >
                          Move to Assessment
                        </button>
                      ) : null}
                    </div>
                  }
                />
              ))}

              <article className="pl-card pl-candidate pl-candidate-screening pl-ai-rec-card">
                <div className="pl-candidate-head">
                  <div className="pl-person">
                    <div className="pl-photo">AI</div>
                    <div>
                      <h3>AI Screening Recommendation</h3>
                      <p>Decision support for the current round</p>
                    </div>
                  </div>
                  <span className="pl-badge-stage">ACTION</span>
                </div>
                <div className="pl-insights-row">
                  <div className="pl-insight pl-insight-blue">
                    <b>Why shortlist?</b>
                    <p>
                      {activeSkills.length
                        ? `Candidate has strong alignment with ${activeSkills.slice(0, 3).join(', ')} requirements.`
                        : 'Review AI fit score and matched skills before advancing.'}
                    </p>
                  </div>
                  <div className="pl-insight pl-insight-orange">
                    <b>What to verify?</b>
                    <p>
                      Validate role ownership, domain exposure and leadership experience during assessment.
                    </p>
                  </div>
                </div>
                <div className="pl-match">
                  <div className="pl-barline">
                    <span>Confidence</span>
                    <div className="pl-bar">
                      <i style={{ width: '84%' }} />
                    </div>
                    <b>84%</b>
                  </div>
                  <div className="pl-barline">
                    <span>Risk</span>
                    <div className="pl-bar pl-bar-warn">
                      <i style={{ width: '24%' }} />
                    </div>
                    <b>Low</b>
                  </div>
                </div>
                <div className="pl-candidate-actions pl-candidate-actions-2">
                  <button type="button" className="pl-btn">
                    Generate Notes
                  </button>
                  <button type="button" className="pl-btn pl-btn-primary">
                    Create Assessment Brief
                  </button>
                </div>
              </article>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
