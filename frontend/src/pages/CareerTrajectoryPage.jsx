import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { careerTrajectoryApi, candidatesApi, jobsApi } from '../lib/api';
import {
  getRetryableJobId,
  pollAnalyzeJob,
  retryAndPollAnalyzeJob,
} from '../lib/careerTrajectoryPoll';
import {
  ANALYSIS_STEPS,
  buildRadarData,
} from '../lib/careerTrajectoryCommandUtils';
import { candidateDisplayName, dedupeCandidatesForSelect } from '../lib/candidateListUtils';
import { addCandidateToPhase2Session } from '../components/career-trajectory/Phase2CandidateSelect';
import { ExplainabilityDrawer } from '../components/career-trajectory/ExplainabilityDrawer';
import CareerTrajectoryCommandHero from '../components/career-trajectory/command/CareerTrajectoryCommandHero';
import CareerTrajectoryOrgFilterBar from '../components/career-trajectory/command/CareerTrajectoryOrgFilterBar';
import CareerTrajectoryAnalyzePanel from '../components/career-trajectory/command/CareerTrajectoryAnalyzePanel';
import CareerTrajectoryReportHistory from '../components/career-trajectory/command/CareerTrajectoryReportHistory';
import CareerTrajectoryExecutiveSummary from '../components/career-trajectory/command/CareerTrajectoryExecutiveSummary';
import CareerTrajectoryMetricsGrid from '../components/career-trajectory/command/CareerTrajectoryMetricsGrid';
import CareerTrajectoryChartsRow from '../components/career-trajectory/command/CareerTrajectoryChartsRow';
import CareerTrajectorySignalsRow from '../components/career-trajectory/command/CareerTrajectorySignalsRow';
import CareerTrajectoryDecisionSection from '../components/career-trajectory/command/CareerTrajectoryDecisionSection';
import CareerTrajectoryExportsBar from '../components/career-trajectory/command/CareerTrajectoryExportsBar';
import CareerTrajectoryPhase2Section from '../components/career-trajectory/command/CareerTrajectoryPhase2Section';

function normalizeCandidatesForSelect(raw) {
  return dedupeCandidatesForSelect(raw)
    .map((c) => ({
      ...c,
      label: c.label || candidateDisplayName(c),
    }))
    .filter((c) => c.label.length > 1 && !/^\d+$/.test(c.label))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export default function CareerTrajectoryPage() {
  const [searchParams] = useSearchParams();
  const initialCandidate = searchParams.get('candidate_id') || '';
  const initialJob = searchParams.get('job_id') || '';

  const [candidates, setCandidates] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [candidateId, setCandidateId] = useState(initialCandidate);
  const [jobId] = useState(initialJob);
  const [resumeText, setResumeText] = useState('');
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [failedJob, setFailedJob] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const [report, setReport] = useState(null);
  const [reportHistory, setReportHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [explain, setExplain] = useState({ open: false, label: '', data: null });
  const analyzeSectionRef = useRef(null);

  const loadReportHistory = useCallback(async () => {
    if (!candidateId) {
      setReportHistory([]);
      return;
    }
    setHistoryLoading(true);
    try {
      const res = await careerTrajectoryApi.listReports({ candidate_id: candidateId, limit: 25 });
      setReportHistory(res.data?.items || []);
    } catch {
      toast.error('Failed to load report history');
    } finally {
      setHistoryLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    setCandidatesLoading(true);
    careerTrajectoryApi
      .listCandidateSelectOptions({ limit: 1000 })
      .then((res) => {
        const items = res.data?.items ?? [];
        setCandidates(normalizeCandidatesForSelect(items));
      })
      .catch(() => {
        candidatesApi
          .listPaged({ limit: 200 })
          .then((res) => {
            const raw = res.data?.items ?? (Array.isArray(res.data) ? res.data : []);
            setCandidates(normalizeCandidatesForSelect(raw));
          })
          .catch(() => {
            setCandidates([]);
          });
      })
      .finally(() => {
        setCandidatesLoading(false);
      });
  }, []);

  useEffect(() => {
    jobsApi
      .list({ status: 'OPEN' })
      .then((res) => setJobs(Array.isArray(res.data) ? res.data : []))
      .catch(() => setJobs([]));
  }, []);

  useEffect(() => {
    if (initialCandidate) {
      candidatesApi
        .get(initialCandidate)
        .then((res) => {
          if (res.data?.resume_text) setResumeText(res.data.resume_text);
        })
        .catch(() => {});
    }
  }, [initialCandidate]);

  useEffect(() => {
    loadReportHistory();
  }, [loadReportHistory]);

  useEffect(() => {
    if (!candidateId || !candidates.length) return;
    const known = candidates.some((c) => String(c.id) === String(candidateId));
    if (!known && !/^[0-9a-f-]{36}$/i.test(String(candidateId))) {
      setCandidateId('');
    }
  }, [candidates, candidateId]);

  const radarData = useMemo(() => buildRadarData(report?.scores), [report]);

  const handleRetryFailedJob = useCallback(async () => {
    if (!failedJob?.id) return;
    setRetrying(true);
    setLoading(true);
    setFailedJob(null);
    setStep(2);
    try {
      toast.info('Retrying analysis…');
      const reportData = await retryAndPollAnalyzeJob(failedJob.id);
      setReport(reportData);
      setStep(ANALYSIS_STEPS.length);
      if (candidateId) addCandidateToPhase2Session(candidateId);
      await loadReportHistory();
      toast.success('Career trajectory analysis complete');
    } catch (e) {
      const retryId = getRetryableJobId(e);
      if (retryId) {
        setFailedJob({ id: retryId, message: e.message });
      } else {
        toast.error(e.response?.data?.detail || e.message || 'Retry failed');
      }
      setStep(0);
    } finally {
      setRetrying(false);
      setLoading(false);
    }
  }, [failedJob, loadReportHistory, candidateId]);

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setFailedJob(null);
    setStep(1);
    try {
      const useBackground = true;
      let reportData = null;

      if (file) {
        const form = new FormData();
        if (candidateId) form.append('candidate_id', candidateId);
        if (jobId) form.append('job_id', jobId);
        if (resumeText.trim()) form.append('resume_text', resumeText.trim());
        form.append('file', file);
        if (useBackground) {
          setStep(2);
          const res = await careerTrajectoryApi.analyze(form, { background: true });
          const jobIdBg = res.data?.id;
          if (!jobIdBg) throw new Error('No analyze job id returned');
          toast.info('Analysis running in background…');
          reportData = await pollAnalyzeJob(jobIdBg);
        } else {
          for (let i = 2; i < ANALYSIS_STEPS.length; i++) {
            setStep(i);
            await new Promise((r) => setTimeout(r, 400));
          }
          const res = await careerTrajectoryApi.analyze(form);
          reportData = res.data;
        }
      } else if (resumeText.trim().length >= 50) {
        if (useBackground) {
          setStep(2);
          const res = await careerTrajectoryApi.analyzeText({
            candidate_id: candidateId || undefined,
            job_id: jobId || undefined,
            resume_text: resumeText.trim(),
            background: true,
          });
          const jobIdBg = res.status === 202 ? res.data?.id : null;
          if (jobIdBg) {
            toast.info('Analysis running in background…');
            reportData = await pollAnalyzeJob(jobIdBg);
          } else {
            reportData = res.data;
          }
        } else {
          for (let i = 2; i < ANALYSIS_STEPS.length; i++) {
            setStep(i);
            await new Promise((r) => setTimeout(r, 400));
          }
          const res = await careerTrajectoryApi.analyzeText({
            candidate_id: candidateId || undefined,
            job_id: jobId || undefined,
            resume_text: resumeText.trim(),
          });
          reportData = res.data;
        }
      } else {
        throw new Error('Add resume text (50+ characters) or upload a CV file');
      }

      for (let i = 2; i < ANALYSIS_STEPS.length; i++) {
        setStep(i);
        await new Promise((r) => setTimeout(r, 200));
      }
      setReport(reportData);
      setStep(ANALYSIS_STEPS.length);
      if (candidateId) addCandidateToPhase2Session(candidateId);
      await loadReportHistory();
      toast.success('Career trajectory analysis complete');
    } catch (e) {
      const retryId = getRetryableJobId(e);
      if (retryId) {
        setFailedJob({ id: retryId, message: e.message || 'Analysis failed' });
      } else {
        toast.error(e.response?.data?.detail || e.message || 'Analysis failed');
      }
      setStep(0);
    } finally {
      setLoading(false);
    }
  }, [candidateId, jobId, resumeText, file, loadReportHistory]);

  const onDropFile = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  };

  const downloadFitPack = async () => {
    if (!candidateId) {
      toast.error('Select a candidate for the combined fit pack');
      return;
    }
    try {
      const res = await careerTrajectoryApi.exportFitPack(candidateId, 'pdf');
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `candidate-fit-pack-${candidateId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Fit pack export failed');
    }
  };

  const downloadExport = async (format) => {
    if (!report?.id) return;
    try {
      const res = await careerTrajectoryApi.exportReport(report.id, format);
      const blob =
        format === 'pdf' || format === 'csv' || format === 'xlsx'
          ? res.data
          : new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `career-trajectory-${report.id}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Export failed');
    }
  };

  const openHistoryReport = async (reportId) => {
    try {
      const res = await careerTrajectoryApi.getReport(reportId);
      setReport(res.data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      toast.error('Could not load report');
    }
  };

  const deleteHistoryReport = async (reportId) => {
    try {
      await careerTrajectoryApi.deleteReport(reportId);
      if (report?.id === reportId) setReport(null);
      toast.success('Report deleted');
      await loadReportHistory();
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleNewAnalysis = () => {
    analyzeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    analyzeSectionRef.current?.querySelector('[data-testid="career-traj-candidate-select"]')?.focus?.();
  };

  const handleExplain = (label, data) => {
    setExplain({ open: true, label, data });
  };

  return (
    <div className="hiring-dashboard-root top-operational" data-testid="career-trajectory-command-root">
      <CareerTrajectoryCommandHero onNewAnalysis={handleNewAnalysis} />

      <CareerTrajectoryOrgFilterBar jobs={jobs} />

      <CareerTrajectoryAnalyzePanel
        sectionRef={analyzeSectionRef}
        candidates={candidates}
        candidatesLoading={candidatesLoading}
        candidateId={candidateId}
        onCandidateChange={setCandidateId}
        file={file}
        onFileChange={setFile}
        dragOver={dragOver}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDropFile={onDropFile}
        resumeText={resumeText}
        onResumeTextChange={setResumeText}
        loading={loading}
        step={step}
        onAnalyze={runAnalysis}
        failedJob={failedJob}
        onRetryFailedJob={handleRetryFailedJob}
        onDismissFailedJob={() => setFailedJob(null)}
        retrying={retrying}
      />

      {candidateId ? (
        <CareerTrajectoryReportHistory
          rows={reportHistory}
          loading={historyLoading}
          onView={openHistoryReport}
          onDelete={deleteHistoryReport}
        />
      ) : null}

      {report ? (
        <>
          <CareerTrajectoryExecutiveSummary report={report} />
          <CareerTrajectoryMetricsGrid scores={report.scores} onExplain={handleExplain} />
          <CareerTrajectoryChartsRow radarData={radarData} timeline={report.career_timeline} />
          <CareerTrajectorySignalsRow strengths={report.strengths} risks={report.risks} />
          <CareerTrajectoryDecisionSection
            decisionGate={report.decision_gate}
            missingEvidence={report.missing_evidence}
            interviewProbes={report.recommended_interview_probes}
          />
          <CareerTrajectoryExportsBar
            reportId={report.id}
            candidateId={candidateId}
            jobId={jobId || report.job_id}
            onExport={downloadExport}
            onFitPack={downloadFitPack}
            onReAnalyze={runAnalysis}
          />
        </>
      ) : null}

      {report && candidateId ? (
        <CareerTrajectoryPhase2Section
          candidateId={candidateId}
          trajectoryReportId={report.id}
          jobId={jobId || report.job_id}
          phase1Ready
          lockToCandidate={Boolean(initialCandidate)}
          candidateDisplayName={candidates.find((c) => c.id === candidateId)?.full_name}
          showCandidatePicker={!initialCandidate}
          onCandidateChange={({ candidate_id, report_id }) => {
            if (!candidate_id) return;
            setCandidateId(candidate_id);
            addCandidateToPhase2Session(candidate_id);
            if (report_id) {
              careerTrajectoryApi
                .getReport(report_id)
                .then((res) => setReport(res.data))
                .catch(() => toast.error('Could not load trajectory report'));
            }
          }}
        />
      ) : null}

      <ExplainabilityDrawer
        open={explain.open}
        onOpenChange={(open) => setExplain((e) => ({ ...e, open }))}
        label={explain.label}
        scoreData={explain.data}
      />
    </div>
  );
}
