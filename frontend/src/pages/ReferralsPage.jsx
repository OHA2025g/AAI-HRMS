import React, { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { referralsApi, jobsApi } from '../lib/api';
import { usePlacementFilters } from '../context/PlacementFiltersContext';
import { BUSINESS_ORG_PILLARS, getDepartmentsForPillar } from '../data/businessOrgHierarchy';
import { useAuth } from '../context/AuthContext';
import { useHiringPermissions } from '../hooks/useHiringPermissions';
import ReferralsCommandHero from '../components/referrals/ReferralsCommandHero';
import ReferralsOrgFilterBar from '../components/referrals/ReferralsOrgFilterBar';
import ReferralsProgramBanner from '../components/referrals/ReferralsProgramBanner';
import ReferralsKpiStrip from '../components/referrals/ReferralsKpiStrip';
import ReferralsPipelinePanel from '../components/referrals/ReferralsPipelinePanel';
import ReferralsSideStack from '../components/referrals/ReferralsSideStack';
import ReferralsLeaderboard from '../components/referrals/ReferralsLeaderboard';
import ReferralSubmitModal from '../components/referrals/ReferralSubmitModal';
import {
  buildLeaderboardRows,
  computeQualitySignals,
  computeReferralKpis,
  filterReferralsByPlacement,
} from '../lib/referralsCommandUtils';

const EMPTY_FORM = {
  job_id: '',
  candidate_name: '',
  candidate_email: '',
  candidate_phone: '',
  resume_text: '',
  note: '',
};

export default function ReferralsPage() {
  const { user } = useAuth();
  const perms = useHiringPermissions(user);
  const placement = usePlacementFilters();
  const canRefer = perms.canReferCandidate;

  const [referrals, setReferrals] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [referralsRes, jobsRes] = await Promise.all([referralsApi.list(), jobsApi.list({ status: 'OPEN' })]);
      setReferrals(referralsRes.data || []);
      setJobs(jobsRes.data || []);
    } catch {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const pillarLabel = BUSINESS_ORG_PILLARS.find((p) => p.id === placement.pillarId)?.label || '';
  const deptLabel =
    placement.pillarId && placement.departmentId
      ? getDepartmentsForPillar(placement.pillarId).find((d) => d.id === placement.departmentId)?.label || ''
      : '';

  const filteredJobs = useMemo(
    () =>
      (jobs || []).filter((j) => {
        if (pillarLabel && (j?.business_pillar || '') !== pillarLabel) return false;
        if (deptLabel && (j?.business_department || '') !== deptLabel) return false;
        if (placement.subDepartment && (j?.business_sub_department || '') !== placement.subDepartment) return false;
        if (placement.projectId && (j?.project_id || '') !== placement.projectId) return false;
        return true;
      }),
    [jobs, pillarLabel, deptLabel, placement.subDepartment, placement.projectId]
  );

  const visibleReferrals = useMemo(
    () => filterReferralsByPlacement(referrals, jobs, placement),
    [referrals, jobs, placement]
  );

  const kpis = useMemo(() => computeReferralKpis(visibleReferrals), [visibleReferrals]);
  const qualitySignals = useMemo(() => computeQualitySignals(visibleReferrals), [visibleReferrals]);
  const leaderboardRows = useMemo(() => buildLeaderboardRows(visibleReferrals), [visibleReferrals]);

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setResumeFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let res;
      if (resumeFile) {
        const fd = new FormData();
        fd.append('job_id', formData.job_id);
        fd.append('candidate_name', formData.candidate_name);
        if (formData.candidate_email?.trim()) fd.append('candidate_email', formData.candidate_email.trim());
        if (formData.candidate_phone?.trim()) fd.append('candidate_phone', formData.candidate_phone.trim());
        if (formData.note?.trim()) fd.append('note', formData.note.trim());
        if (formData.resume_text?.trim()) fd.append('resume_text_extra', formData.resume_text.trim());
        fd.append('resume_file', resumeFile);
        res = await referralsApi.createWithResume(fd);
      } else {
        res = await referralsApi.create(formData);
      }
      const fs = res.data?.fit_score;
      const fitMsg =
        fs && fs.final_score != null ? ` Job fit score: ${Math.round(Number(fs.final_score))}%.` : '';
      toast.success(`Referral submitted.${fitMsg}`);
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit referral');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="hiring-dashboard-root top-operational" data-testid="referrals-command-root">
      {!canRefer ? (
        <div className="rf-readonly" role="status">
          Your role cannot submit referrals. Ask TA or a Hiring Manager to refer candidates.
        </div>
      ) : null}

      <ReferralsCommandHero canRefer={canRefer} onSubmitClick={() => setShowModal(true)} />
      <ReferralsOrgFilterBar jobs={jobs} />
      <ReferralsProgramBanner />
      <ReferralsKpiStrip kpis={kpis} />

      <section className="rf-grid">
        <ReferralsPipelinePanel
          referrals={visibleReferrals}
          jobs={jobs}
          canRefer={canRefer}
          onSubmitClick={() => setShowModal(true)}
        />
        <ReferralsSideStack qualitySignals={qualitySignals} />
      </section>

      <ReferralsLeaderboard rows={leaderboardRows} />

      {canRefer ? (
        <ReferralSubmitModal
          open={showModal}
          onOpenChange={setShowModal}
          formData={formData}
          setFormData={setFormData}
          filteredJobs={filteredJobs}
          resumeFile={resumeFile}
          setResumeFile={setResumeFile}
          submitting={submitting}
          onSubmit={handleSubmit}
          onReset={resetForm}
        />
      ) : null}
    </div>
  );
}
