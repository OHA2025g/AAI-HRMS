import React from 'react';
import { Link } from 'react-router-dom';
import PipelineCandidateCard from './PipelineCandidateCard';
import {
  OFFER_STATUS_OPTIONS,
  buildSalaryAiGuidance,
  computeSalaryHeroMetrics,
  getOverallFitScore,
} from '../../lib/pipelineCommandUtils';

function offerBoxFallback(app) {
  const score = getOverallFitScore(app);
  const notice = app?.candidate?.notice_period_days;
  return {
    suggestedRange: '—',
    joiningProb: score != null ? `${Math.min(95, Math.max(45, score - 4))}%` : '—',
    notice: notice != null ? `${notice} days` : '—',
    risk: score != null && score >= 85 ? 'Counter-offer' : 'Competing offer',
  };
}

export default function PipelineSalaryTab({
  salaryApps,
  offerStatusParam,
  jobTitle,
  jobId,
  trajSummaries,
  trajLoading,
  onTrajRefresh,
  canUpdateOffer,
  onUpdateOfferStatus,
  canMarkJoined,
  onMarkJoined,
  updating,
}) {
  const heroMetrics = computeSalaryHeroMetrics(salaryApps);
  const aiGuidance = buildSalaryAiGuidance(salaryApps);

  if (!salaryApps.length) {
    return <div className="pl-empty">No candidates pending salary discussion.</div>;
  }

  return (
    <>
      {offerStatusParam ? (
        <p className="pl-filter-note">
          Filtered by offer status: <strong>{offerStatusParam.replace(/_/g, ' ')}</strong>
        </p>
      ) : null}

      <div className="pl-salary-hero">
        <div className="pl-hero-card">
          <h4>Salary Round Health</h4>
          <div className="pl-hero-big">
            {heroMetrics.count} <small>candidates</small>
          </div>
          <span className="pl-badge pl-badge-green">Ready for offer closure</span>
        </div>
        <div className="pl-hero-card">
          <h4>AI Offer Guidance</h4>
          <p>{aiGuidance}</p>
          <span className="pl-badge pl-badge-blue">Recommended action: fast-track offer</span>
        </div>
        <div className="pl-hero-card">
          <h4>Offer Progress</h4>
          <div className="pl-timeline-tracks">
            <div className="pl-lineitem">
              <span>Offer Sent</span>
              <div className="pl-track">
                <i style={{ width: `${heroMetrics.offerSentPct}%` }} />
              </div>
            </div>
            <div className="pl-lineitem">
              <span>Negotiation</span>
              <div className="pl-track">
                <i style={{ width: `${heroMetrics.negotiationPct}%` }} />
              </div>
            </div>
            <div className="pl-lineitem">
              <span>Joining Ready</span>
              <div className="pl-track">
                <i style={{ width: `${heroMetrics.joiningPct}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pl-grid-salary">
        {salaryApps.map((app) => {
          const offer = offerBoxFallback(app);
          const score = getOverallFitScore(app);
          const confidenceBadge =
            score != null && score >= 85 ? (
              <span className="pl-badge pl-badge-green pl-mt-8">High joining confidence</span>
            ) : (
              <span className="pl-badge pl-badge-orange pl-mt-8">Negotiation attention</span>
            );

          return (
            <div key={app.id} className="pl-salary-card-wrap">
              <PipelineCandidateCard
                app={app}
                jobTitle={jobTitle}
                jobId={jobId}
                trajSummary={trajSummaries[app.candidate_id]}
                trajLoading={trajLoading}
                onTrajRefresh={onTrajRefresh}
                variant="salary"
                stageBadge="SALARY"
                headerExtra={confidenceBadge}
              >
                <div className="pl-offer-box">
                  <div>
                    <label>Suggested Range</label>
                    <b>{offer.suggestedRange}</b>
                  </div>
                  <div>
                    <label>Joining Probability</label>
                    <b className="pl-green-text">{offer.joiningProb}</b>
                  </div>
                  <div>
                    <label>Notice Period</label>
                    <b>{offer.notice}</b>
                  </div>
                  <div>
                    <label>Risk</label>
                    <b className="pl-orange-text">{offer.risk}</b>
                  </div>
                </div>
                <div className="pl-ai-strip">
                  <span>✧ AI says: close within 48 hrs to reduce offer drop risk.</span>
                  <Link
                    to={`/ai-hiring/candidate-fit/career-trajectory?candidate_id=${app.candidate_id}&job_id=${jobId}`}
                    className="pl-btn pl-btn-ghost"
                  >
                    Analyze
                  </Link>
                </div>
                <div className="pl-status-row">
                  <select
                    className="pl-status-select"
                    value={app.offer_status || 'SENT'}
                    onChange={(e) => onUpdateOfferStatus(app.id, e.target.value)}
                    disabled={updating || !canUpdateOffer}
                    aria-label={`Offer status for ${app.candidate?.full_name || 'candidate'}`}
                  >
                    {OFFER_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </PipelineCandidateCard>
              <div className="pl-actions-row">
                <Link to={`/candidates/${app.candidate_id}`} className="pl-outline">
                  View Profile
                </Link>
                {canMarkJoined ? (
                  <button
                    type="button"
                    className="pl-success"
                    disabled={updating}
                    onClick={() => onMarkJoined(app.id)}
                  >
                    Mark Joined
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pl-insight-panel">
        <div className="pl-mini-card">
          <h3>Offer Budget Utilization</h3>
          <div className="pl-money">68%</div>
          <p>Current offers remain within approved compensation band for this role.</p>
        </div>
        <div className="pl-mini-card">
          <h3>Drop Risk Watch</h3>
          <div className="pl-money pl-orange-text">
            {salaryApps.length >= 2 ? '1 Candidate' : '0 Candidates'}
          </div>
          <p>
            {salaryApps.length >= 2
              ? 'Some candidates may require proactive engagement due to notice period or competing offers.'
              : 'Monitor offer acceptance signals as negotiations progress.'}
          </p>
        </div>
        <div className="pl-mini-card">
          <h3>Next Best Action</h3>
          <p>
            Schedule recruiter follow-up today, confirm salary expectations, and prepare revised offer
            scenario if required.
          </p>
        </div>
      </div>
    </>
  );
}
