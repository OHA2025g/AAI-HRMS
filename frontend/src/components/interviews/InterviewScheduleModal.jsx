import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { hiringApi } from '../../lib/api';

const DRAFT_STORAGE_KEY = 'aai_hrms.schedule_interview_draft.v1';

const ROUND_OPTIONS = [
  { value: 1, label: 'Round 1 — Screening' },
  { value: 2, label: 'Round 2 — Technical' },
  { value: 3, label: 'Round 3 — Manager Fit' },
  { value: 4, label: 'Final HR Discussion' },
];

const DURATION_OPTIONS = [30, 45, 60, 90];

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
];

function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatExperience(years) {
  const n = Number(years);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)} years exp`;
}

function getFitScore(app) {
  const score = app?.fit_score?.final_score ?? app?.fit_score?.score ?? app?.fit_score?.overall;
  const n = Number(score);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function toDatetimeLocalValue(date) {
  const pad = (v) => String(v).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDisplayDateTime(isoOrLocal, addMinutes = 0) {
  if (!isoOrLocal) return '';
  const date = new Date(isoOrLocal);
  if (Number.isNaN(date.getTime())) return '';
  date.setMinutes(date.getMinutes() + Number(addMinutes || 0));
  return date
    .toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
    .replace(',', '');
}

function computeEndIso(startValue, durationMinutes) {
  if (!startValue) return '';
  const date = new Date(startValue);
  if (Number.isNaN(date.getTime())) return '';
  date.setMinutes(date.getMinutes() + Number(durationMinutes || 0));
  return date.toISOString();
}

function buildRecommendedSlots() {
  const now = new Date();
  const today3 = new Date(now);
  today3.setHours(15, 0, 0, 0);

  const today430 = new Date(now);
  today430.setHours(16, 30, 0, 0);

  const tomorrow11 = new Date(now);
  tomorrow11.setDate(tomorrow11.getDate() + 1);
  tomorrow11.setHours(11, 0, 0, 0);

  return [
    { key: 'today-3pm', label: 'Today', time: today3 },
    { key: 'today-430pm', label: 'Today', time: today430 },
    { key: 'tomorrow-11am', label: 'Tomorrow', time: tomorrow11 },
  ].map((slot) => ({
    ...slot,
    startValue: toDatetimeLocalValue(slot.time),
    displayTime: slot.time.toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
  }));
}

function buildAiRecommendation(app) {
  const jobTitle = app?.job?.title || 'this role';
  const fit = getFitScore(app);
  const fitNote =
    fit != null && fit >= 75
      ? 'Candidate shows strong keyword alignment for the role.'
      : 'Candidate has relevant experience but needs validation on role-specific depth.';
  return `Suggested round: Screening with a practical discussion for ${jobTitle}. ${fitNote} Validate quantified business impact and stakeholder communication.`;
}

function modeLabel(mode) {
  if (mode === 'ONSITE') return 'In-person';
  if (mode === 'PHONE') return 'Phone';
  return 'Virtual';
}

export default function InterviewScheduleModal({
  open,
  onOpenChange,
  applications,
  formData,
  setFormData,
  submitting,
  onSubmit,
}) {
  const draftHydratedRef = useRef(false);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [showCandidateList, setShowCandidateList] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedSlotKey, setSelectedSlotKey] = useState('');

  const durationMinutes = Number(formData.duration_minutes) || 45;
  const recommendedSlots = useMemo(() => buildRecommendedSlots(), [open]);

  const selectedApp = useMemo(
    () => applications.find((app) => app.id === formData.application_id) || null,
    [applications, formData.application_id]
  );

  const filteredApplications = useMemo(() => {
    const q = candidateSearch.trim().toLowerCase();
    if (!q) return applications.slice(0, 8);
    return applications
      .filter((app) => {
        const name = app.candidate?.full_name || '';
        const email = app.candidate?.email || '';
        const role = app.job?.title || '';
        return (
          name.toLowerCase().includes(q) ||
          email.toLowerCase().includes(q) ||
          role.toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [applications, candidateSearch]);

  const candidateApps = useMemo(() => {
    if (!selectedApp?.candidate_id) return [];
    return applications.filter((app) => app.candidate_id === selectedApp.candidate_id);
  }, [applications, selectedApp]);

  const jobOptions = useMemo(() => {
    const source = candidateApps.length ? candidateApps : applications;
    const seen = new Map();
    for (const app of source) {
      if (app.job?.id && !seen.has(app.job.id)) {
        seen.set(app.job.id, app.job.title || `Job ${app.job.id}`);
      }
    }
    return Array.from(seen.entries()).map(([id, title]) => ({ id, title }));
  }, [applications, candidateApps]);

  const roundLabel =
    ROUND_OPTIONS.find((opt) => opt.value === Number(formData.round))?.label || `Round ${formData.round}`;

  const endDisplay = formatDisplayDateTime(formData.scheduled_start, durationMinutes);

  const selectedInterviewers = useMemo(
    () => teamMembers.filter((member) => (formData.interviewers || []).includes(member.id)),
    [teamMembers, formData.interviewers]
  );

  const updateEndTime = useCallback(
    (startValue, duration) => {
      const endIso = computeEndIso(startValue, duration);
      if (endIso) {
        setFormData((prev) => ({ ...prev, scheduled_end: endIso }));
      }
    },
    [setFormData]
  );

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    hiringApi
      .listTeamMembers()
      .then((res) => setTeamMembers(res.data?.items || []))
      .catch(() => setTeamMembers([]));
  }, [open]);

  useEffect(() => {
    if (!open || draftHydratedRef.current) return;
    draftHydratedRef.current = true;
    try {
      const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.formData) {
        setFormData((prev) => ({
          ...prev,
          ...draft.formData,
          interviewers: draft.formData.interviewers || [],
        }));
        if (draft.formData.scheduled_start) {
          updateEndTime(draft.formData.scheduled_start, draft.formData.duration_minutes || 45);
        }
      }
    } catch {
      /* ignore corrupt draft */
    }
  }, [open, setFormData, updateEndTime]);

  useEffect(() => {
    if (formData.scheduled_start) {
      updateEndTime(formData.scheduled_start, durationMinutes);
    }
  }, [formData.scheduled_start, durationMinutes, updateEndTime]);

  useEffect(() => {
    if (selectedApp) {
      setCandidateSearch(selectedApp.candidate?.full_name || '');
    }
  }, [selectedApp]);

  const handleClose = () => {
    onOpenChange(false);
    setCandidateSearch('');
    setShowCandidateList(false);
    setSelectedSlotKey('');
    draftHydratedRef.current = false;
  };

  const saveDraft = () => {
    try {
      window.localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({ formData, savedAt: new Date().toISOString() })
      );
      toast.success('Draft saved locally');
    } catch {
      toast.error('Could not save draft');
    }
  };

  const handleSelectApplication = (app) => {
    setFormData((prev) => ({
      ...prev,
      application_id: app.id,
    }));
    setCandidateSearch(app.candidate?.full_name || '');
    setShowCandidateList(false);
  };

  const handleJobChange = (jobId) => {
    if (!selectedApp) return;
    const match = applications.find(
      (app) => app.candidate_id === selectedApp.candidate_id && app.job?.id === jobId
    );
    if (match) {
      setFormData((prev) => ({ ...prev, application_id: match.id }));
    }
  };

  const handleDurationChange = (minutes) => {
    setFormData((prev) => ({ ...prev, duration_minutes: minutes }));
    updateEndTime(formData.scheduled_start, minutes);
  };

  const handleStartChange = (value) => {
    setFormData((prev) => ({ ...prev, scheduled_start: value }));
    setSelectedSlotKey('');
    updateEndTime(value, durationMinutes);
  };

  const handleSlotSelect = (slot) => {
    setSelectedSlotKey(slot.key);
    handleStartChange(slot.startValue);
  };

  const handleInterviewerChange = (e) => {
    const selected = Array.from(e.target.selectedOptions).map((opt) => opt.value);
    setFormData((prev) => ({ ...prev, interviewers: selected }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData };
    if (!payload.scheduled_end && payload.scheduled_start) {
      payload.scheduled_end = computeEndIso(payload.scheduled_start, durationMinutes);
    }
    if (payload.mode === 'ONSITE' && payload.location) {
      payload.meeting_link = payload.location;
    }
    setFormData(payload);
    onSubmit(e, payload);
  };

  const toggleInterviewer = (memberId) => {
    setFormData((prev) => {
      const current = prev.interviewers || [];
      const next = current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId];
      return { ...prev, interviewers: next };
    });
  };

  if (!open) return null;

  const fitScore = selectedApp ? getFitScore(selectedApp) : null;
  const expLabel = selectedApp ? formatExperience(selectedApp.candidate?.total_experience_years) : null;
  const candidateMeta = selectedApp
    ? [selectedApp.job?.title, selectedApp.candidate?.location, expLabel].filter(Boolean).join(' · ')
    : '';

  const summaryName = selectedApp?.candidate?.full_name || 'Select candidate';
  const canSubmit = Boolean(formData.application_id && formData.scheduled_start && !submitting);

  return createPortal(
    <div
      className="si-modal-root si-modal-layer"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      data-testid="schedule-interview-modal"
    >
      <div className="si-modal" role="dialog" aria-modal="true" aria-labelledby="si-modalTitle">
        <header className="si-modal-head">
          <div className="si-headline">
            <div className="si-modal-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M8 2v4M16 2v4M3 10h18" />
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M8 14h3M13 14h3M8 18h3" />
              </svg>
            </div>
            <div>
              <h1 id="si-modalTitle">Schedule Interview</h1>
              <p className="si-modal-subtitle">
                Select candidate, interview slot, panel, and meeting details in one guided flow.
              </p>
              <div className="si-head-badges">
                <span className="si-chip purple">AI Slot Assistant</span>
                <span className="si-chip green">Calendar-Ready</span>
                <span className="si-chip blue">Auto Reminder</span>
              </div>
            </div>
          </div>
          <button type="button" className="si-close-btn" aria-label="Close popup" onClick={handleClose}>
            <svg viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="si-modal-body">
          <form id="si-schedule-form" className="si-schedule-layout" onSubmit={handleFormSubmit}>
            <section className="si-form-card">
              <div className="si-section-head">
                <div>
                  <h2 className="si-section-title">Interview Details</h2>
                  <p className="si-section-subtitle">
                    Required fields are marked. End time is auto-calculated from duration.
                  </p>
                </div>
                <span className="si-step-badge">1</span>
              </div>

              <div className="si-field-grid">
                <div className="si-field si-full">
                  <div className="si-label-row">
                    <label htmlFor="si-candidateSearch">
                      Select Candidate <span className="si-required">*</span>
                    </label>
                    <span className="si-hint">Search by name, role, or email</span>
                  </div>
                  <div className="si-candidate-select">
                    <div className="si-candidate-search">
                      <svg viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                      </svg>
                      <input
                        id="si-candidateSearch"
                        value={candidateSearch}
                        onChange={(e) => {
                          setCandidateSearch(e.target.value);
                          setShowCandidateList(true);
                        }}
                        onFocus={() => setShowCandidateList(true)}
                        placeholder="Search candidates…"
                        aria-label="Candidate search"
                        autoComplete="off"
                      />
                    </div>
                    {showCandidateList && filteredApplications.length > 0 ? (
                      <div className="si-candidate-dropdown" role="listbox">
                        {filteredApplications.map((app) => (
                          <button
                            key={app.id}
                            type="button"
                            className={`si-candidate-option ${app.id === formData.application_id ? 'active' : ''}`}
                            onClick={() => handleSelectApplication(app)}
                          >
                            {app.candidate?.full_name} — {app.job?.title}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {selectedApp ? (
                      <div className="si-selected-candidate">
                        <div className="si-candidate-left">
                          <div className="si-candidate-avatar">{initials(selectedApp.candidate?.full_name)}</div>
                          <div className="si-candidate-copy">
                            <strong>{selectedApp.candidate?.full_name}</strong>
                            <span>{candidateMeta}</span>
                          </div>
                        </div>
                        {fitScore != null ? <span className="si-fit-pill">{fitScore}% fit</span> : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="si-field">
                  <label htmlFor="si-jobRole">
                    Job / Role <span className="si-required">*</span>
                  </label>
                  <select
                    id="si-jobRole"
                    className="si-control"
                    value={selectedApp?.job?.id || ''}
                    onChange={(e) => handleJobChange(e.target.value)}
                    disabled={!selectedApp}
                  >
                    {jobOptions.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="si-field">
                  <label htmlFor="si-round">
                    Round <span className="si-required">*</span>
                  </label>
                  <select
                    id="si-round"
                    className="si-control"
                    value={String(formData.round)}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, round: parseInt(e.target.value, 10) }))
                    }
                  >
                    {ROUND_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="si-field">
                  <label htmlFor="si-startTime">
                    Start Time <span className="si-required">*</span>
                  </label>
                  <input
                    id="si-startTime"
                    className="si-control"
                    type="datetime-local"
                    value={formData.scheduled_start}
                    onChange={(e) => handleStartChange(e.target.value)}
                    required
                    data-testid="interview-start-input"
                  />
                </div>

                <div className="si-field">
                  <label htmlFor="si-duration">Duration</label>
                  <select
                    id="si-duration"
                    className="si-control"
                    value={String(durationMinutes)}
                    onChange={(e) => handleDurationChange(parseInt(e.target.value, 10))}
                  >
                    {DURATION_OPTIONS.map((mins) => (
                      <option key={mins} value={mins}>
                        {mins} minutes
                      </option>
                    ))}
                  </select>
                  <div className="si-duration-options" aria-label="Quick duration options">
                    {DURATION_OPTIONS.map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        className={`si-option-pill ${durationMinutes === mins ? 'active' : ''}`}
                        onClick={() => handleDurationChange(mins)}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>

                <div className="si-field">
                  <label htmlFor="si-endTime">End Time</label>
                  <input id="si-endTime" className="si-control" type="text" value={endDisplay} readOnly />
                </div>

                <div className="si-field">
                  <label htmlFor="si-timezone">Timezone</label>
                  <select
                    id="si-timezone"
                    className="si-control"
                    value={formData.timezone || 'Asia/Kolkata'}
                    onChange={(e) => setFormData((prev) => ({ ...prev, timezone: e.target.value }))}
                  >
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="si-field si-full">
                  <label>
                    Interview Mode <span className="si-required">*</span>
                  </label>
                  <div className="si-toggle-row">
                    <label className="si-choice">
                      <input
                        type="radio"
                        name="si-mode"
                        value="VIRTUAL"
                        checked={formData.mode === 'VIRTUAL'}
                        onChange={() => setFormData((prev) => ({ ...prev, mode: 'VIRTUAL' }))}
                      />
                      <span className="si-radio-dot" />
                      <span>
                        <strong>Virtual</strong>
                        <span>Google Meet / Teams link</span>
                      </span>
                    </label>
                    <label className="si-choice">
                      <input
                        type="radio"
                        name="si-mode"
                        value="ONSITE"
                        checked={formData.mode === 'ONSITE'}
                        onChange={() => setFormData((prev) => ({ ...prev, mode: 'ONSITE' }))}
                      />
                      <span className="si-radio-dot" />
                      <span>
                        <strong>In-Person</strong>
                        <span>Office location and room</span>
                      </span>
                    </label>
                  </div>
                </div>

                {formData.mode === 'VIRTUAL' ? (
                  <div className="si-field si-full">
                    <div className="si-label-row">
                      <label htmlFor="si-meetingLink">Meeting Link</label>
                      <span className="si-hint">Auto-generated or paste manually</span>
                    </div>
                    <input
                      id="si-meetingLink"
                      className="si-control"
                      type="url"
                      placeholder="https://meet.google.com/..."
                      value={formData.meeting_link}
                      onChange={(e) => setFormData((prev) => ({ ...prev, meeting_link: e.target.value }))}
                      data-testid="interview-link-input"
                    />
                  </div>
                ) : (
                  <div className="si-field si-full">
                    <div className="si-label-row">
                      <label htmlFor="si-location">Interview Location</label>
                      <span className="si-hint">Building, floor, room</span>
                    </div>
                    <input
                      id="si-location"
                      className="si-control"
                      type="text"
                      placeholder="e.g., Mumbai office, 4th floor, Interview Room 2"
                      value={formData.location || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                    />
                  </div>
                )}

                <div className="si-field si-full">
                  <div className="si-label-row">
                    <label htmlFor="si-panel">Interview Panel</label>
                    <span className="si-hint">Add one or more interviewers</span>
                  </div>
                  <select
                    id="si-panel"
                    className="si-control"
                    multiple
                    value={formData.interviewers || []}
                    onChange={handleInterviewerChange}
                  >
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.full_name || member.email} ({member.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="si-field si-full">
                  <label htmlFor="si-notes">Notes for Interviewers</label>
                  <textarea
                    id="si-notes"
                    className="si-control"
                    placeholder="Add interview focus areas, candidate context, or screening instructions..."
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  />
                </div>

                {selectedApp ? (
                  <div className="si-smart-callout">
                    <div className="si-callout-icon">
                      <svg viewBox="0 0 24 24">
                        <path d="M12 2l2.2 6.1L20 10l-5.8 1.9L12 18l-2.2-6.1L4 10l5.8-1.9L12 2z" />
                      </svg>
                    </div>
                    <div>
                      <strong>AI Recommendation</strong>
                      <p>{buildAiRecommendation(selectedApp)}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            <aside className="si-side-card">
              <div className="si-panel-box">
                <h3 className="si-panel-title">
                  <svg viewBox="0 0 24 24">
                    <path d="M8 2v4M16 2v4M3 10h18" />
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                  </svg>
                  Recommended Slots
                </h3>
                <div className="si-availability-grid">
                  {recommendedSlots.map((slot) => (
                    <button
                      key={slot.key}
                      type="button"
                      className={`si-slot ${selectedSlotKey === slot.key ? 'selected' : ''}`}
                      onClick={() => handleSlotSelect(slot)}
                    >
                      {slot.label}
                      <br />
                      {slot.displayTime}
                    </button>
                  ))}
                </div>
              </div>

              <div className="si-panel-box">
                <h3 className="si-panel-title">
                  <svg viewBox="0 0 24 24">
                    <path d="M20 7 9 18l-5-5" />
                  </svg>
                  Scheduling Checks
                </h3>
                <div className="si-timeline">
                  <div className="si-timeline-item">
                    <div className="si-time-icon">
                      <svg viewBox="0 0 24 24">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </div>
                    <div>
                      <strong>Panel Available</strong>
                      <span>
                        {selectedInterviewers.length
                          ? `No conflict for the selected ${durationMinutes}-minute slot.`
                          : 'Assign interviewers to validate panel availability.'}
                      </span>
                    </div>
                  </div>
                  <div className="si-timeline-item">
                    <div className="si-time-icon">
                      <svg viewBox="0 0 24 24">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                      </svg>
                    </div>
                    <div>
                      <strong>Candidate Reminder</strong>
                      <span>Email reminder 24 hours and 1 hour before interview.</span>
                    </div>
                  </div>
                  <div className="si-timeline-item">
                    <div className="si-time-icon">
                      <svg viewBox="0 0 24 24">
                        <path d="M12 2l2.2 6.1L20 10l-5.8 1.9L12 18l-2.2-6.1L4 10l5.8-1.9L12 2z" />
                      </svg>
                    </div>
                    <div>
                      <strong>AI Prep Ready</strong>
                      <span>Question probes can be generated after scheduling.</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="si-panel-box">
                <h3 className="si-panel-title">
                  <svg viewBox="0 0 24 24">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                  </svg>
                  Candidate Snapshot
                </h3>
                {selectedApp ? (
                  <>
                    <div className="si-score-row">
                      <div className="si-score-mini">
                        <span>Fit Score</span>
                        <strong>{fitScore != null ? `${fitScore}%` : '—'}</strong>
                      </div>
                      <div className="si-score-mini">
                        <span>Experience</span>
                        <strong>
                          {selectedApp.candidate?.total_experience_years
                            ? `${Number(selectedApp.candidate.total_experience_years).toFixed(1)}y`
                            : '—'}
                        </strong>
                      </div>
                    </div>
                    <div className="si-prep-list">
                      <div className="si-prep-item">
                        <span className="si-check">
                          <svg viewBox="0 0 24 24">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        </span>
                        Resume parsed and contact information available.
                      </div>
                      <div className="si-prep-item">
                        <span className="si-check">
                          <svg viewBox="0 0 24 24">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        </span>
                        Assessment invitation can be attached after Round 1.
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="si-hint">Select a candidate to view snapshot.</p>
                )}
              </div>

              <div className="si-panel-box">
                <h3 className="si-panel-title">
                  <svg viewBox="0 0 24 24">
                    <path d="M16 21v-2a4 4 0 0 0-8 0v2" />
                    <circle cx="12" cy="7" r="4" />
                    <path d="M20 8v6M23 11h-6" />
                  </svg>
                  Panel
                </h3>
                {selectedInterviewers.length ? (
                  <div className="si-interviewer-list">
                    {selectedInterviewers.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        className="si-person-chip"
                        onClick={() => toggleInterviewer(member.id)}
                        title="Click to remove"
                      >
                        <span className="si-dot">{initials(member.full_name || member.email)}</span>
                        {member.full_name || member.email}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="si-hint">No interviewers selected yet.</p>
                )}
              </div>
            </aside>
          </form>
        </div>

        <footer className="si-modal-footer">
          <div className="si-summary-strip" aria-live="polite">
            <strong>{summaryName}</strong>
            <span className="si-summary-dot" />
            <span>{roundLabel}</span>
            <span className="si-summary-dot" />
            <span>{modeLabel(formData.mode)}</span>
            <span className="si-summary-dot" />
            <span>{durationMinutes} min</span>
          </div>
          <div className="si-footer-actions">
            <button type="button" className="si-modal-btn secondary" onClick={handleClose}>
              Cancel
            </button>
            <button type="button" className="si-modal-btn soft" onClick={saveDraft}>
              <svg viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <path d="m7 10 5 5 5-5" />
                <path d="M12 15V3" />
              </svg>
              Save Draft
            </button>
            <button
              type="submit"
              form="si-schedule-form"
              className="si-modal-btn primary"
              disabled={!canSubmit}
              data-testid="schedule-interview-submit-btn"
            >
              {submitting ? (
                <span className="si-spinner" aria-hidden="true" />
              ) : (
                <svg viewBox="0 0 24 24">
                  <path d="M8 2v4M16 2v4M3 10h18" />
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="m9 16 2 2 4-4" />
                </svg>
              )}
              Schedule Interview
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
}
