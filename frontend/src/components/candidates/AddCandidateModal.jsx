import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { applicationsApi, candidatesApi } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const DRAFT_STORAGE_KEY = 'aai_hrms.add_candidate_draft.v1';
const TALENT_POOL_VALUE = '__talent_pool__';
const VALID_EXTENSIONS = ['.pdf', '.docx'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const UPLOAD_SOURCE_OPTIONS = [
  { value: 'DIRECT_UPLOAD', label: 'Resume Upload' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'TALENT_POOL', label: 'Inhouse Database' },
  { value: 'OTHER', label: 'Agency' },
];

const MANUAL_SOURCE_OPTIONS = [
  { value: 'DIRECT_UPLOAD', label: 'Manual Entry' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'TALENT_POOL', label: 'Inhouse Database' },
];

const PROCESS_STEPS = [
  { num: 1, label: 'Upload', sub: 'Resume added' },
  { num: 2, label: 'Extract', sub: 'AI reads profile' },
  { num: 3, label: 'Review', sub: 'Verify fields' },
  { num: 4, label: 'Add', sub: 'Create candidate' },
];

const DEFAULT_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  location: '',
  total_experience_years: '',
  current_role: '',
  current_company: '',
  summary: '',
  skills: [],
  source: 'DIRECT_UPLOAD',
  target_job_id: TALENT_POOL_VALUE,
  recruiter_owner: '',
};

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildHeadline(role, company) {
  const r = String(role || '').trim();
  const c = String(company || '').trim();
  if (r && c) return `${r} at ${c}`;
  return r || c || '';
}

function getProcessStepState(activeStep, stepNum) {
  if (stepNum < activeStep) return 'done';
  if (stepNum === activeStep) return 'active';
  return '';
}

export default function AddCandidateModal({ open, onOpenChange, openJobs = [], onSuccess }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const draftHydratedRef = useRef(false);

  const [activeTab, setActiveTab] = useState('upload');
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [processStep, setProcessStep] = useState(1);
  const [uploadSource, setUploadSource] = useState('DIRECT_UPLOAD');
  const [uploadTargetJobId, setUploadTargetJobId] = useState(TALENT_POOL_VALUE);
  const [recruiterOwner, setRecruiterOwner] = useState('');
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [skillInput, setSkillInput] = useState('');

  const ownerLabel = user?.full_name || user?.name || user?.email || 'QA Admin';

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open || draftHydratedRef.current) return;
    draftHydratedRef.current = true;
    try {
      const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) {
        setRecruiterOwner(ownerLabel);
        return;
      }
      const draft = JSON.parse(raw);
      if (draft.activeTab) setActiveTab(draft.activeTab);
      if (draft.uploadSource) setUploadSource(draft.uploadSource);
      if (draft.uploadTargetJobId) setUploadTargetJobId(draft.uploadTargetJobId);
      if (draft.recruiterOwner) setRecruiterOwner(draft.recruiterOwner);
      else setRecruiterOwner(ownerLabel);
      if (draft.formData) {
        setFormData({ ...DEFAULT_FORM, ...draft.formData, skills: draft.formData.skills || [] });
      }
    } catch {
      setRecruiterOwner(ownerLabel);
    }
  }, [open, ownerLabel]);

  const resetModal = useCallback(() => {
    setActiveTab('upload');
    setSelectedFile(null);
    setDragOver(false);
    setUploading(false);
    setSubmitting(false);
    setProcessStep(1);
    setUploadSource('DIRECT_UPLOAD');
    setUploadTargetJobId(TALENT_POOL_VALUE);
    setRecruiterOwner(ownerLabel);
    setFormData(DEFAULT_FORM);
    setSkillInput('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [ownerLabel]);

  const handleClose = () => {
    onOpenChange(false);
    resetModal();
    draftHydratedRef.current = false;
  };

  const saveDraft = () => {
    const payload = {
      activeTab,
      uploadSource,
      uploadTargetJobId,
      recruiterOwner,
      formData,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
    toast.success('Draft saved locally.');
  };

  const validateFile = (file) => {
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!VALID_EXTENSIONS.includes(ext)) {
      toast.error('Only PDF and DOCX files are supported');
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size exceeds 10MB limit');
      return false;
    }
    return true;
  };

  const handleFileSelect = (file) => {
    if (!file || !validateFile(file)) return;
    setSelectedFile(file);
    setProcessStep(1);
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    handleFileSelect(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setProcessStep(1);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    handleFileSelect(file);
  };

  const assignToJob = async (candidateId, jobId) => {
    if (!candidateId || !jobId || jobId === TALENT_POOL_VALUE) return;
    try {
      await applicationsApi.create({
        job_id: jobId,
        candidate_id: candidateId,
        stage: 'SOURCED',
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Candidate created but failed to assign to job');
    }
  };

  const handleParseAndAdd = async () => {
    if (!selectedFile) {
      toast.error('Choose a resume file first');
      return;
    }

    setUploading(true);
    setProcessStep(2);
    try {
      const uploadForm = new FormData();
      uploadForm.append('file', selectedFile);
      uploadForm.append('source', uploadSource);

      const response = await candidatesApi.uploadResume(uploadForm);
      setProcessStep(4);

      if (response.data.is_new) {
        toast.success('Resume parsed! New candidate created');
      } else {
        toast.success('Resume parsed! Existing candidate updated');
      }

      const candidateId = response.data.candidate_id;
      await assignToJob(candidateId, uploadTargetJobId);

      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      onOpenChange(false);
      resetModal();
      onSuccess?.();
      if (candidateId) {
        navigate(`/candidates/${candidateId}`);
      }
    } catch (error) {
      setProcessStep(selectedFile ? 1 : 1);
      toast.error(error.response?.data?.detail || 'Failed to parse resume');
    } finally {
      setUploading(false);
    }
  };

  const addSkill = (value) => {
    const skill = value.trim();
    if (!skill) return;
    setFormData((prev) => {
      if (prev.skills.includes(skill)) return prev;
      return { ...prev, skills: [...prev.skills, skill] };
    });
    setSkillInput('');
  };

  const removeSkill = (skill) => {
    setFormData((prev) => ({ ...prev, skills: prev.skills.filter((s) => s !== skill) }));
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    const firstName = formData.first_name.trim();
    const lastName = formData.last_name.trim();
    if (!firstName || !lastName) {
      toast.error('First name and last name are required');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('Email is required');
      return;
    }

    setSubmitting(true);
    try {
      const fullName = `${firstName} ${lastName}`.trim();
      const data = {
        full_name: fullName,
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        location: formData.location.trim() || null,
        headline: buildHeadline(formData.current_role, formData.current_company) || null,
        total_experience_years: formData.total_experience_years
          ? parseFloat(formData.total_experience_years)
          : null,
        skills: formData.skills,
        source: formData.source,
        resume_text: formData.summary.trim() || null,
      };

      const response = await candidatesApi.create(data);
      const candidateId = response.data?.id;

      await assignToJob(candidateId, formData.target_job_id);

      toast.success('Candidate added successfully');
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      onOpenChange(false);
      resetModal();
      onSuccess?.();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add candidate');
    } finally {
      setSubmitting(false);
    }
  };

  const jobOptions = openJobs.map((job) => ({
    value: job.id,
    label: job.title || job.job_title || `Job ${job.id}`,
  }));

  if (!open) return null;

  const primaryLabel =
    activeTab === 'upload'
      ? uploading
        ? 'Parsing…'
        : 'Parse & Add Candidate'
      : submitting
        ? 'Adding…'
        : 'Add Candidate';

  const primaryDisabled =
    activeTab === 'upload' ? uploading || !selectedFile : submitting || !formData.first_name.trim();

  const handlePrimaryAction = () => {
    if (activeTab === 'upload') {
      handleParseAndAdd();
    } else {
      document.getElementById('anc-manual-form')?.requestSubmit();
    }
  };

  return createPortal(
    <div
      className="anc-modal-root anc-modal-layer"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      data-testid="add-candidate-modal"
    >
      <div className="anc-modal" role="dialog" aria-modal="true" aria-labelledby="anc-modalTitle">
        <div className="anc-modal-head">
          <div className="anc-headline">
            <div className="anc-modal-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M19 8v6M16 11h6" />
              </svg>
            </div>
            <div>
              <h1 id="anc-modalTitle">Add New Candidate</h1>
              <p className="anc-modal-subtitle">
                Upload a resume for AI extraction or enter candidate details manually.
              </p>
              <div className="anc-head-badges">
                <span className="anc-chip purple">AI Resume Parser</span>
                <span className="anc-chip green">Duplicate Detection</span>
                <span className="anc-chip blue">Auto Skill Mapping</span>
              </div>
            </div>
          </div>
          <button type="button" className="anc-close-btn" aria-label="Close modal" onClick={handleClose}>
            <svg viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="anc-modal-body">
          <div className="anc-segmented" role="tablist" aria-label="Candidate creation method">
            <button
              type="button"
              className={`anc-seg-tab ${activeTab === 'upload' ? 'active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'upload'}
              onClick={() => setActiveTab('upload')}
            >
              <svg viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <path d="M17 8l-5-5-5 5" />
                <path d="M12 3v12" />
              </svg>
              Upload Resume
            </button>
            <button
              type="button"
              className={`anc-seg-tab ${activeTab === 'manual' ? 'active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'manual'}
              onClick={() => setActiveTab('manual')}
            >
              <svg viewBox="0 0 24 24">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
              Manual Entry
            </button>
          </div>

          <div
            id="anc-upload"
            className={`anc-tab-panel ${activeTab === 'upload' ? 'active' : ''}`}
            role="tabpanel"
          >
            <div className="anc-upload-grid">
              <div
                className={`anc-drop-card ${dragOver ? 'anc-drag-over' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => !uploading && fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label="Upload candidate resume (PDF, DOC, or DOCX)"
              >
                <div className="anc-upload-center">
                  {uploading ? (
                    <div className="anc-parsing">
                      <div className="anc-spinner" aria-hidden="true" />
                      <h2>Parsing resume with AI…</h2>
                      <p>Extracting profile fields and checking for duplicates.</p>
                    </div>
                  ) : (
                    <>
                      <div className="anc-upload-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <path d="M17 8l-5-5-5 5" />
                          <path d="M12 3v12" />
                        </svg>
                      </div>
                      <h2>Drag and Drop Resume Here</h2>
                      <p>or browse your device to upload a candidate profile.</p>
                      <input
                        ref={fileInputRef}
                        id="anc-resumeFile"
                        className="anc-file-input"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileInputChange}
                        data-testid="resume-upload-input"
                      />
                      <label
                        className="anc-file-label"
                        htmlFor="anc-resumeFile"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg viewBox="0 0 24 24">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                        Choose Resume
                      </label>
                      <div className="anc-support-row">
                        <span className="anc-format-pill">PDF</span>
                        <span className="anc-format-pill">DOC</span>
                        <span className="anc-format-pill">DOCX</span>
                        <span className="anc-format-pill">Max 10 MB</span>
                      </div>
                    </>
                  )}
                  <div className={`anc-file-selected ${selectedFile && !uploading ? 'show' : ''}`}>
                    <div className="anc-file-left">
                      <span className="anc-file-doc" aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <path d="M14 2v6h6" />
                        </svg>
                      </span>
                      <div>
                        <div className="anc-file-name">{selectedFile?.name}</div>
                        <div className="anc-file-meta">
                          {selectedFile ? `${formatFileSize(selectedFile.size)} · Ready for AI extraction` : ''}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="anc-remove-file"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile();
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>

              <aside className="anc-readiness-panel">
                <div className="anc-readiness-head">
                  <span className="anc-spark-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
                      <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14z" />
                    </svg>
                  </span>
                  <div>
                    <h3>AI Extraction Readiness</h3>
                    <p>Resume parsing will prefill the candidate record and highlight missing fields.</p>
                  </div>
                </div>
                <div className="anc-score-box">
                  <div className="anc-score-top">
                    <strong>Expected Extraction Quality</strong>
                    <span>High</span>
                  </div>
                  <div className="anc-bar">
                    <i />
                  </div>
                </div>
                <div className="anc-ai-checks">
                  <div className="anc-ai-check">
                    <span className="anc-check-dot">✓</span>
                    <span>Name, email, phone and location extraction</span>
                  </div>
                  <div className="anc-ai-check">
                    <span className="anc-check-dot">✓</span>
                    <span>Experience timeline and employer normalization</span>
                  </div>
                  <div className="anc-ai-check">
                    <span className="anc-check-dot">✓</span>
                    <span>Skills, education and role-fit signals</span>
                  </div>
                  <div className="anc-ai-check">
                    <span className="anc-check-dot">✓</span>
                    <span>Duplicate candidate check before save</span>
                  </div>
                </div>
                <div className="anc-mini-note">
                  <strong>Recruiter Tip</strong>
                  Use the latest resume. The parser works best when contact details and employment dates are
                  clearly visible.
                </div>
              </aside>
            </div>

            <div className="anc-info-banner">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M9 15h6M9 11h3" />
              </svg>
              <div>
                <strong>AI will automatically build the candidate profile.</strong>
                <span>
                  It extracts name, contact information, skills, education, experience, role history, and match
                  signals. You can review everything before adding the candidate to the pool.
                </span>
              </div>
            </div>

            <div className="anc-quick-options">
              <div className="anc-field">
                <label htmlFor="anc-targetJob">Target Job</label>
                <select
                  id="anc-targetJob"
                  value={uploadTargetJobId}
                  onChange={(e) => setUploadTargetJobId(e.target.value)}
                >
                  {jobOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                  <option value={TALENT_POOL_VALUE}>Keep in Talent Pool Only</option>
                </select>
              </div>
              <div className="anc-field">
                <label htmlFor="anc-candidateSource">Candidate Source</label>
                <select
                  id="anc-candidateSource"
                  value={uploadSource}
                  onChange={(e) => setUploadSource(e.target.value)}
                >
                  {UPLOAD_SOURCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="anc-field">
                <label htmlFor="anc-owner">Recruiter Owner</label>
                <select
                  id="anc-owner"
                  value={recruiterOwner}
                  onChange={(e) => setRecruiterOwner(e.target.value)}
                >
                  <option value={ownerLabel}>{ownerLabel}</option>
                  <option value="Talent Acquisition Team">Talent Acquisition Team</option>
                  <option value="Hiring Manager">Hiring Manager</option>
                </select>
              </div>
            </div>

            <div className="anc-process-strip">
              {PROCESS_STEPS.map((step) => {
                const state = getProcessStepState(processStep, step.num);
                return (
                  <div key={step.num} className={`anc-process-step ${state}`.trim()}>
                    <span className="anc-process-index">{step.num}</span>
                    <div>
                      <strong>{step.label}</strong>
                      <span>{step.sub}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            id="anc-manual"
            className={`anc-tab-panel ${activeTab === 'manual' ? 'active' : ''}`}
            role="tabpanel"
          >
            <form id="anc-manual-form" onSubmit={handleManualSubmit}>
              <div className="anc-sub-card">
                <h3>Candidate Details</h3>
                <p>Enter the core profile information. Resume can still be attached later for AI enrichment.</p>
                <div className="anc-manual-form">
                  <div className="anc-field">
                    <label htmlFor="anc-firstName">
                      First Name <span className="anc-required">*</span>
                    </label>
                    <input
                      id="anc-firstName"
                      type="text"
                      placeholder="e.g., Abhinav"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      required
                      data-testid="candidate-name-input"
                    />
                  </div>
                  <div className="anc-field">
                    <label htmlFor="anc-lastName">
                      Last Name <span className="anc-required">*</span>
                    </label>
                    <input
                      id="anc-lastName"
                      type="text"
                      placeholder="e.g., Bhardwaj"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="anc-field">
                    <label htmlFor="anc-email">
                      Email <span className="anc-required">*</span>
                    </label>
                    <input
                      id="anc-email"
                      type="email"
                      placeholder="candidate@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      data-testid="candidate-email-input"
                    />
                  </div>
                  <div className="anc-field">
                    <label htmlFor="anc-phone">Phone</label>
                    <input
                      id="anc-phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      data-testid="candidate-phone-input"
                    />
                  </div>
                  <div className="anc-field">
                    <label htmlFor="anc-location">Current Location</label>
                    <input
                      id="anc-location"
                      type="text"
                      placeholder="Mumbai, India"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>
                  <div className="anc-field">
                    <label htmlFor="anc-experience">Total Experience</label>
                    <input
                      id="anc-experience"
                      type="text"
                      placeholder="3.1 years"
                      value={formData.total_experience_years}
                      onChange={(e) =>
                        setFormData({ ...formData, total_experience_years: e.target.value })
                      }
                    />
                  </div>
                  <div className="anc-field">
                    <label htmlFor="anc-currentRole">Current Role</label>
                    <input
                      id="anc-currentRole"
                      type="text"
                      placeholder="Business Intelligence Analyst"
                      value={formData.current_role}
                      onChange={(e) => setFormData({ ...formData, current_role: e.target.value })}
                      data-testid="candidate-headline-input"
                    />
                  </div>
                  <div className="anc-field">
                    <label htmlFor="anc-currentCompany">Current Company</label>
                    <input
                      id="anc-currentCompany"
                      type="text"
                      placeholder="Company name"
                      value={formData.current_company}
                      onChange={(e) => setFormData({ ...formData, current_company: e.target.value })}
                    />
                  </div>
                  <div className="anc-field anc-full">
                    <label htmlFor="anc-summary">Summary</label>
                    <textarea
                      id="anc-summary"
                      placeholder="Add a short recruiter summary, career highlights, or notes from the candidate profile."
                      value={formData.summary}
                      onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="anc-sub-card">
                <h3>Skills and Ownership</h3>
                <p>Add the most important skills and assign the profile to a recruiter or target job.</p>
                <div className="anc-manual-form">
                  <div className="anc-field anc-full">
                    <label htmlFor="anc-skills">Skills</label>
                    <div className="anc-skills-input">
                      {formData.skills.map((skill) => (
                        <span key={skill} className="anc-skill-chip">
                          {skill}
                          <button type="button" onClick={() => removeSkill(skill)} aria-label={`Remove ${skill}`}>
                            ×
                          </button>
                        </span>
                      ))}
                      <input
                        id="anc-skills"
                        className="anc-skill-placeholder"
                        placeholder="Type skill and press Enter"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addSkill(skillInput);
                          }
                        }}
                        data-testid="candidate-skills-input"
                      />
                    </div>
                  </div>
                  <div className="anc-field">
                    <label htmlFor="anc-manualTargetJob">Target Job</label>
                    <select
                      id="anc-manualTargetJob"
                      value={formData.target_job_id}
                      onChange={(e) => setFormData({ ...formData, target_job_id: e.target.value })}
                    >
                      {jobOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                      <option value={TALENT_POOL_VALUE}>Keep in Talent Pool Only</option>
                    </select>
                  </div>
                  <div className="anc-field">
                    <label htmlFor="anc-manualSource">Source</label>
                    <select
                      id="anc-manualSource"
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    >
                      {MANUAL_SOURCE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>

        <div className="anc-modal-footer">
          <div className="anc-footer-left">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            Candidate data stays private and is processed only for hiring workflow creation.
          </div>
          <div className="anc-footer-actions">
            <button type="button" className="anc-btn secondary" onClick={handleClose}>
              Cancel
            </button>
            <button type="button" className="anc-btn ghost" onClick={saveDraft}>
              Save as Draft
            </button>
            <button
              type="button"
              className="anc-btn primary"
              disabled={primaryDisabled}
              onClick={handlePrimaryAction}
              data-testid="submit-candidate-btn"
            >
              <svg viewBox="0 0 24 24">
                <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
              </svg>
              {primaryLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
