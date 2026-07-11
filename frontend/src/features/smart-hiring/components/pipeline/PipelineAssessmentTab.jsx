import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import PipelineCandidateCard from './PipelineCandidateCard';
import CopyTakeLinkButton from '../assessments/CopyTakeLinkButton';
import { computeAssessmentMetrics } from '@/shared/lib/pipelineCommandUtils';

export default function PipelineAssessmentTab({
  selectedJob,
  assessmentSentApps,
  clearedApps,
  jobTitle,
  jobId,
  trajSummaries,
  trajLoading,
  onTrajRefresh,
  activeAssessments,
  assessmentsLoading,
  showMissingAssessmentAlert,
  selectedAssessment,
  jobAssessments,
  selectedAssessmentId,
  onAssessmentSelect,
  submissions,
  submissionForApp,
  canSendInvite,
  onSendInvite,
  canMarkCleared,
  onMarkCleared,
  canMoveToInterview,
  onMoveToInterview,
  updating,
}) {
  const metrics = computeAssessmentMetrics(assessmentSentApps, submissions);

  return (
    <>
      {showMissingAssessmentAlert ? (
        <div className="pl-alert-banner" data-testid="pipeline-missing-assessment-alert">
          <AlertTriangle className="pl-alert-icon" aria-hidden />
          <div>
            <b>No active assessment for this job</b>
            <p>
              {assessmentSentApps.length} candidate{assessmentSentApps.length === 1 ? '' : 's'} in assessment
              round cannot be invited until you publish an assessment for this job.
            </p>
          </div>
          <Link to={`/assessments?tab=library&job_id=${selectedJob}`} className="pl-btn pl-btn-warn">
            Create assessment
          </Link>
        </div>
      ) : null}

      <section className="pl-assessment-banner">
        <div className="pl-banner-title">
          <span className="pl-status-pill">
            {activeAssessments.length} assessment{activeAssessments.length === 1 ? '' : 's'} available
          </span>
          <b>Technical Assessment for {jobTitle}</b>
          <p>Invite pending candidates, copy links, monitor completion, and mark cleared candidates for interview.</p>
          {activeAssessments.length > 1 ? (
            <select
              className="pl-select pl-select-banner"
              value={selectedAssessmentId}
              onChange={(e) => onAssessmentSelect(e.target.value)}
              data-testid="pipeline-assessment-select"
            >
              {activeAssessments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                  {a.is_primary ? ' (primary)' : ''}
                </option>
              ))}
            </select>
          ) : selectedAssessment ? (
            <p className="pl-muted pl-banner-assessment-name">{selectedAssessment.title}</p>
          ) : null}
        </div>
        <div className="pl-metric-row">
          <div className="pl-mini-metric">
            <b>{metrics.inAssessment}</b>
            <span>In assessment</span>
          </div>
          <div className="pl-mini-metric">
            <b>{metrics.invitesSent}</b>
            <span>Invites sent</span>
          </div>
          <div className="pl-mini-metric">
            <b>{metrics.inProgress}</b>
            <span>In progress</span>
          </div>
        </div>
        <div>
          <Link to={`/assessments?tab=library&job_id=${selectedJob}`} className="pl-btn pl-btn-primary">
            View assessments
          </Link>
        </div>
      </section>

      {assessmentSentApps.length === 0 && clearedApps.length === 0 ? (
        <div className="pl-empty">No candidates in Assessment Round.</div>
      ) : (
        <>
          {assessmentSentApps.length > 0 ? (
            <section className="pl-grid-assessment">
              {assessmentSentApps.map((app) => {
                const sub = submissionForApp(app);
                return (
                  <PipelineCandidateCard
                    key={app.id}
                    app={app}
                    jobTitle={jobTitle}
                    jobId={jobId}
                    trajSummary={trajSummaries[app.candidate_id]}
                    trajLoading={trajLoading}
                    onTrajRefresh={onTrajRefresh}
                    variant="assessment"
                    stageBadge="ASSESSMENT"
                    headerExtra={
                      sub?.status ? (
                        <span className="pl-state">{sub.status}</span>
                      ) : null
                    }
                    footer={
                      <>
                        <div className="pl-actions2">
                          {sub?.take_url ? (
                            <CopyTakeLinkButton takeUrl={sub.take_url} className="pl-btn pl-btn-block" />
                          ) : (
                            <Link to={`/candidates/${app.candidate_id}`} className="pl-btn">
                              View Profile
                            </Link>
                          )}
                          {canSendInvite ? (
                            <button
                              type="button"
                              className="pl-btn"
                              disabled={!activeAssessments.length || updating}
                              onClick={() => onSendInvite(app)}
                            >
                              {sub ? 'Resend invite' : 'Send assessment'}
                            </button>
                          ) : (
                            <Link to={`/candidates/${app.candidate_id}`} className="pl-btn">
                              View Profile
                            </Link>
                          )}
                        </div>
                        {canMarkCleared ? (
                          <button
                            type="button"
                            className="pl-btn pl-btn-cta pl-btn-block"
                            disabled={updating}
                            onClick={() => onMarkCleared(app)}
                            data-testid={`mark-cleared-${app.id}`}
                          >
                            Mark Cleared
                          </button>
                        ) : null}
                      </>
                    }
                  />
                );
              })}
            </section>
          ) : null}

          {clearedApps.length > 0 ? (
            <div className="pl-cleared-section">
              <div className="pl-cleared-heading">
                <b>Cleared assessment</b>
                <p>Schedule an interview, then move candidates into the Interview tab.</p>
              </div>
              <section className="pl-grid-assessment">
                {clearedApps.map((app) => (
                  <PipelineCandidateCard
                    key={app.id}
                    app={app}
                    jobTitle={jobTitle}
                    jobId={jobId}
                    trajSummary={trajSummaries[app.candidate_id]}
                    trajLoading={trajLoading}
                    onTrajRefresh={onTrajRefresh}
                    variant="assessment"
                    stageBadge="CLEARED"
                    footer={
                      <>
                        <div className="pl-actions2">
                          <Link to={`/candidates/${app.candidate_id}`} className="pl-btn">
                            View Profile
                          </Link>
                          <Link to="/interviews" className="pl-btn">
                            Schedule / Manage
                          </Link>
                        </div>
                        {canMoveToInterview ? (
                          <button
                            type="button"
                            className="pl-btn pl-btn-cta pl-btn-block"
                            disabled={updating}
                            onClick={() => onMoveToInterview(app.id)}
                          >
                            Start Interview Round
                          </button>
                        ) : null}
                      </>
                    }
                  />
                ))}
              </section>
            </div>
          ) : null}
        </>
      )}

      {assessmentsLoading && !jobAssessments.length ? (
        <p className="pl-muted pl-loading-note">Loading assessments…</p>
      ) : null}
    </>
  );
}
