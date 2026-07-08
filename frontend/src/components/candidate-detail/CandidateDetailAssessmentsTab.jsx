import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { assessmentsApi } from '../../lib/api';
import { copyTakeUrl } from '../../lib/assessmentLinks';
import { pickPrimaryApplication } from '../../lib/candidateDetailApplicationsUtils';
import {
  assessmentsKpiStripItems,
  buildAiAssessmentInsights,
  buildInviteDetails,
  buildReadinessSignals,
  buildRecruiterNotes,
  buildRecommendedAddons,
  computeAssessmentsKpis,
  countPendingSubmissions,
  formatAssessmentStatus,
  formatPassDecision,
  formatScoreDisplay,
  isPendingSubmission,
  pickActiveSubmission,
  pickInviteApplication,
  statusPillClass,
} from '../../lib/candidateDetailAssessmentsUtils';
import { pickPrimaryAssessment } from '../../lib/assessmentUtils';
import CandidateAssessmentCard from './CandidateAssessmentCard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M10 13a5 5 0 0 0 7.1 0l2.8-2.8a5 5 0 0 0-7.1-7.1L11 4" />
      <path d="M14 11a5 5 0 0 0-7.1 0l-2.8 2.8a5 5 0 0 0 7.1 7.1L13 20" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M22 2 11 13" />
      <path d="m22 2-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M12 20V10" />
      <path d="M18 20V4" />
      <path d="M6 20v-4" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    </svg>
  );
}

function BulbIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M2 12a10 10 0 1 1 20 0c0 3-2 4.5-4 6H6c-2-1.5-4-3-4-6Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function InsightIcon({ variant }) {
  if (variant === 'warning') return <AlertIcon />;
  if (variant === 'success') return <CheckIcon />;
  return <BulbIcon />;
}

export default function CandidateDetailAssessmentsTab({
  candidateId,
  profile,
  applications = [],
  user,
  onSubmissionsChange,
  assignOpen,
  onAssignOpenChange,
}) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copyingId, setCopyingId] = useState(null);
  const [remindingId, setRemindingId] = useState(null);
  const [assignOpenInternal, setAssignOpenInternal] = useState(false);
  const assignDialogOpen = assignOpen ?? assignOpenInternal;
  const setAssignDialogOpen = onAssignOpenChange ?? setAssignOpenInternal;
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [jobAssessments, setJobAssessments] = useState([]);
  const [selectedApplicationId, setSelectedApplicationId] = useState('');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
  const [autoReminder, setAutoReminder] = useState(true);
  const [proctoring, setProctoring] = useState(false);
  const [recruiterReview, setRecruiterReview] = useState(true);

  const primaryApplication = useMemo(() => pickPrimaryApplication(applications), [applications]);
  const activeSubmission = useMemo(() => pickActiveSubmission(submissions), [submissions]);
  const pendingCount = useMemo(() => countPendingSubmissions(submissions), [submissions]);
  const kpis = useMemo(() => computeAssessmentsKpis(submissions), [submissions]);
  const kpiItems = useMemo(() => assessmentsKpiStripItems(kpis), [kpis]);
  const readiness = useMemo(
    () => buildReadinessSignals(profile, activeSubmission, primaryApplication),
    [profile, activeSubmission, primaryApplication]
  );
  const aiInsights = useMemo(
    () => buildAiAssessmentInsights(profile, submissions, primaryApplication),
    [profile, submissions, primaryApplication]
  );
  const inviteDetails = useMemo(
    () => buildInviteDetails(profile, activeSubmission, user?.full_name || user?.name || user?.email),
    [profile, activeSubmission, user]
  );
  const recommendedAddons = useMemo(() => buildRecommendedAddons(profile), [profile]);
  const recruiterNotes = useMemo(() => buildRecruiterNotes(submissions), [submissions]);

  const cardSubmissions = useMemo(() => {
    const pending = submissions.filter((s) => isPendingSubmission(s));
    const source = pending.length ? pending : submissions.slice(0, 1);
    return source.length ? source : [];
  }, [submissions]);

  const loadSubmissions = useCallback(async () => {
    if (!candidateId) return;
    setLoading(true);
    try {
      const res = await assessmentsApi.listSubmissions({ candidate_id: candidateId, limit: 50 });
      const rows = Array.isArray(res.data) ? res.data : [];
      setSubmissions(rows);
      onSubmissionsChange?.(rows);
    } catch {
      setSubmissions([]);
      onSubmissionsChange?.([]);
    } finally {
      setLoading(false);
    }
  }, [candidateId, onSubmissionsChange]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  useEffect(() => {
    if (!assignDialogOpen || assignLoading || jobAssessments.length) return;
    const app = pickInviteApplication(profile, applications);
    if (!app?.id) return;
    if (!selectedApplicationId) setSelectedApplicationId(app.id);
    setAssignLoading(true);
    assessmentsApi
      .list({ job_id: app.job_id, status: 'ACTIVE', limit: 50 })
      .then((res) => {
        const rows = Array.isArray(res.data) ? res.data : [];
        setJobAssessments(rows);
        const primary = pickPrimaryAssessment(rows);
        if (primary && !selectedAssessmentId) setSelectedAssessmentId(primary.id);
      })
      .catch(() => setJobAssessments([]))
      .finally(() => setAssignLoading(false));
  }, [
    assignDialogOpen,
    assignLoading,
    jobAssessments.length,
    profile,
    applications,
    selectedApplicationId,
    selectedAssessmentId,
  ]);

  const handleCopyLink = async (submission) => {
    if (!submission?.take_url) {
      toast.error('No assessment link available');
      return;
    }
    setCopyingId(submission.id);
    await copyTakeUrl(submission.take_url);
    setCopyingId(null);
  };

  const handleCopyActiveLink = () => {
    if (!activeSubmission?.take_url) {
      toast.error('No active assessment link to copy');
      return;
    }
    handleCopyLink(activeSubmission);
  };

  const handleSendReminder = async (submission) => {
    if (!submission?.id) return;
    setRemindingId(submission.id);
    try {
      await assessmentsApi.resendSubmissionEmail(submission.id);
      toast.success('Invite email resent or queued');
      await loadSubmissions();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to resend invite');
    } finally {
      setRemindingId(null);
    }
  };

  const openAssignDialog = async () => {
    const app = pickInviteApplication(profile, applications);
    if (!app?.id) {
      toast.error('Candidate needs an application before assigning an assessment');
      return;
    }
    setSelectedApplicationId(app.id);
    setSelectedAssessmentId('');
    setAssignDialogOpen(true);
    setAssignLoading(true);
    try {
      const res = await assessmentsApi.list({ job_id: app.job_id, status: 'ACTIVE', limit: 50 });
      setJobAssessments(Array.isArray(res.data) ? res.data : []);
    } catch {
      setJobAssessments([]);
    } finally {
      setAssignLoading(false);
    }
  };

  const onApplicationChange = async (applicationId) => {
    setSelectedApplicationId(applicationId);
    setSelectedAssessmentId('');
    const app = applications.find((a) => a.id === applicationId);
    if (!app?.job_id) {
      setJobAssessments([]);
      return;
    }
    setAssignLoading(true);
    try {
      const res = await assessmentsApi.list({ job_id: app.job_id, status: 'ACTIVE', limit: 50 });
      setJobAssessments(Array.isArray(res.data) ? res.data : []);
      const primary = pickPrimaryAssessment(res.data);
      if (primary) setSelectedAssessmentId(primary.id);
    } catch {
      setJobAssessments([]);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleAssignAssessment = async () => {
    if (!selectedApplicationId || !selectedAssessmentId) {
      toast.error('Select an application and assessment');
      return;
    }
    setAssignSubmitting(true);
    try {
      const res = await assessmentsApi.invite(selectedAssessmentId, {
        application_id: selectedApplicationId,
        send_candidate_email: true,
      });
      toast.success('Assessment assigned and invite sent');
      if (res.data?.take_url) {
        await copyTakeUrl(res.data.take_url, 'Invite sent — candidate link copied');
      }
      setAssignDialogOpen(false);
      await loadSubmissions();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to assign assessment');
    } finally {
      setAssignSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="cdas-loading" data-testid="candidate-assessments-loading">
        <Loader2 className="cdas-page-spinner" />
      </div>
    );
  }

  return (
    <div className="cdas-tab" data-testid="candidate-assessments-tab">
      <div className="cdas-section-head">
        <div>
          <h3>Assessment Center</h3>
          <p>
            Track invited tests, completion status, scores, pass decisions, link sharing, and recruiter
            follow-ups from one clean workspace.
          </p>
        </div>
        <div className="cdas-toolbar">
          <button
            type="button"
            className="cdas-btn cdas-btn-ghost"
            onClick={handleCopyActiveLink}
            disabled={!activeSubmission?.take_url}
            data-testid="copy-active-link-btn"
          >
            <LinkIcon />
            Copy active link
          </button>
          <button
            type="button"
            className="cdas-btn cdas-btn-ghost"
            onClick={() => activeSubmission && handleSendReminder(activeSubmission)}
            disabled={!activeSubmission || remindingId === activeSubmission?.id}
            data-testid="resend-invite-btn"
          >
            {remindingId === activeSubmission?.id ? <Loader2 className="cdas-btn-spinner" /> : <SendIcon />}
            Resend invite
          </button>
          <button
            type="button"
            className="cdas-btn cdas-btn-primary"
            onClick={openAssignDialog}
            data-testid="new-assessment-btn"
          >
            <PlusIcon />
            New assessment
          </button>
        </div>
      </div>

      <div className="cdas-metric-grid" data-testid="candidate-assessments-kpis">
        {kpiItems.map((item) => (
          <div key={item.key} className="cdas-metric-card">
            <div className="cdas-metric-label">{item.label}</div>
            <div className="cdas-metric-value">{item.value}</div>
            {item.note ? (
              <div className={`cdas-metric-note ${item.noteClass || ''}`.trim()}>{item.note}</div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="cdas-layout">
        <div className="cdas-panel">
          <div className="cdas-panel-header">
            <div>
              <h4>Assessment History</h4>
              <span>Candidate-specific assessment records with clear next actions</span>
            </div>
            {pendingCount > 0 ? (
              <span className="cdas-chip cdas-chip-amber" data-testid="assessments-pending-badge">
                {pendingCount} pending
              </span>
            ) : null}
          </div>

          {!submissions.length ? (
            <div className="cdas-empty-state" data-testid="candidate-assessments-empty">
              <div className="cdas-empty-illustration">
                <ChartIcon />
              </div>
              <strong>No assessments assigned yet</strong>
              <span>Assign an assessment to start tracking invites, completion, and scores.</span>
              <button type="button" className="cdas-btn cdas-btn-primary cdas-empty-action" onClick={openAssignDialog}>
                <PlusIcon />
                Assign assessment
              </button>
            </div>
          ) : (
            <>
              {cardSubmissions.map((submission) => (
                <CandidateAssessmentCard
                  key={submission.id}
                  submission={submission}
                  profile={profile}
                  onCopyLink={handleCopyLink}
                  onSendReminder={handleSendReminder}
                  copyingId={copyingId}
                  remindingId={remindingId}
                />
              ))}

              <div className="cdas-table-card" data-testid="assessment-history-table">
                <table aria-label="Assessment history table">
                  <thead>
                    <tr>
                      <th>Assessment</th>
                      <th>Job</th>
                      <th>Status</th>
                      <th>Score</th>
                      <th>Pass</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((submission) => {
                      const pillClass = statusPillClass(submission.status);
                      const score = formatScoreDisplay(submission);
                      const pass = formatPassDecision(submission);
                      return (
                        <tr key={submission.id}>
                          <td className="strong">{submission.assessment_title || '—'}</td>
                          <td>{submission.job_title || '—'}</td>
                          <td>
                            <span className={`cdas-status-pill ${pillClass}`}>
                              {formatAssessmentStatus(submission.status)}
                            </span>
                          </td>
                          <td className="muted">{score}</td>
                          <td className="muted">{pass === 'Pending' ? '—' : pass}</td>
                          <td>
                            {submission.take_url && submission.status !== 'SCORED' ? (
                              <button
                                type="button"
                                className="cdas-tiny-link"
                                onClick={() => handleCopyLink(submission)}
                              >
                                Copy link
                              </button>
                            ) : null}
                            {' '}
                            <Link
                              to={`/assessments?tab=results&submission=${submission.id}`}
                              className="cdas-tiny-link"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <aside className="cdas-side-stack">
          <div className="cdas-panel cdas-ai-card" data-testid="ai-assessment-insight">
            <h4>AI Assessment Insight</h4>
            <p>{aiInsights.summary}</p>
            {aiInsights.awaitingSubmission ? (
              <div className="cdas-empty-state compact">
                <div className="cdas-empty-illustration">
                  <ChartIcon />
                </div>
                <strong>Awaiting candidate submission</strong>
                <span>
                  Once submitted, score, pass status, strengths, gaps, and interview probes will appear here
                  automatically.
                </span>
              </div>
            ) : null}
            <div className="cdas-insight-list">
              {aiInsights.insights.map((insight) => (
                <div key={insight.key} className={`cdas-insight ${insight.variant || ''}`.trim()}>
                  <div className="cdas-insight-icon">
                    <InsightIcon variant={insight.variant} />
                  </div>
                  <div>
                    <strong>{insight.title}</strong>
                    <span>{insight.body}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="cdas-panel cdas-readiness" data-testid="readiness-signal-panel">
            <div className="cdas-panel-header cdas-panel-header-flush">
              <div>
                <h4>Readiness Signal</h4>
                <span>Before final evaluation</span>
              </div>
            </div>
            {readiness.map((row) => (
              <div key={row.key} className="cdas-map-row">
                <span>{row.label}</span>
                <div className="cdas-bar">
                  <i style={{ width: `${row.value}%` }} />
                </div>
                <b>{row.display}</b>
              </div>
            ))}
            <div className="cdas-config-grid">
              <div className="cdas-config-row">
                <span>Auto-reminder enabled</span>
                <button
                  type="button"
                  className={`cdas-toggle ${autoReminder ? 'on' : ''}`.trim()}
                  onClick={() => setAutoReminder((v) => !v)}
                  aria-pressed={autoReminder}
                  data-testid="toggle-auto-reminder"
                />
              </div>
              <div className="cdas-config-row">
                <span>Proctoring required</span>
                <button
                  type="button"
                  className={`cdas-toggle ${proctoring ? 'on' : ''}`.trim()}
                  onClick={() => setProctoring((v) => !v)}
                  aria-pressed={proctoring}
                  data-testid="toggle-proctoring"
                />
              </div>
              <div className="cdas-config-row">
                <span>Recruiter review after submission</span>
                <button
                  type="button"
                  className={`cdas-toggle ${recruiterReview ? 'on' : ''}`.trim()}
                  onClick={() => setRecruiterReview((v) => !v)}
                  aria-pressed={recruiterReview}
                  data-testid="toggle-recruiter-review"
                />
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="cdas-bottom-grid">
        <div className="cdas-panel cdas-mini-panel" data-testid="invite-details-panel">
          <h4>Invite Details</h4>
          <div className="cdas-detail-list">
            {inviteDetails.map((row) => (
              <div key={row.label} className="cdas-detail">
                <span>{row.label}</span>
                <b>{row.value}</b>
              </div>
            ))}
          </div>
        </div>

        <div className="cdas-panel cdas-mini-panel" data-testid="recommended-addons-panel">
          <h4>Recommended Add-ons</h4>
          <div className="cdas-recommend">
            {recommendedAddons.map((addon) => (
              <div key={addon.key} className="cdas-recommend-card">
                <strong>{addon.title}</strong>
                <span>{addon.description}</span>
                <div className="cdas-rec-foot">
                  <span className="cdas-duration">{addon.duration}</span>
                  <button type="button" className="cdas-tiny-link" onClick={openAssignDialog}>
                    Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="cdas-panel cdas-mini-panel" data-testid="recruiter-notes-panel">
          <h4>Recruiter Notes</h4>
          <div className="cdas-detail-list">
            {recruiterNotes.map((row) => (
              <div key={row.label} className="cdas-detail">
                <span>{row.label}</span>
                <b>{row.value}</b>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent data-testid="assign-assessment-dialog">
          <DialogHeader>
            <DialogTitle>Assign assessment</DialogTitle>
            <DialogDescription>
              Invite {profile?.full_name || 'this candidate'} to an active assessment for their application.
            </DialogDescription>
          </DialogHeader>
          {applications.length === 0 ? (
            <p className="text-sm text-slate-500">This candidate has no applications yet.</p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Application</Label>
                <Select value={selectedApplicationId} onValueChange={onApplicationChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select application" />
                  </SelectTrigger>
                  <SelectContent>
                    {applications.map((app) => (
                      <SelectItem key={app.id} value={app.id}>
                        {app.job?.title || app.job_title || app.job_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assessment</Label>
                {assignLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading assessments…
                  </div>
                ) : jobAssessments.length ? (
                  <Select value={selectedAssessmentId} onValueChange={setSelectedAssessmentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select assessment" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobAssessments.map((assessment) => (
                        <SelectItem key={assessment.id} value={assessment.id}>
                          {assessment.title}
                          {assessment.is_primary ? ' (Primary)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-slate-500">No active assessments for this job.</p>
                )}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)} disabled={assignSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleAssignAssessment} disabled={assignSubmitting || !selectedAssessmentId}>
              {assignSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Assign & invite'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
