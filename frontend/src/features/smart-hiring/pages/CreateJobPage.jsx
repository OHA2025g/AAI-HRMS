import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Loader2,
  Save,
  Sparkles,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { jobsApi } from '@/shared/lib/api';
import {
  BUSINESS_ORG_PILLARS,
  getDepartmentsForPillar,
  getSubDepartmentsForDepartment,
} from '@/data/businessOrgHierarchy';
import HiringTeamFields from '@/features/smart-hiring/components/hiring/HiringTeamFields';
import CreateJobCommandTopbar from '@/features/smart-hiring/components/create-job/CreateJobCommandTopbar';
import CreateJobCommandSidebar from '@/features/smart-hiring/components/create-job/CreateJobCommandSidebar';
import { useAuth } from '@/shared/context/AuthContext';
import { useHiringPermissions } from '@/shared/hooks/useHiringPermissions';

const DRAFT_STORAGE_KEY = 'aai_hrms.create_job_draft.v1';

const STEPS = [
  { num: 1, label: 'Basic Information' },
  { num: 2, label: 'Job / Role Details' },
  { num: 3, label: 'Skills & Scoring' },
  { num: 4, label: 'Review & Publish' },
];

const STEP_META = {
  1: {
    title: 'Step 1 — Basic Information',
    subtitle:
      'Classify the role by business pillar, department, sub-department, and optional project link before entering the JD.',
    next: 'Next: Job/Role Details',
  },
  2: {
    title: 'Step 2 — Job / Role Details',
    subtitle:
      'Capture title, location, and experience. You can write a role summary now or generate it with Mistral after adding skills.',
    next: 'Next: Skills & Scoring',
  },
  3: {
    title: 'Step 3 — Skills & Scoring',
    subtitle:
      'Define must-have and good-to-have skills, then generate a full JD with Mistral AI before review.',
    next: 'Next: Review',
  },
  4: {
    title: 'Step 4 — Review & Publish',
    subtitle:
      'Validate the requisition preview, check readiness, and publish the job for sourcing and AI matching.',
    next: 'Publish Job',
  },
};

const SENIORITY_OPTIONS = ['Intern', 'Junior', 'Associate', 'Mid-Level', 'Senior', 'Lead', 'Manager'];
const WORK_MODES = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
];

const SUGGESTED_SKILL_TAGS = [
  { label: '+ SQL', tone: 'purple' },
  { label: '+ Analytics', tone: 'purple' },
  { label: '+ Stakeholder Communication', tone: 'teal' },
  { label: '+ Domain Exposure', tone: 'amber' },
  { label: '+ Leadership Potential', tone: '' },
];

function resolvePillarIdFromLabel(label) {
  if (!label) return '';
  return BUSINESS_ORG_PILLARS.find((p) => p.label === label)?.id || '';
}

function resolveDepartmentIdFromLabels(pillarId, deptLabel) {
  if (!pillarId || !deptLabel) return '';
  return getDepartmentsForPillar(pillarId).find((d) => d.label === deptLabel)?.id || '';
}

function parseSkillList(text) {
  return [...new Set(text.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean))];
}

function formatSavedAgo(date) {
  if (!date) return 'Not saved yet';
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 10) return 'Autosaved just now';
  if (sec < 60) return `Autosaved ${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `Autosaved ${min}m ago`;
  return `Autosaved at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export default function CreateJobPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const perms = useHiringPermissions(user);
  const { jobId: editJobId } = useParams();
  const isEdit = Boolean(editJobId);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [generatingJd, setGeneratingJd] = useState(false);
  const [fetchJobLoading, setFetchJobLoading] = useState(!!editJobId);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const [pillarId, setPillarId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [subDepartment, setSubDepartment] = useState('');
  const [projectId, setProjectId] = useState('');
  const [hiringOwner, setHiringOwner] = useState(user?.full_name || '');
  const [hiringIntent, setHiringIntent] = useState('new');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [experienceRange, setExperienceRange] = useState('');
  const [workMode, setWorkMode] = useState('hybrid');
  const [seniority, setSeniority] = useState('');
  const [mustHaveText, setMustHaveText] = useState('');
  const [goodHaveText, setGoodHaveText] = useState('');
  const [skillsNeeded, setSkillsNeeded] = useState([]);
  const [mustHaveSkills, setMustHaveSkills] = useState([]);
  const [scoringEmphasis, setScoringEmphasis] = useState('balanced');
  const [hiringTeam, setHiringTeam] = useState({
    hiring_manager_id: null,
    technical_manager_id: null,
    project_manager_id: null,
    recruiter_id: null,
  });

  const importInputRef = useRef(null);
  const dropzoneInputRef = useRef(null);
  const draftHydratedRef = useRef(false);

  useEffect(() => {
    if (user?.full_name && !hiringOwner) setHiringOwner(user.full_name);
  }, [user?.full_name, hiringOwner]);

  const syncSkillsFromText = useCallback((mustText, goodText) => {
    const must = parseSkillList(mustText);
    const good = parseSkillList(goodText).filter((s) => !must.includes(s));
    const all = [...new Set([...must, ...good])];
    setMustHaveSkills(must);
    setSkillsNeeded(all);
  }, []);

  useEffect(() => {
    if (isEdit || draftHydratedRef.current) return;
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(DRAFT_STORAGE_KEY) : null;
    if (!raw) {
      draftHydratedRef.current = true;
      return;
    }
    try {
      const d = JSON.parse(raw);
      if (d.pillarId) setPillarId(d.pillarId);
      if (d.departmentId) setDepartmentId(d.departmentId);
      if (d.subDepartment) setSubDepartment(d.subDepartment);
      if (d.projectId) setProjectId(d.projectId);
      if (d.hiringOwner) setHiringOwner(d.hiringOwner);
      if (d.hiringIntent) setHiringIntent(d.hiringIntent);
      if (d.title) setTitle(d.title);
      if (d.description) setDescription(d.description);
      if (d.location) setLocation(d.location);
      if (d.experienceRange) setExperienceRange(d.experienceRange);
      if (d.workMode) setWorkMode(d.workMode);
      if (d.seniority) setSeniority(d.seniority);
      if (d.mustHaveText) setMustHaveText(d.mustHaveText);
      if (d.goodHaveText) setGoodHaveText(d.goodHaveText);
      if (d.scoringEmphasis) setScoringEmphasis(d.scoringEmphasis);
      if (typeof d.step === 'number') setStep(d.step);
      if (d.savedAt) setLastSavedAt(new Date(d.savedAt));
    } catch {
      /* ignore corrupt draft */
    }
    draftHydratedRef.current = true;
  }, [isEdit]);

  useEffect(() => {
    if (isEdit) return undefined;
    const t = setTimeout(() => {
      const payload = {
        pillarId,
        departmentId,
        subDepartment,
        projectId,
        hiringOwner,
        hiringIntent,
        title,
        description,
        location,
        experienceRange,
        workMode,
        seniority,
        mustHaveText,
        goodHaveText,
        scoringEmphasis,
        step,
        savedAt: new Date().toISOString(),
      };
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
      setLastSavedAt(new Date());
    }, 800);
    return () => clearTimeout(t);
  }, [
    isEdit,
    pillarId,
    departmentId,
    subDepartment,
    projectId,
    hiringOwner,
    hiringIntent,
    title,
    description,
    location,
    experienceRange,
    workMode,
    seniority,
    mustHaveText,
    goodHaveText,
    scoringEmphasis,
    step,
  ]);

  useEffect(() => {
    syncSkillsFromText(mustHaveText, goodHaveText);
  }, [mustHaveText, goodHaveText, syncSkillsFromText]);

  useEffect(() => {
    if (!editJobId) {
      setFetchJobLoading(false);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setFetchJobLoading(true);
      try {
        const res = await jobsApi.get(editJobId);
        const job = res.data;
        if (cancelled) return;
        const pId = resolvePillarIdFromLabel(job.business_pillar);
        setPillarId(pId);
        setDepartmentId(resolveDepartmentIdFromLabels(pId, job.business_department));
        setSubDepartment(job.business_sub_department || '');
        setProjectId(job.project_id ? String(job.project_id) : '');
        setTitle(job.title || '');
        setDescription(job.description || '');
        setLocation(job.location || '');
        setWorkMode(job.work_mode || 'hybrid');
        setSeniority(job.seniority || '');
        const skillRows = Array.isArray(job.skills) ? job.skills : [];
        const names = [...new Set(skillRows.map((s) => s.skill_name).filter(Boolean))];
        const must = [
          ...new Set(
            skillRows.filter((s) => s.skill_type === 'MUST_HAVE').map((s) => s.skill_name).filter(Boolean)
          ),
        ];
        setSkillsNeeded(names);
        setMustHaveSkills(must);
        setMustHaveText(must.join(', '));
        setGoodHaveText(names.filter((n) => !must.includes(n)).join(', '));
        const ht = job.hiring_team || {};
        setHiringTeam({
          hiring_manager_id: ht.hiring_manager_id || null,
          technical_manager_id: ht.technical_manager_id || null,
          project_manager_id: ht.project_manager_id || null,
          recruiter_id: ht.recruiter_id || null,
        });
      } catch (e) {
        toast.error(e.response?.data?.detail || 'Failed to load job');
        navigate('/jobs');
      } finally {
        if (!cancelled) setFetchJobLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editJobId, navigate]);

  const departmentOptions = pillarId ? getDepartmentsForPillar(pillarId) : [];
  const subDepartmentOptions =
    pillarId && departmentId ? getSubDepartmentsForDepartment(pillarId, departmentId) : [];

  const pillarLabel = BUSINESS_ORG_PILLARS.find((p) => p.id === pillarId)?.label || '';
  const deptLabel = departmentOptions.find((d) => d.id === departmentId)?.label || '';

  const preview = useMemo(
    () => ({
      pillar: pillarLabel || 'Not selected',
      department: deptLabel ? `${deptLabel}${subDepartment ? ` / ${subDepartment}` : ''}` : 'Not selected',
      project: projectId.trim() || 'Optional',
      title: title.trim() || 'Untitled requisition',
    }),
    [pillarLabel, deptLabel, subDepartment, projectId, title]
  );

  const readinessPct = step * 25;
  const meta = STEP_META[step];

  const isStep1Valid = Boolean(pillarId && departmentId && subDepartment);
  const isStep2Valid = Boolean(title.trim());
  const isStep3Valid = skillsNeeded.length > 0 && mustHaveSkills.length > 0;

  const canGoNext =
    (step === 1 && isStep1Valid) ||
    (step === 2 && isStep2Valid) ||
    (step === 3 && isStep3Valid) ||
    step === 4;

  const handleSaveDraft = () => {
    if (isEdit) {
      toast.info('Use Save changes on the review step to update this requisition.');
      return;
    }
    const payload = {
      pillarId,
      departmentId,
      subDepartment,
      projectId,
      hiringOwner,
      hiringIntent,
      title,
      description,
      location,
      experienceRange,
      workMode,
      seniority,
      mustHaveText,
      goodHaveText,
      scoringEmphasis,
      step,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
    setLastSavedAt(new Date());
    toast.success('Draft saved locally.');
  };

  const handleImportFile = async (file) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (name.endsWith('.txt') || file.type.startsWith('text/')) {
      try {
        const text = await file.text();
        if (text.trim()) {
          setDescription((prev) => (prev.trim() ? `${prev.trim()}\n\n${text.trim()}` : text.trim()));
          if (step < 2) setStep(2);
          toast.success('JD text imported into role summary.');
        }
      } catch {
        toast.error('Could not read the file.');
      }
      return;
    }
    toast.info('Import supports plain text (.txt) files. PDF/DOCX parsing can be added later.');
  };

  const addSuggestedSkill = (label) => {
    const skill = label.replace(/^\+\s*/, '').trim();
    if (!skill) return;
    if (!mustHaveText.toLowerCase().includes(skill.toLowerCase())) {
      setMustHaveText((prev) => (prev.trim() ? `${prev}, ${skill}` : skill));
    }
  };

  const handleGenerateJd = async ({ jumpToSummary = false } = {}) => {
    if (!title.trim()) {
      toast.error('Add a job title before generating a JD.');
      if (step !== 2) setStep(2);
      return;
    }
    if (!mustHaveSkills.length) {
      toast.error('Add at least one must-have skill before generating a JD.');
      if (step !== 3) setStep(3);
      return;
    }

    const goodSkills = skillsNeeded.filter(
      (s) => !mustHaveSkills.some((m) => m.toLowerCase() === s.toLowerCase())
    );

    setGeneratingJd(true);
    try {
      const { data } = await jobsApi.generateJd({
        title: title.trim(),
        must_have_skills: mustHaveSkills,
        good_to_have_skills: goodSkills.length ? goodSkills : parseSkillList(goodHaveText),
        location: location.trim() || null,
        work_mode: workMode || null,
        seniority: seniority || null,
        experience_range: experienceRange.trim() || null,
        business_pillar: pillarLabel || null,
        business_department: deptLabel || null,
        business_sub_department: subDepartment || null,
        project_id: projectId.trim() || null,
      });
      const nextDescription = (data?.description || '').trim();
      if (!nextDescription) {
        toast.error('AI returned an empty job description. Try again.');
        return;
      }
      setDescription(nextDescription);
      if (jumpToSummary || step === 3) setStep(2);
      if (data?.used_fallback) {
        toast.success('JD draft generated from a template (Mistral unavailable). Review and edit.');
      } else {
        toast.success(
          data?.provider === 'mistral'
            ? 'JD generated with Mistral AI. Review and edit as needed.'
            : 'JD generated with AI. Review and edit as needed.'
        );
      }
    } catch (error) {
      const detail = error?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Could not generate JD. Try again.');
    } finally {
      setGeneratingJd(false);
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error('Add or generate a role summary / JD before publishing.');
      setStep(2);
      return;
    }
    const skillsPayload = skillsNeeded.map((name) => ({
      skill_name: name,
      skill_type: mustHaveSkills.includes(name) ? 'MUST_HAVE' : 'GOOD_TO_HAVE',
      weight: 1.0,
    }));

    if (editJobId) {
      setLoading(true);
      try {
        await jobsApi.update(editJobId, {
          title,
          description,
          location,
          work_mode: workMode,
          seniority: seniority || null,
          business_pillar: pillarLabel || null,
          business_department: deptLabel || null,
          business_sub_department: subDepartment || null,
          project_id: projectId.trim() || null,
          skills: skillsPayload,
          ...(perms.canEditJobTeam ? { hiring_team: hiringTeam } : {}),
        });
        toast.success('Job requisition updated.');
        navigate(`/jobs/${editJobId}`);
      } catch (error) {
        toast.error(error.response?.data?.detail || 'Failed to update job');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setAnalyzing(true);
    try {
      const jobData = {
        title,
        description,
        location,
        work_mode: workMode,
        seniority,
        skills_needed: skillsNeeded,
        must_have_skills: mustHaveSkills,
        business_pillar: pillarLabel || null,
        business_department: deptLabel || null,
        business_sub_department: subDepartment || null,
        project_id: projectId.trim() || null,
        ...(perms.canEditJobTeam ? { hiring_team: hiringTeam } : {}),
      };
      const res = await jobsApi.create(jobData);
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      toast.success('Job created successfully! AI has analyzed your JD.');
      const createdId = res?.data?.id;
      navigate(createdId ? `/jobs/${createdId}` : '/jobs');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create job');
    } finally {
      setLoading(false);
      setAnalyzing(false);
    }
  };

  const goNext = () => {
    if (step < 4) {
      if ((step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid) || (step === 3 && !isStep3Valid)) {
        toast.error('Please complete required fields before continuing.');
        return;
      }
      setStep(step + 1);
      return;
    }
    handleSubmit();
  };

  const goPrev = () => {
    if (step > 1) setStep(step - 1);
  };

  if (isEdit && fetchJobLoading) {
    return (
      <div className="hiring-dashboard-root top-operational" data-testid="create-job-command-root">
        <div className="cj-loading">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p>Loading job…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="hiring-dashboard-root top-operational" data-testid="create-job-command-root">
      <CreateJobCommandTopbar />

      <section className="cj-workspace">
        <div className="cj-hero">
          <div className="cj-hero-inner">
            <div className="cj-hero-left">
              <button
                type="button"
                className="cj-back-btn"
                onClick={() => navigate('/jobs')}
                data-testid="back-btn"
                aria-label="Back"
              >
                <ArrowLeft size={18} strokeWidth={2.3} />
              </button>
              <div className="cj-hero-icon" aria-hidden>
                <FileText size={36} strokeWidth={1.8} />
              </div>
              <div>
                <div className="cj-title-row">
                  <h1>{isEdit ? 'Edit Job Requisition' : 'Create New Job'}</h1>
                  <span className="cj-chip green">AI JD Generator (Mistral)</span>
                  <span className="cj-chip purple">{isEdit ? 'Edit mode' : 'Draft mode'}</span>
                </div>
                <p className="cj-hero-sub">
                  {isEdit
                    ? 'Update classification, role details, and skills. Save when you are ready.'
                    : 'Build a structured requisition, classify it by organization, and let AI prepare role matching signals automatically.'}
                </p>
                <div className="cj-hero-meta">
                  <span className="cj-chip gray">Owner: {hiringOwner || user?.full_name || '—'}</span>
                  <span className="cj-chip blue">Smart Hiring</span>
                  <span className="cj-chip amber">4-step guided flow</span>
                </div>
              </div>
            </div>
            <div className="cj-hero-actions">
              <button type="button" className="cj-btn ghost" onClick={handleSaveDraft}>
                <Save size={17} strokeWidth={2} />
                Save draft
              </button>
              <button
                type="button"
                className="cj-btn soft"
                onClick={() => importInputRef.current?.click()}
              >
                <Upload size={17} strokeWidth={2} />
                Import JD
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept=".txt,text/plain"
                className="hidden"
                onChange={(e) => {
                  handleImportFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </div>
          </div>
        </div>

        <div className="cj-step-shell">
          <div className="cj-stepper" role="tablist" aria-label="Create job steps">
            {STEPS.map(({ num, label }) => (
              <button
                key={num}
                type="button"
                className={`cj-step ${step === num ? 'active' : ''} ${step > num ? 'done' : ''}`}
                onClick={() => {
                  if (num <= step) setStep(num);
                }}
                data-step={num}
              >
                <span className="cj-step-index">{step > num ? '✓' : num}</span>
                <span>
                  <small>Step {num}</small>
                  <strong>{label}</strong>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="cj-builder-grid">
          <section className="cj-form-card">
            <div className="cj-card-head">
              <div>
                <h2>{meta.title}</h2>
                <p>{meta.subtitle}</p>
              </div>
              <div className="cj-completion">
                <div className="cj-completion-top">
                  <span>Completion</span>
                  <span>{readinessPct}%</span>
                </div>
                <div className="cj-progress">
                  <i style={{ width: `${readinessPct}%` }} />
                </div>
              </div>
            </div>

            <div className="cj-form-body">
              <div className={`cj-step-panel ${step === 1 ? 'active' : ''}`} data-panel="1">
                <div className="cj-subsection">
                  <div className="cj-subsection-title">
                    <div>
                      <h3>Organizational Placement</h3>
                      <p>
                        Only departments mapped to the selected pillar are shown. This keeps the hiring
                        dashboard filters clean.
                      </p>
                    </div>
                    <span className="cj-chip purple">Required</span>
                  </div>
                  <div className="cj-form-grid">
                    <div className="cj-field full">
                      <label htmlFor="cj-pillar">
                        Business Pillar <span className="cj-req">*</span>
                      </label>
                      <select
                        id="cj-pillar"
                        value={pillarId}
                        onChange={(e) => {
                          setPillarId(e.target.value);
                          setDepartmentId('');
                          setSubDepartment('');
                        }}
                        data-testid="job-pillar-select"
                      >
                        <option value="">Select business pillar</option>
                        {BUSINESS_ORG_PILLARS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="cj-field">
                      <label htmlFor="cj-department">
                        Department <span className="cj-req">*</span>
                      </label>
                      <select
                        id="cj-department"
                        value={departmentId}
                        onChange={(e) => {
                          setDepartmentId(e.target.value);
                          setSubDepartment('');
                        }}
                        disabled={!pillarId}
                        data-testid="job-department-select"
                      >
                        <option value="">{pillarId ? 'Select department' : 'Select a pillar first'}</option>
                        {departmentOptions.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="cj-field">
                      <label htmlFor="cj-subdepartment">
                        Sub-department <span className="cj-req">*</span>
                      </label>
                      <select
                        id="cj-subdepartment"
                        value={subDepartment}
                        onChange={(e) => setSubDepartment(e.target.value)}
                        disabled={!departmentId}
                        data-testid="job-subdepartment-select"
                      >
                        <option value="">
                          {departmentId ? 'Select sub-department' : 'Select a department first'}
                        </option>
                        {subDepartmentOptions.map((sub) => (
                          <option key={sub} value={sub}>
                            {sub}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="cj-field">
                      <label htmlFor="cj-project-id">Project ID</label>
                      <input
                        id="cj-project-id"
                        placeholder="e.g., PRJ-2026-0042"
                        value={projectId}
                        onChange={(e) => setProjectId(e.target.value)}
                        data-testid="job-project-id-input"
                      />
                      <div className="cj-field-note">
                        Optional. Link this requisition to a project or cost code.
                      </div>
                    </div>
                    <div className="cj-field">
                      <label htmlFor="cj-hiring-owner">Hiring Owner</label>
                      <input
                        id="cj-hiring-owner"
                        value={hiringOwner}
                        onChange={(e) => setHiringOwner(e.target.value)}
                      />
                      <div className="cj-field-note">Used for SLA reminders and approval routing.</div>
                    </div>
                  </div>
                </div>

                <div className="cj-subsection">
                  <div className="cj-subsection-title">
                    <div>
                      <h3>Hiring Intent</h3>
                      <p>Capture why this requisition exists so AI can tune matching and urgency signals.</p>
                    </div>
                  </div>
                  <div className="cj-inline-options" role="radiogroup" aria-label="Hiring intent">
                    {[
                      { value: 'new', title: 'New Role', desc: 'Fresh position or expansion headcount.' },
                      { value: 'replacement', title: 'Replacement', desc: 'Backfill for an existing team member.' },
                      { value: 'project', title: 'Project-based', desc: 'Role required for a specific delivery milestone.' },
                    ].map((opt) => (
                      <label key={opt.value} className="cj-option-card">
                        <input
                          type="radio"
                          name="hiring-intent"
                          checked={hiringIntent === opt.value}
                          onChange={() => setHiringIntent(opt.value)}
                        />
                        <strong>{opt.title}</strong>
                        <span>{opt.desc}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className={`cj-step-panel ${step === 2 ? 'active' : ''}`} data-panel="2">
                <div className="cj-subsection">
                  <div className="cj-subsection-title">
                    <div>
                      <h3>Role Essentials</h3>
                      <p>
                        Define the position in a structured format. AI uses these fields for job-to-candidate
                        matching.
                      </p>
                    </div>
                    <span className="cj-chip purple">JD core</span>
                  </div>
                  <div className="cj-form-grid">
                    <div className="cj-field">
                      <label htmlFor="cj-title">
                        Job Title <span className="cj-req">*</span>
                      </label>
                      <input
                        id="cj-title"
                        placeholder="e.g., Data Analyst"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        data-testid="job-title-input"
                      />
                    </div>
                    <div className="cj-field">
                      <label htmlFor="cj-seniority">
                        Seniority Level <span className="cj-req">*</span>
                      </label>
                      <select
                        id="cj-seniority"
                        value={seniority}
                        onChange={(e) => setSeniority(e.target.value)}
                        data-testid="seniority-select"
                      >
                        <option value="">Select level</option>
                        {SENIORITY_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="cj-field">
                      <label htmlFor="cj-location">Work Location</label>
                      <input
                        id="cj-location"
                        placeholder="e.g., Mumbai / Hybrid"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        data-testid="job-location-input"
                      />
                    </div>
                    <div className="cj-field">
                      <label htmlFor="cj-experience">Experience Range</label>
                      <input
                        id="cj-experience"
                        placeholder="e.g., 3–6 years"
                        value={experienceRange}
                        onChange={(e) => setExperienceRange(e.target.value)}
                      />
                    </div>
                    <div className="cj-field">
                      <label htmlFor="cj-work-mode">Work Mode</label>
                      <select
                        id="cj-work-mode"
                        value={workMode}
                        onChange={(e) => setWorkMode(e.target.value)}
                        data-testid="work-mode-select"
                      >
                        {WORK_MODES.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="cj-field full">
                      <div className="cj-label-row">
                        <label htmlFor="cj-summary">
                          Role Summary / JD <span className="cj-req">*</span>
                        </label>
                        <button
                          type="button"
                          className="cj-btn soft cj-btn-sm"
                          onClick={() => handleGenerateJd({ jumpToSummary: false })}
                          disabled={generatingJd || loading}
                          data-testid="generate-jd-btn"
                        >
                          {generatingJd ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Generating…
                            </>
                          ) : (
                            <>
                              <Sparkles size={16} strokeWidth={2} />
                              Generate with Mistral
                            </>
                          )}
                        </button>
                      </div>
                      <textarea
                        id="cj-summary"
                        placeholder="Write a short role summary, or generate a full JD with Mistral after adding must-have / good-to-have skills."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        data-testid="job-description-input"
                      />
                      <p className="cj-field-hint">
                        Tip: add skills in Step 3, then use Generate with Mistral to draft the full JD from title + skills.
                      </p>
                    </div>
                  </div>
                </div>

                {perms.canEditJobTeam ? (
                  <div className="cj-subsection">
                    <HiringTeamFields value={hiringTeam} onChange={setHiringTeam} />
                  </div>
                ) : null}

                <div
                  className="cj-dropzone"
                  role="button"
                  tabIndex={0}
                  onClick={() => dropzoneInputRef.current?.click()}
                  onKeyDown={(e) => e.key === 'Enter' && dropzoneInputRef.current?.click()}
                >
                  <Upload size={30} strokeWidth={1.8} color="#6d5dfc" />
                  <strong>Drop JD PDF / DOCX here</strong>
                  <span>or use “Import JD” to pre-fill role details and skills automatically.</span>
                  <input
                    ref={dropzoneInputRef}
                    type="file"
                    accept=".txt,text/plain"
                    className="hidden"
                    onChange={(e) => {
                      handleImportFile(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                </div>
              </div>

              <div className={`cj-step-panel ${step === 3 ? 'active' : ''}`} data-panel="3">
                <div className="cj-subsection">
                  <div className="cj-subsection-title">
                    <div>
                      <h3>Skills and Matching Weights</h3>
                      <p>
                        Separate mandatory skills from preference signals. This improves AI match
                        transparency.
                      </p>
                    </div>
                    <span className="cj-chip green">AI-assisted</span>
                  </div>
                  <div className="cj-form-grid">
                    <div className="cj-field full">
                      <label htmlFor="cj-must-have">Must-have Skills</label>
                      <textarea
                        id="cj-must-have"
                        placeholder="e.g., SQL, Excel, stakeholder reporting, data quality checks"
                        value={mustHaveText}
                        onChange={(e) => setMustHaveText(e.target.value)}
                        data-testid="skill-input"
                      />
                    </div>
                    <div className="cj-field full">
                      <label htmlFor="cj-good-have">Good-to-have Skills</label>
                      <textarea
                        id="cj-good-have"
                        placeholder="e.g., Power BI, Python, HR analytics, vendor coordination"
                        value={goodHaveText}
                        onChange={(e) => setGoodHaveText(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="cj-tag-cloud">
                    {SUGGESTED_SKILL_TAGS.map((tag) => (
                      <button
                        key={tag.label}
                        type="button"
                        className={`cj-skill-tag ${tag.tone}`.trim()}
                        onClick={() => addSuggestedSkill(tag.label)}
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>
                  <div className="cj-generate-jd-banner">
                    <div>
                      <strong>Generate Job Description</strong>
                      <span>
                        Use title, org placement, must-have, and good-to-have skills to draft a full JD with Mistral AI.
                      </span>
                    </div>
                    <button
                      type="button"
                      className="cj-btn primary"
                      onClick={() => handleGenerateJd({ jumpToSummary: true })}
                      disabled={generatingJd || loading || !mustHaveSkills.length || !title.trim()}
                      data-testid="generate-jd-from-skills-btn"
                    >
                      {generatingJd ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating JD…
                        </>
                      ) : (
                        <>
                          <Sparkles size={17} strokeWidth={2} />
                          Generate JD with Mistral
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="cj-subsection">
                  <div className="cj-subsection-title">
                    <div>
                      <h3>Default Scoring Emphasis</h3>
                      <p>
                        Recommended for analyst and manager hiring. Fine-tune later from Career Trajectory
                        Weights.
                      </p>
                    </div>
                  </div>
                  <div className="cj-inline-options">
                    {[
                      { value: 'balanced', title: 'Balanced', desc: 'Skills, experience, trajectory, and assessment.' },
                      { value: 'skills', title: 'Skills Heavy', desc: 'Prioritize technical proof and hands-on skills.' },
                      { value: 'trajectory', title: 'Trajectory Heavy', desc: 'Prioritize growth, stability, and manager fit.' },
                    ].map((opt) => (
                      <label key={opt.value} className="cj-option-card">
                        <input
                          type="radio"
                          name="scoring-emphasis"
                          checked={scoringEmphasis === opt.value}
                          onChange={() => setScoringEmphasis(opt.value)}
                        />
                        <strong>{opt.title}</strong>
                        <span>{opt.desc}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className={`cj-step-panel ${step === 4 ? 'active' : ''}`} data-panel="4">
                <div className="cj-subsection">
                  <div className="cj-subsection-title">
                    <div>
                      <h3>Review Requisition</h3>
                      <p>
                        Check the information before publishing. Missing required fields are highlighted by the
                        readiness panel.
                      </p>
                    </div>
                    <span className="cj-chip amber">Ready check</span>
                  </div>
                  <div className="cj-review-grid">
                    <div className="cj-review-box">
                      <small>Business Pillar</small>
                      <strong>{preview.pillar}</strong>
                    </div>
                    <div className="cj-review-box">
                      <small>Department</small>
                      <strong>{deptLabel || 'Not selected'}</strong>
                    </div>
                    <div className="cj-review-box">
                      <small>Sub-department</small>
                      <strong>{subDepartment || 'Not selected'}</strong>
                    </div>
                    <div className="cj-review-box">
                      <small>Project ID</small>
                      <strong>{projectId.trim() || 'Not added'}</strong>
                    </div>
                    <div className="cj-review-box">
                      <small>Job Title</small>
                      <strong>{title.trim() || 'Not added'}</strong>
                    </div>
                    <div className="cj-review-box">
                      <small>Experience</small>
                      <strong>{experienceRange.trim() || 'Not added'}</strong>
                    </div>
                  </div>
                </div>
                <div className="cj-tip-card">
                  <div className="cj-tip-icon" aria-hidden>
                    <Sparkles size={17} strokeWidth={2} />
                  </div>
                  <div>
                    <strong>Before publishing</strong>
                    <span>
                      Confirm department, role details, and skills. The system will create a candidate matching
                      workspace and assessment link after publish.
                    </span>
                  </div>
                </div>
              </div>

              <div className="cj-toolbar">
                <div className="cj-save-note">
                  <Check size={17} strokeWidth={2} />
                  <span>{formatSavedAgo(lastSavedAt)}</span>
                </div>
                <div className="cj-actions">
                  {step > 1 ? (
                    <button type="button" className="cj-btn ghost" onClick={goPrev} data-testid="prev-step-btn">
                      <ArrowLeft size={17} strokeWidth={2} />
                      Previous
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="cj-btn primary"
                    onClick={goNext}
                    disabled={loading || (step < 4 && !canGoNext)}
                    data-testid={step === 4 ? 'create-job-submit-btn' : 'next-step-btn'}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {isEdit ? 'Saving…' : analyzing ? 'AI Analyzing…' : 'Creating…'}
                      </>
                    ) : step === 4 ? (
                      isEdit ? 'Save Changes' : meta.next
                    ) : (
                      <>
                        {meta.next}
                        <ArrowRight size={17} strokeWidth={2} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <CreateJobCommandSidebar
            currentStep={step}
            readinessPct={readinessPct}
            preview={preview}
            isEdit={isEdit}
          />
        </div>
      </section>
    </div>
  );
}
