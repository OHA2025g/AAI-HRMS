import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PipelineCandidateCard from './PipelineCandidateCard';
import { buildInterviewInsights, getOverallFitScore } from '@/shared/lib/pipelineCommandUtils';

export default function PipelineInterviewTab({
  interviewApps,
  jobTitle,
  jobId,
  trajSummaries,
  trajLoading,
  onTrajRefresh,
  canMoveToOffer,
  canRequestOffer,
  onMoveToOffer,
  onRequestOffer,
  pendingProposalByAppId,
  updating,
}) {
  const insights = buildInterviewInsights(interviewApps);
  const [selectedId, setSelectedId] = useState(interviewApps[0]?.id || null);

  const selectedApp = useMemo(
    () => interviewApps.find((a) => a.id === selectedId) || interviewApps[0],
    [interviewApps, selectedId]
  );

  const stageLabel = (app) => (app?.stage || 'INTERVIEW').replace(/_/g, ' ');

  if (!interviewApps.length) {
    return (
      <div className="pl-empty pl-empty-interview">
        No candidates in interview rounds yet. They appear here after assessment is cleared and they enter
        Interview 1 (or later). Use Assessment Round → Cleared assessment to move them forward.
      </div>
    );
  }

  return (
    <>
      <div className="pl-insight-row">
        <div className="pl-insight">
          <h4>🧠 AI Interview Insight</h4>
          <p>{insights.aiInsight}</p>
        </div>
        <div className="pl-insight">
          <h4>Interview Status</h4>
          <div className="pl-num pl-purple">{insights.activeCount} Active</div>
          <p>Round 1 interview pending closure</p>
        </div>
        <div className="pl-insight">
          <h4>Panel Readiness</h4>
          <div className="pl-num pl-green">{insights.panelReadiness != null ? `${insights.panelReadiness}%` : '—'}</div>
          <p>Slots available this week</p>
        </div>
        <div className="pl-insight">
          <h4>SLA Risk</h4>
          <div className="pl-num pl-orange">{insights.slaRisk}</div>
          <p>Feedback due within 24 hours</p>
        </div>
      </div>

      <div className="pl-board-interview">
        <div className="pl-interview-list">
          {interviewApps.map((app) => (
            <button
              key={app.id}
              type="button"
              className={`pl-interview-select ${selectedId === app.id ? 'active' : ''}`}
              onClick={() => setSelectedId(app.id)}
            >
              {app.candidate?.full_name || 'Candidate'} · {getOverallFitScore(app) ?? '—'}%
            </button>
          ))}
        </div>

        {selectedApp ? (
          <div className="pl-board-interview-main">
            <PipelineCandidateCard
              app={selectedApp}
              jobTitle={jobTitle}
              jobId={jobId}
              trajSummary={trajSummaries[selectedApp.candidate_id]}
              trajLoading={trajLoading}
              onTrajRefresh={onTrajRefresh}
              variant="interview"
              stageBadge={stageLabel(selectedApp)}
              footer={
                <>
                  <div className="pl-split">
                    <Link to={`/candidates/${selectedApp.candidate_id}`} className="pl-action-secondary">
                      View Profile
                    </Link>
                    <Link to="/interviews" className="pl-action-secondary">
                      Schedule / Manage
                    </Link>
                  </div>
                  {canMoveToOffer ? (
                    <button
                      type="button"
                      className="pl-action-primary pl-full"
                      disabled={updating}
                      onClick={() => onMoveToOffer(selectedApp.id)}
                    >
                      Move to Offer →
                    </button>
                  ) : canRequestOffer ? (
                    <button
                      type="button"
                      className="pl-action-primary pl-full"
                      disabled={updating || Boolean(pendingProposalByAppId[selectedApp.id])}
                      onClick={() => onRequestOffer(selectedApp)}
                      data-testid={`request-offer-${selectedApp.id}`}
                    >
                      {pendingProposalByAppId[selectedApp.id] ? 'Offer approval pending' : 'Request offer approval'}
                    </button>
                  ) : null}
                </>
              }
            />

            <section className="pl-card pl-panel">
              <h3>Interview Schedule &amp; Panel</h3>
              <div className="pl-schedule-card">
                <p className="pl-muted">Recommended slot</p>
                <div className="pl-time">Schedule via Interviews</div>
                <p className="pl-muted pl-schedule-note">
                  Use the Interviews module to book panel slots and assign interviewers.
                </p>
              </div>
              <div className="pl-timeline">
                <div className="pl-slot">
                  <time>—</time>
                  <div>
                    <b>Candidate briefing</b>
                    <small>Recruiter shares role context and expectations</small>
                  </div>
                </div>
                <div className="pl-slot">
                  <time>—</time>
                  <div>
                    <b>Panel interview</b>
                    <small>Technical and behavioral evaluation</small>
                  </div>
                </div>
                <div className="pl-slot">
                  <time>—</time>
                  <div>
                    <b>Feedback consolidation</b>
                    <small>Panel decision and next-step recommendation</small>
                  </div>
                </div>
              </div>
              <div className="pl-ai-box-green">
                <b>AI Recommendation</b>
                <p>
                  Ask one structured case question on role prioritization and one behavioral question on
                  stakeholder escalation.
                </p>
              </div>
              <div className="pl-note-warn">
                <b>Pending:</b> Interview feedback may not be submitted yet. Update via Interviews module.
              </div>
            </section>

            <section className="pl-card pl-evaluation">
              <h3>Interview Evaluation</h3>
              <div className="pl-score-grid">
                {['Technical Depth', 'Role Alignment', 'Communication', 'Culture Fit'].map((label, i) => {
                  const pct = [88, 92, 84, 90][i];
                  return (
                    <div key={label} className="pl-score-row">
                      <div>
                        <b>{label}</b>
                        <div className="pl-mini-bar">
                          <i style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <b>{pct}%</b>
                    </div>
                  );
                })}
              </div>
              <div className="pl-feedback">
                <h4>Panel Feedback Notes</h4>
                <textarea
                  placeholder="Capture structured feedback, concerns, strengths and final recommendation..."
                  readOnly
                  aria-readonly="true"
                />
              </div>
              <div className="pl-decision">
                <button type="button" className="pl-reject" disabled>
                  Hold / Reject
                </button>
                <button type="button" className="pl-action-primary" disabled>
                  Recommend Offer
                </button>
              </div>
              <button type="button" className="pl-action-secondary pl-full" disabled>
                Save Feedback Draft
              </button>
              <p className="pl-muted pl-eval-note">Evaluation scores are illustrative — connect Interviews module for live data.</p>
            </section>
          </div>
        ) : null}
      </div>
    </>
  );
}
