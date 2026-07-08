import React, { useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { candidatesApi } from '../../lib/api';
import { normalizeExperienceList } from '../../lib/experienceParser';
import {
  buildAiExperienceSummary,
  buildDataQualityChecklist,
  buildExperienceInsights,
  buildInterviewProbes,
  buildSkillEvidenceMap,
  computeDataQualityScore,
  computeExperienceKpis,
  computeExperienceRecordsSummary,
  experienceKpiStripItems,
  profileCompletenessCopy,
  ringStyle,
  sortExperienceTimeline,
} from '../../lib/candidateDetailExperienceUtils';
import CandidateExperienceTimelineCard from './CandidateExperienceTimelineCard';

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h6" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-5" />
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

function CrossIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M3 12h18M12 3v18" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M12 20V10M18 20V4M6 20v-4" />
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

export default function CandidateDetailExperienceTab({
  profile,
  candidateId,
  trajSummary,
  onProfileRefresh,
}) {
  const fileInputRef = useRef(null);
  const checklistRef = useRef(null);
  const [newestFirst, setNewestFirst] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState({
    title: '',
    company: '',
    start_date: '',
    end_date: '',
    description: '',
  });

  const experience = useMemo(() => normalizeExperienceList(profile?.experience), [profile?.experience]);
  const kpis = useMemo(() => computeExperienceKpis(profile), [profile]);
  const kpiItems = useMemo(() => experienceKpiStripItems(kpis), [kpis]);
  const timeline = useMemo(() => {
    const { enriched } = computeExperienceRecordsSummary(experience);
    return sortExperienceTimeline(enriched, newestFirst);
  }, [experience, newestFirst]);
  const completeness = useMemo(() => computeDataQualityScore(experience), [experience]);
  const skillMap = useMemo(() => buildSkillEvidenceMap(profile, experience), [profile, experience]);
  const checklist = useMemo(() => buildDataQualityChecklist(profile, experience), [profile, experience]);
  const probes = useMemo(() => buildInterviewProbes(profile, experience), [profile, experience]);
  const aiSummary = useMemo(
    () => buildAiExperienceSummary(profile, trajSummary, experience),
    [profile, trajSummary, experience]
  );
  const insights = useMemo(() => buildExperienceInsights(profile, experience), [profile, experience]);

  const handleParseResume = () => {
    fileInputRef.current?.click();
  };

  const onResumeSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setParsing(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await candidatesApi.uploadResume(form);
      const updatedId = res.data?.candidate_id;
      if (updatedId && updatedId !== candidateId) {
        toast.message('Resume parsed for a different candidate record (email match). Refreshing profile.');
      } else {
        toast.success('Resume parsed and experience updated');
      }
      await onProfileRefresh?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to parse resume');
    } finally {
      setParsing(false);
    }
  };

  const handleVerify = () => {
    checklistRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    toast.message('Review the data quality checklist and confirm items with the candidate.');
  };

  const handleAddExperience = () => {
    setAddOpen(true);
  };

  const submitDraftExperience = () => {
    if (!draft.title.trim() && !draft.company.trim()) {
      toast.error('Add at least a role title or company name.');
      return;
    }
    toast.message(
      'Manual experience entry is preview-only until profile editing supports work history. Use Parse resume to persist structured roles.'
    );
    setAddOpen(false);
    setDraft({ title: '', company: '', start_date: '', end_date: '', description: '' });
  };

  return (
    <div className="cde-tab" data-testid="candidate-experience-tab">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx"
        className="cde-hidden-input"
        onChange={onResumeSelected}
        data-testid="candidate-experience-resume-input"
      />

      <div className="cde-section-head">
        <div>
          <h3>Experience Intelligence</h3>
          <p>
            Normalized employment history, AI role interpretation, data-quality signals, and recruiter-ready
            work summary.
          </p>
        </div>
        <div className="cde-toolbar">
          <button
            type="button"
            className="cde-btn cde-btn-ghost"
            onClick={handleParseResume}
            disabled={parsing}
            data-testid="candidate-experience-parse-resume"
          >
            {parsing ? <Loader2 className="cde-btn-spinner" /> : <FileIcon />}
            Parse resume
          </button>
          <button
            type="button"
            className="cde-btn cde-btn-ghost"
            onClick={handleVerify}
            data-testid="candidate-experience-verify"
          >
            <ShieldIcon />
            Verify
          </button>
          <button
            type="button"
            className="cde-btn cde-btn-primary"
            onClick={handleAddExperience}
            data-testid="candidate-experience-add"
          >
            <PlusIcon />
            Add Experience
          </button>
        </div>
      </div>

      <section className="cde-metric-grid" data-testid="candidate-experience-kpis">
        {kpiItems.map((item) => (
          <div key={item.key} className="cde-metric-card">
            <div className="cde-metric-label">{item.label}</div>
            <div className="cde-metric-value">{item.value}</div>
            <div className={`cde-metric-note ${item.noteClass || ''}`.trim()}>{item.note}</div>
          </div>
        ))}
      </section>

      <div className="cde-layout">
        <div className="cde-panel">
          <div className="cde-panel-header">
            <div>
              <h4>Chronological Experience Timeline</h4>
              <span>Cleaned and structured from candidate resume/profile data</span>
            </div>
            <button
              type="button"
              className="cde-chip cde-chip-blue"
              onClick={() => setNewestFirst((v) => !v)}
              data-testid="candidate-experience-sort-toggle"
            >
              {newestFirst ? 'Newest first' : 'Oldest first'}
            </button>
          </div>
          <div className="cde-timeline" data-testid="candidate-experience-timeline">
            {timeline.length ? (
              timeline.map((record) => (
                <CandidateExperienceTimelineCard key={record.id} record={record} />
              ))
            ) : (
              <div className="cde-empty-note">
                No structured experience records yet. Upload or parse a resume to populate the timeline.
              </div>
            )}
          </div>
        </div>

        <aside className="cde-side-stack">
          <div className="cde-panel cde-ai-card" data-testid="candidate-experience-ai-summary">
            <h4>AI Experience Summary</h4>
            <p>{aiSummary}</p>
            <div className="cde-score-ring">
              <div className="cde-ring" style={ringStyle(completeness)}>
                <span>{completeness}%</span>
              </div>
              <div className="cde-ring-copy">
                <strong>Profile completeness</strong>
                <small>{profileCompletenessCopy(completeness, kpis.reviewCount)}</small>
              </div>
            </div>
            <div className="cde-insight-list">
              <div className="cde-insight">
                <div className="cde-insight-icon">
                  <CrossIcon />
                </div>
                <div>
                  <strong>Primary fit signal</strong>
                  <span>{insights.primary}</span>
                </div>
              </div>
              <div className="cde-insight">
                <div className="cde-insight-icon">
                  <ChartIcon />
                </div>
                <div>
                  <strong>Secondary signal</strong>
                  <span>{insights.secondary}</span>
                </div>
              </div>
              <div className="cde-insight">
                <div className="cde-insight-icon">
                  <AlertIcon />
                </div>
                <div>
                  <strong>Recruiter action</strong>
                  <span>{insights.recruiterAction}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="cde-panel cde-progress-map" data-testid="candidate-experience-skill-map">
            <div className="cde-panel-header cde-panel-header-flush">
              <div>
                <h4>Skill Evidence Map</h4>
                <span>Based on extracted experience text</span>
              </div>
            </div>
            {skillMap.map((row) => (
              <div key={row.key} className="cde-map-row">
                <span>{row.key}</span>
                <div className="cde-bar">
                  <i style={{ width: `${row.score}%` }} />
                </div>
                <b>{row.score}%</b>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <div className="cde-bottom-grid">
        <div className="cde-panel cde-mini-panel" ref={checklistRef} data-testid="candidate-experience-checklist">
          <h4>Data Quality Checklist</h4>
          <table className="cde-review-table">
            <thead>
              <tr>
                <th>Check</th>
                <th>Status</th>
                <th>Recruiter action</th>
              </tr>
            </thead>
            <tbody>
              {checklist.map((row) => (
                <tr key={row.check}>
                  <td>{row.check}</td>
                  <td>
                    <span className={`cde-status ${row.status}`}>{row.statusLabel}</span>
                  </td>
                  <td>{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="cde-panel cde-mini-panel" data-testid="candidate-experience-interview-probes">
          <h4>Suggested Interview Probes</h4>
          <div className="cde-empty-note">{probes}</div>
        </div>
      </div>

      {addOpen ? (
        <div className="cde-modal-backdrop" role="presentation" onClick={() => setAddOpen(false)}>
          <div
            className="cde-modal"
            role="dialog"
            aria-labelledby="cde-add-exp-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 id="cde-add-exp-title">Add Experience</h4>
            <p>Capture a role for recruiter review. Persist structured history via Parse resume.</p>
            <div className="cde-modal-grid">
              <label>
                Role title
                <input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                />
              </label>
              <label>
                Company
                <input
                  value={draft.company}
                  onChange={(e) => setDraft({ ...draft, company: e.target.value })}
                />
              </label>
              <label>
                Start date
                <input
                  value={draft.start_date}
                  onChange={(e) => setDraft({ ...draft, start_date: e.target.value })}
                  placeholder="May 2022"
                />
              </label>
              <label>
                End date
                <input
                  value={draft.end_date}
                  onChange={(e) => setDraft({ ...draft, end_date: e.target.value })}
                  placeholder="Present"
                />
              </label>
              <label className="cde-modal-full">
                Description
                <textarea
                  rows={4}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </label>
            </div>
            <div className="cde-modal-actions">
              <button type="button" className="cde-btn cde-btn-ghost" onClick={() => setAddOpen(false)}>
                Cancel
              </button>
              <button type="button" className="cde-btn cde-btn-primary" onClick={submitDraftExperience}>
                Save experience
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
