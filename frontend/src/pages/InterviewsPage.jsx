import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL as API_URL } from '../lib/apiBaseUrl';
import { jobsApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useHiringPermissions } from '../hooks/useHiringPermissions';
import { usePlacementFilters } from '../context/PlacementFiltersContext';
import InterviewsCommandHero from '../components/interviews/InterviewsCommandHero';
import InterviewsOrgFilterBar from '../components/interviews/InterviewsOrgFilterBar';
import InterviewsKpiStrip from '../components/interviews/InterviewsKpiStrip';
import InterviewsCommandRow from '../components/interviews/InterviewsCommandRow';
import InterviewsTabs from '../components/interviews/InterviewsTabs';
import InterviewsCardGrid from '../components/interviews/InterviewsCardGrid';
import InterviewsPanelGrid, { InterviewsCalendarPlaceholder } from '../components/interviews/InterviewsPanelGrid';
import InterviewScheduleModal from '../components/interviews/InterviewScheduleModal';
import InterviewFeedbackModal from '../components/interviews/InterviewFeedbackModal';
import {
  INTERVIEW_TAB_KEYS,
  TAB_SECTION_TITLES,
  buildApplicationMap,
  computeInterviewKpis,
  filterInterviewsByPlacement,
  filterInterviewsByTab,
  sortInterviewsForDisplay,
} from '../lib/interviewsCommandUtils';

const EMPTY_FORM = {
  application_id: '',
  round: 1,
  mode: 'VIRTUAL',
  scheduled_start: '',
  scheduled_end: '',
  meeting_link: '',
  notes: '',
  duration_minutes: 45,
  timezone: 'Asia/Kolkata',
  interviewers: [],
  location: '',
};

const EMPTY_FEEDBACK = {
  decision: '',
  score: '',
  strengths: '',
  concerns: '',
  notes: '',
};

const InterviewsPage = () => {
  const { user } = useAuth();
  const perms = useHiringPermissions(user);
  const canManageInterviews = perms.canScheduleInterview && !perms.pipelineReadOnly;
  const placement = usePlacementFilters();

  const [interviews, setInterviews] = useState([]);
  const [applications, setApplications] = useState([]);
  const [allApplications, setAllApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(INTERVIEW_TAB_KEYS.UPCOMING);
  const [showModal, setShowModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [feedbackData, setFeedbackData] = useState(EMPTY_FEEDBACK);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [interviewsRes, appsRes, jobsRes] = await Promise.all([
        axios.get(`${API_URL}/interviews`),
        axios.get(`${API_URL}/applications`),
        jobsApi.list(),
      ]);
      setInterviews(interviewsRes.data);
      setJobs(jobsRes.data || []);
      const allApps = appsRes.data || [];
      setApplications(
        allApps.filter((app) =>
          ['SCREENING', 'ASSESSMENT_CLEARED', 'INTERVIEW_1', 'INTERVIEW_2'].includes(app.stage)
        )
      );
      setAllApplications(allApps);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e, payloadOverride) => {
    e.preventDefault();
    const payload = payloadOverride || formData;
    if (!payload.application_id || !payload.scheduled_start) return;

    const duration = Number(payload.duration_minutes) || 45;
    let scheduledEnd = payload.scheduled_end;
    if (!scheduledEnd && payload.scheduled_start) {
      const endDate = new Date(payload.scheduled_start);
      endDate.setMinutes(endDate.getMinutes() + duration);
      scheduledEnd = endDate.toISOString();
    }

    const apiPayload = {
      application_id: payload.application_id,
      round: payload.round,
      mode: payload.mode,
      scheduled_start: payload.scheduled_start,
      scheduled_end: scheduledEnd,
      meeting_link: payload.mode === 'ONSITE' ? payload.location || payload.meeting_link : payload.meeting_link,
      interviewers: payload.interviewers || [],
      notes: payload.notes,
    };

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/interviews`, apiPayload);
      toast.success('Interview scheduled successfully!');
      setShowModal(false);
      setFormData(EMPTY_FORM);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to schedule interview');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInterview || !feedbackData.decision) return;

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/interviews/${selectedInterview.id}/feedback`, feedbackData);
      toast.success('Feedback submitted successfully!');
      setShowFeedbackModal(false);
      setFeedbackData(EMPTY_FEEDBACK);
      setSelectedInterview(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelInterview = async (interviewId) => {
    if (!window.confirm('Are you sure you want to cancel this interview?')) return;
    try {
      await axios.delete(`${API_URL}/interviews/${interviewId}`);
      toast.success('Interview cancelled');
      fetchData();
    } catch (error) {
      toast.error('Failed to cancel interview');
    }
  };

  const openFeedback = (interview) => {
    setSelectedInterview(interview);
    setShowFeedbackModal(true);
  };

  const applicationMap = useMemo(() => buildApplicationMap(allApplications), [allApplications]);

  const scopedInterviews = useMemo(
    () => sortInterviewsForDisplay(filterInterviewsByPlacement(interviews, jobs, placement)),
    [interviews, jobs, placement]
  );

  const kpis = useMemo(() => computeInterviewKpis(scopedInterviews), [scopedInterviews]);

  const tabInterviews = useMemo(
    () => filterInterviewsByTab(scopedInterviews, activeTab, applicationMap),
    [scopedInterviews, activeTab, applicationMap]
  );

  const sectionTitle = TAB_SECTION_TITLES[activeTab] || 'Interviews';
  const showCardGrid = [INTERVIEW_TAB_KEYS.UPCOMING, INTERVIEW_TAB_KEYS.COMPLETED, INTERVIEW_TAB_KEYS.FEEDBACK_PENDING].includes(
    activeTab
  );
  const showPanelGrid =
    activeTab === INTERVIEW_TAB_KEYS.UPCOMING ||
    activeTab === INTERVIEW_TAB_KEYS.PANEL_LOAD ||
    activeTab === INTERVIEW_TAB_KEYS.FEEDBACK_PENDING;

  return (
    <div className="hiring-dashboard-root top-operational" data-testid="interviews-command-root">
      {perms.pipelineReadOnly ? (
        <div className="iv-readonly-banner">
          Read-only access: you can view interviews for your jobs but cannot schedule, cancel, or submit feedback.
        </div>
      ) : null}

      <InterviewsCommandHero
        canManageInterviews={canManageInterviews}
        onScheduleClick={() => setShowModal(true)}
      />

      <InterviewsOrgFilterBar jobs={jobs} />

      {loading ? (
        <div className="iv-loading" data-testid="interviews-loading">
          <Loader2 className="iv-loading-icon" aria-hidden />
          <span>Loading interviews…</span>
        </div>
      ) : (
        <>
          <InterviewsKpiStrip kpis={kpis} />
          <InterviewsCommandRow interviews={scopedInterviews} applicationMap={applicationMap} />
          <InterviewsTabs activeTab={activeTab} onTabChange={setActiveTab} />

          {activeTab === INTERVIEW_TAB_KEYS.CALENDAR ? (
            <InterviewsCalendarPlaceholder />
          ) : null}

          {activeTab === INTERVIEW_TAB_KEYS.PANEL_LOAD ? (
            <>
              <h3 className="iv-section-title">{sectionTitle}</h3>
              <InterviewsPanelGrid interviews={scopedInterviews} showPanelTable />
            </>
          ) : null}

          {showCardGrid ? (
            <InterviewsCardGrid
              title={sectionTitle}
              interviews={tabInterviews}
              applicationMap={applicationMap}
              canManageInterviews={canManageInterviews}
              onFeedback={openFeedback}
              onCancel={handleCancelInterview}
              emptyMessage={
                activeTab === INTERVIEW_TAB_KEYS.UPCOMING
                  ? 'No upcoming interviews scheduled.'
                  : activeTab === INTERVIEW_TAB_KEYS.FEEDBACK_PENDING
                    ? 'No interviews awaiting feedback.'
                    : 'No completed interviews yet.'
              }
            />
          ) : null}

          {showPanelGrid && activeTab !== INTERVIEW_TAB_KEYS.PANEL_LOAD ? (
            <InterviewsPanelGrid interviews={scopedInterviews} />
          ) : null}
        </>
      )}

      {canManageInterviews ? (
        <InterviewScheduleModal
          open={showModal}
          onOpenChange={setShowModal}
          applications={applications}
          formData={formData}
          setFormData={setFormData}
          submitting={submitting}
          onSubmit={handleSubmit}
        />
      ) : null}

      <InterviewFeedbackModal
        open={showFeedbackModal}
        onOpenChange={setShowFeedbackModal}
        selectedInterview={
          selectedInterview
            ? { ...selectedInterview, candidate_id: selectedInterview.candidate?.id }
            : null
        }
        feedbackData={feedbackData}
        setFeedbackData={setFeedbackData}
        submitting={submitting}
        onSubmit={handleFeedbackSubmit}
      />
    </div>
  );
};

export default InterviewsPage;
