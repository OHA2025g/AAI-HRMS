import React from 'react';
import {
  formatReferralStage,
  getFitPercent,
  getReferralStageClass,
  jobTitleForReferral,
} from '../../lib/referralsCommandUtils';

function ReferralCard({ referral, jobs }) {
  const fit = getFitPercent(referral);
  const chips = [];
  if (fit != null) chips.push(`${fit}% fit`);
  if (referral.candidate?.email) chips.push(referral.candidate.email);

  return (
    <article className="rf-ref-card" data-testid={`referral-card-${referral.id}`}>
      <div>
        <div className="rf-name">{referral.candidate?.full_name || 'Candidate'}</div>
        <div className="rf-meta">{jobTitleForReferral(referral, jobs)}</div>
        {referral.note ? <div className="rf-meta rf-note">&ldquo;{referral.note}&rdquo;</div> : null}
        <div className="rf-chips">
          {chips.map((c) => (
            <span key={c} className="rf-chip">
              {c}
            </span>
          ))}
        </div>
      </div>
      <span className={getReferralStageClass(referral.status)}>{formatReferralStage(referral.status)}</span>
    </article>
  );
}

export default function ReferralsPipelinePanel({ referrals, jobs, canRefer, onSubmitClick }) {
  const hasReferrals = (referrals || []).length > 0;

  return (
    <div className="rf-card" data-testid="referrals-pipeline-panel">
      <div className="rf-section-title">
        <h2>Referral pipeline</h2>
        <button type="button" className="rf-link">
          View all →
        </button>
      </div>

      {hasReferrals ? (
        <div className="rf-ref-list">
          {referrals.map((ref) => (
            <ReferralCard key={ref.id} referral={ref} jobs={jobs} />
          ))}
        </div>
      ) : (
        <div className="rf-empty">
          <div>
            <div className="rf-empty-icon" aria-hidden>
              ♧
            </div>
            <h3>No referrals yet</h3>
            <p>Submit your first referral and track the candidate from sourced to offer.</p>
            {canRefer ? (
              <button type="button" className="rf-primary-btn" onClick={onSubmitClick}>
                Submit Referral
              </button>
            ) : null}
          </div>
        </div>
      )}

      <div className="rf-cta">
        <div>
          <h3>AI will recommend best-fit roles</h3>
          <p>Once a referral is submitted, the system will map skills, experience, and job fit automatically.</p>
        </div>
        <button type="button" className="rf-btn">
          See matching logic
        </button>
      </div>
    </div>
  );
}
