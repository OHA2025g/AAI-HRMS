import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { candidatesApi, applicationsApi, assessmentsApi } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { hasResumeDisplayContent } from '../lib/resumeContent';
import { ResumeContentView } from '../components/ResumeContentView';
import CandidateDetailTrajectoryTab from '../components/candidate-detail/CandidateDetailTrajectoryTab';
import CandidateDetailHero from '../components/candidate-detail/CandidateDetailHero';
import CandidateDetailAssessmentsTab from '../components/candidate-detail/CandidateDetailAssessmentsTab';
import CandidateDetailOverviewTab from '../components/candidate-detail/CandidateDetailOverviewTab';
import CandidateDetailApplicationsTab from '../components/candidate-detail/CandidateDetailApplicationsTab';
import CandidateDetailExperienceTab from '../components/candidate-detail/CandidateDetailExperienceTab';
import { experienceVerificationBadge } from '../lib/candidateDetailExperienceUtils';
import { trajectoryReadyBadge } from '../lib/candidateDetailTrajectoryUtils';
import { useAuth } from '../context/AuthContext';
import { useHiringPermissions } from '../hooks/useHiringPermissions';
import { useAssessmentClearance } from '../hooks/useAssessmentClearance';
import { useCareerTrajectorySummaries } from '../hooks/useCareerTrajectorySummaries';
import {
  canAdvanceApplicationStage,
  NEXT_PIPELINE_STEP,
} from '../lib/hiringPipelinePermissions';
import { pickPrimaryApplication } from '../lib/candidateDetailApplicationsUtils';
import {
  assessmentPendingBadge,
  pickActiveSubmission,
} from '../lib/candidateDetailAssessmentsUtils';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

const TAB_KEYS = ['overview', 'applications', 'experience', 'career-trajectory', 'assessments'];

const CandidateProfilePage = () => {
  const { candidateId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const perms = useHiringPermissions(user);
  const { runWithClearanceCheck, clearanceDialog } = useAssessmentClearance();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(() =>
    TAB_KEYS.includes(tabParam) ? tabParam : 'overview'
  );
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stageUpdatingId, setStageUpdatingId] = useState(null);
  const [assessmentSubmissions, setAssessmentSubmissions] = useState([]);
  const [assignAssessmentOpen, setAssignAssessmentOpen] = useState(false);
  const [heroReminderSending, setHeroReminderSending] = useState(false);
  const [trajectoryHero, setTrajectoryHero] = useState(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    location: '',
    headline: '',
    total_experience_years: '',
    skills: '',
    resume_text: '',
  });

  useEffect(() => {
    fetchProfile();
  }, [candidateId]);

  useEffect(() => {
    if (tabParam && TAB_KEYS.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    if (!candidateId) return;
    let cancelled = false;
    assessmentsApi
      .listSubmissions({ candidate_id: candidateId, limit: 50 })
      .then((res) => {
        if (!cancelled) setAssessmentSubmissions(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (!cancelled) setAssessmentSubmissions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [candidateId]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await candidatesApi.getProfile(candidateId);
      setProfile(response.data);
      const p = response.data || {};
      setEditForm({
        full_name: p.full_name || '',
        email: p.email || '',
        phone: p.phone || '',
        location: p.location || '',
        headline: p.headline || '',
        total_experience_years:
          p.total_experience_years === null || p.total_experience_years === undefined
            ? ''
            : String(p.total_experience_years),
        skills: Array.isArray(p.skills) ? p.skills.map((s) => s?.skill_name).filter(Boolean).join(', ') : '',
        resume_text: p.resume_text || '',
      });
    } catch (error) {
      toast.error('Failed to fetch candidate profile');
    } finally {
      setLoading(false);
    }
  };

  const setTab = (tab) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    if (tab === 'overview') next.delete('tab');
    else next.set('tab', tab);
    navigate({ search: next.toString() ? `?${next.toString()}` : '' }, { replace: true });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const skillsList = (editForm.skills || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        full_name: editForm.full_name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        location: editForm.location.trim(),
        headline: editForm.headline.trim(),
        total_experience_years:
          editForm.total_experience_years === '' ? null : Number(editForm.total_experience_years),
        skills: skillsList,
      };

      await candidatesApi.update(candidateId, payload);
      toast.success('Candidate updated');
      setEditOpen(false);
      await fetchProfile();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to update candidate');
    } finally {
      setSaving(false);
    }
  };

  const applications = profile?.applications || [];
  const { summaries: trajSummaries } = useCareerTrajectorySummaries([candidateId]);
  const primaryApplication = useMemo(() => pickPrimaryApplication(applications), [applications]);

  const advanceApplicationStage = async (app) => {
    const step = NEXT_PIPELINE_STEP[app?.stage];
    if (!step?.next || !app?.id) return;

    const doUpdate = async (reasonOverride) => {
      setStageUpdatingId(app.id);
      try {
        await applicationsApi.updateStage(app.id, {
          stage: step.next,
          ...(reasonOverride ? { reason: reasonOverride } : {}),
        });
        toast.success('Candidate moved to next stage');
        await fetchProfile();
      } catch (e) {
        toast.error(e?.response?.data?.detail || 'Failed to update stage');
      } finally {
        setStageUpdatingId(null);
      }
    };

    await runWithClearanceCheck(app, app.stage, step.next, doUpdate);
  };

  const movePrimaryCandidate = () => {
    if (primaryApplication) {
      advanceApplicationStage(primaryApplication);
    }
  };

  const activeAssessment = pickActiveSubmission(assessmentSubmissions);

  const sendAssessmentReminder = async () => {
    if (!activeAssessment?.id) {
      toast.error('No active assessment invite to remind');
      return;
    }
    setHeroReminderSending(true);
    try {
      await assessmentsApi.resendSubmissionEmail(activeAssessment.id);
      toast.success('Invite email resent or queued');
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to send reminder');
    } finally {
      setHeroReminderSending(false);
    }
  };

  const heroPrimaryAction =
    activeTab === 'career-trajectory' && trajectoryHero
      ? {
          label: 'Re-analyze',
          onClick: trajectoryHero.onReanalyze,
          disabled: trajectoryHero.analyzing,
          testId: 'career-traj-hero-reanalyze-btn',
        }
      : activeTab === 'assessments'
        ? {
            label: 'Assign assessment',
            onClick: () => setAssignAssessmentOpen(true),
            testId: 'assign-assessment-btn',
          }
        : activeTab === 'applications' && primaryApplication
          ? {
              label: 'Move Candidate',
              onClick: movePrimaryCandidate,
              disabled:
                stageUpdatingId === primaryApplication.id ||
                !canAdvanceApplicationStage(primaryApplication, perms),
              testId: 'move-candidate-btn',
            }
          : undefined;

  const heroSecondaryAction =
    activeTab === 'assessments'
      ? {
          label: 'Send reminder',
          icon: '✉',
          onClick: sendAssessmentReminder,
          disabled: heroReminderSending || !activeAssessment,
          testId: 'send-reminder-btn',
        }
      : undefined;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Candidate not found</p>
        <Link to="/candidates">
          <Button variant="outline" className="mt-4">Back to Candidates</Button>
        </Link>
      </div>
    );
  }

  const appCount = profile.applications?.length || 0;
  const verificationBadge = experienceVerificationBadge(profile);
  const pendingAssessmentBadge = assessmentPendingBadge(assessmentSubmissions);
  const trajectoryBadge =
    activeTab === 'career-trajectory'
      ? trajectoryReadyBadge(
          trajectoryHero?.hasReport || trajSummaries[candidateId]?.overall_score != null
        )
      : null;

  const heroExtraBadges = [
    ...(pendingAssessmentBadge ? [pendingAssessmentBadge] : []),
    ...(verificationBadge ? [verificationBadge] : []),
    ...(trajectoryBadge ? [trajectoryBadge] : []),
  ];

  return (
    <div className="candidate-detail-root" data-testid="candidate-detail-root">
      <CandidateDetailHero
        profile={profile}
        candidateId={candidateId}
        onEdit={() => setEditOpen(true)}
        primaryAction={heroPrimaryAction}
        secondaryAction={heroSecondaryAction}
        extraBadges={heroExtraBadges}
      />

      <nav className="cd-tabs" role="tablist" aria-label="Candidate sections" data-testid="candidate-detail-tabs">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'overview'}
          className={`cd-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setTab('overview')}
        >
          Overview
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'applications'}
          className={`cd-tab ${activeTab === 'applications' ? 'active' : ''}`}
          onClick={() => setTab('applications')}
        >
          Applications <b>{appCount}</b>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'experience'}
          className={`cd-tab ${activeTab === 'experience' ? 'active' : ''}`}
          onClick={() => setTab('experience')}
        >
          Experience
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'career-trajectory'}
          className={`cd-tab ${activeTab === 'career-trajectory' ? 'active' : ''}`}
          onClick={() => setTab('career-trajectory')}
        >
          AI Career Trajectory
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'assessments'}
          className={`cd-tab ${activeTab === 'assessments' ? 'active' : ''}`}
          onClick={() => setTab('assessments')}
        >
          Assessments
        </button>
      </nav>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Outfit' }}>Edit Candidate</DialogTitle>
            <DialogDescription>Update candidate details and save.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Headline</Label>
                <Input value={editForm.headline} onChange={(e) => setEditForm({ ...editForm, headline: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Total experience (years)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={editForm.total_experience_years}
                  onChange={(e) => setEditForm({ ...editForm, total_experience_years: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Skills (comma separated)</Label>
                <Input value={editForm.skills} onChange={(e) => setEditForm({ ...editForm, skills: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Resume text</Label>
                <Textarea
                  rows={6}
                  value={editForm.resume_text}
                  onChange={(e) => setEditForm({ ...editForm, resume_text: e.target.value })}
                />
                <p className="text-xs text-slate-500">Resume text is shown on the profile page; editing it doesn’t rerun AI extraction.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {activeTab === 'overview' ? (
        <div className="cd-tab-panel" data-testid="candidate-overview-tab">
          <CandidateDetailOverviewTab profile={profile} />
          {hasResumeDisplayContent(profile) ? (
            <section className="cd-card cd-card-spaced" data-testid="candidate-resume-content">
              <h2>
                <span className="cd-card-icon">▤</span>
                Resume Content
              </h2>
              <div className="bg-slate-50 rounded-lg p-4 max-h-[32rem] overflow-y-auto">
                <ResumeContentView profile={profile} />
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {activeTab === 'applications' ? (
        <div className="cd-tab-panel" data-testid="candidate-applications-panel">
          <CandidateDetailApplicationsTab
            profile={profile}
            applications={applications}
            trajSummaries={trajSummaries}
            pipelineStepByApp={(app) => NEXT_PIPELINE_STEP[app?.stage]}
            canAdvanceStage={(app) => canAdvanceApplicationStage(app, perms)}
            stageUpdatingId={stageUpdatingId}
            onAdvanceStage={advanceApplicationStage}
          />
        </div>
      ) : null}

      {activeTab === 'experience' ? (
        <div className="cd-tab-panel" data-testid="candidate-experience-panel">
          <CandidateDetailExperienceTab
            profile={profile}
            candidateId={candidateId}
            trajSummary={trajSummaries[candidateId]}
            onProfileRefresh={fetchProfile}
          />
        </div>
      ) : null}

      {activeTab === 'career-trajectory' ? (
        <div className="cd-tab-panel" data-testid="candidate-trajectory-panel">
          <CandidateDetailTrajectoryTab
            candidateId={candidateId}
            profile={profile}
            resumeText={profile?.resume_text || ''}
            candidateName={profile?.full_name}
            onHeroStateChange={setTrajectoryHero}
          />
        </div>
      ) : null}

      {activeTab === 'assessments' ? (
        <div className="cd-tab-panel" data-testid="candidate-assessments-panel">
          <CandidateDetailAssessmentsTab
            candidateId={candidateId}
            profile={profile}
            applications={applications}
            user={user}
            assignOpen={assignAssessmentOpen}
            onAssignOpenChange={setAssignAssessmentOpen}
            onSubmissionsChange={setAssessmentSubmissions}
          />
        </div>
      ) : null}

      {clearanceDialog}
    </div>
  );
};

export default CandidateProfilePage;
