import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, Sparkles, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts';
import { careerTrajectoryApi, candidatesApi } from '../lib/api';
import {
  getRetryableJobId,
  isRetryableAnalyzeError,
  pollAnalyzeJob,
  retryAndPollAnalyzeJob,
} from '../lib/careerTrajectoryPoll';
import { CareerTrajectoryJobErrorBanner } from '../components/career-trajectory/CareerTrajectoryJobErrorBanner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { TrajectoryScoreCard } from '../components/career-trajectory/TrajectoryScoreCard';
import { CareerTimeline } from '../components/career-trajectory/CareerTimeline';
import { MissingEvidencePanel } from '../components/career-trajectory/MissingEvidencePanel';
import { ExplainabilityDrawer } from '../components/career-trajectory/ExplainabilityDrawer';
import { Phase2FitPanel } from '../components/career-trajectory/Phase2FitPanel';
import { addCandidateToPhase2Session } from '../components/career-trajectory/Phase2CandidateSelect';
import { Badge } from '../components/ui/badge';

const SCORE_KEYS = [
  ['career_progression', 'Career Progression'],
  ['tenure_stability', 'Tenure Stability'],
  ['scope_expansion', 'Scope Expansion'],
  ['project_complexity', 'Project Complexity'],
  ['business_impact', 'Business Impact'],
  ['skill_evolution', 'Skill Evolution'],
  ['leadership_maturity', 'Leadership Maturity'],
  ['adaptability', 'Adaptability'],
  ['future_role_readiness', 'Future Role Readiness'],
];

const STEPS = ['Upload CV', 'Parse & extract', 'Feature engineering', 'Score trajectory', 'Generate report'];

export default function CareerTrajectoryPage() {
  const [searchParams] = useSearchParams();
  const initialCandidate = searchParams.get('candidate_id') || '';
  const initialJob = searchParams.get('job_id') || '';

  const [candidates, setCandidates] = useState([]);
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
  const cvFileInputRef = useRef(null);

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
    candidatesApi.listPaged({ limit: 100 }).then((res) => {
      setCandidates(res.data?.items || res.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (initialCandidate) {
      candidatesApi.get(initialCandidate).then((res) => {
        if (res.data?.resume_text) setResumeText(res.data.resume_text);
      }).catch(() => {});
    }
  }, [initialCandidate]);

  useEffect(() => {
    loadReportHistory();
  }, [loadReportHistory]);

  const radarData = useMemo(() => {
    if (!report?.scores) return [];
    return SCORE_KEYS.map(([key, label]) => ({
      subject: label.split(' ')[0],
      score: report.scores[key]?.score ?? 0,
    }));
  }, [report]);

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
      setStep(STEPS.length);
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
  }, [failedJob, loadReportHistory]);

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
          for (let i = 2; i < STEPS.length; i++) {
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
          for (let i = 2; i < STEPS.length; i++) {
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

      for (let i = 2; i < STEPS.length; i++) {
        setStep(i);
        await new Promise((r) => setTimeout(r, 200));
      }
      setReport(reportData);
      setStep(STEPS.length);
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

  return (
    <div className="space-y-6 pb-12" data-testid="career-trajectory-page">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2" style={{ fontFamily: 'Outfit' }}>
          <Sparkles className="h-7 w-7 text-indigo-600" />
          Candidate Fit Simulation Agent
        </h1>
        <p className="text-slate-600 mt-1">Career Trajectory Analysis from CV — growth, maturity, complexity, and readiness signals.</p>
        <Button variant="link" className="px-0 h-auto text-indigo-600" asChild>
          <Link to="/ai-hiring/candidate-fit/career-trajectory/compare">Compare multiple candidates</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Analyze resume</CardTitle>
          <CardDescription>Select a candidate, upload PDF/DOCX/TXT, or paste resume text.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-slate-600 mb-1">Candidate (optional)</p>
              <Select value={candidateId || '__none__'} onValueChange={(v) => setCandidateId(v === '__none__' ? '' : v)}>
                <SelectTrigger data-testid="career-traj-candidate-select">
                  <SelectValue placeholder="Select candidate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None — text/upload only</SelectItem>
                  {candidates.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name || c.email || c.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-600 mb-1">Upload CV</p>
              <div
                data-testid="career-traj-dropzone"
                role="button"
                tabIndex={0}
                onClick={() => cvFileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    cvFileInputRef.current?.click();
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDropFile}
                className={`border-2 border-dashed rounded-lg p-4 text-center text-sm transition-colors cursor-pointer ${
                  dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-slate-50/50 hover:border-indigo-300'
                }`}
              >
                {file ? (
                  <p className="text-slate-700">{file.name}</p>
                ) : (
                  <p className="text-slate-500">Drag & drop PDF, DOCX, or TXT — or click to choose a file</p>
                )}
                <input
                  ref={cvFileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  className="sr-only"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>
          </div>
          <Textarea
            placeholder="Paste resume text (min 50 characters)..."
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            rows={6}
            data-testid="career-traj-resume-text"
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={runAnalysis} disabled={loading} data-testid="career-traj-analyze-btn">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Analyze career trajectory
            </Button>
            {candidateId ? (
              <Button variant="outline" asChild>
                <Link to={`/candidates/${candidateId}`}>View candidate profile</Link>
              </Button>
            ) : null}
          </div>
          {loading ? (
            <p className="text-sm text-indigo-600" data-testid="career-traj-bg-status">
              Running analysis in background…
            </p>
          ) : null}
          {failedJob ? (
            <CareerTrajectoryJobErrorBanner
              message={failedJob.message}
              onRetry={handleRetryFailedJob}
              onDismiss={() => setFailedJob(null)}
              retrying={retrying}
            />
          ) : null}
          {loading || step > 0 ? (
            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
              {STEPS.map((s, i) => (
                <Badge key={s} variant={i <= step ? 'default' : 'outline'}>
                  {s}
                </Badge>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {candidateId ? (
        <Card data-testid="career-traj-report-history">
          <CardHeader>
            <CardTitle className="text-lg">Report history</CardTitle>
            <CardDescription>Past trajectory analyses for this candidate.</CardDescription>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              </div>
            ) : reportHistory.length === 0 ? (
              <p className="text-sm text-slate-500">No reports yet. Run an analysis above.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-600">
                      <th className="py-2 pr-3">Created</th>
                      <th className="py-2 px-2">Overall</th>
                      <th className="py-2 px-2">Archetype</th>
                      <th className="py-2 px-2">Decision gate</th>
                      <th className="py-2 pl-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportHistory.map((row) => (
                      <tr key={row.id} className="border-b border-slate-100">
                        <td className="py-2 pr-3 text-slate-700">
                          {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
                        </td>
                        <td className="py-2 px-2 font-semibold text-indigo-800">
                          {row.scores?.overall_career_trajectory?.score != null
                            ? `${Math.round(row.scores.overall_career_trajectory.score)}%`
                            : '—'}
                        </td>
                        <td className="py-2 px-2 text-xs">{row.primary_archetype?.name || '—'}</td>
                        <td className="py-2 px-2 text-xs max-w-[160px] truncate">
                          {(row.decision_gate?.category || '—').split(':')[0]}
                        </td>
                        <td className="py-2 pl-2 text-right whitespace-nowrap">
                          <Button type="button" variant="ghost" size="sm" onClick={() => openHistoryReport(row.id)}>
                            View
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-rose-600"
                            onClick={() => deleteHistoryReport(row.id)}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {report ? (
        <>
          <Card className="border-indigo-100 bg-indigo-50/30" data-testid="career-traj-executive-summary">
            <CardHeader>
              <CardTitle>Executive summary</CardTitle>
              <CardDescription>{report.career_pattern}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-800">{report.executive_summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge className="bg-indigo-600">{report.primary_archetype?.name}</Badge>
                {report.secondary_archetype?.name ? (
                  <Badge variant="outline">{report.secondary_archetype.name}</Badge>
                ) : null}
                <Badge variant="secondary">{report.decision_gate?.category}</Badge>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {SCORE_KEYS.map(([key, label]) => (
              <TrajectoryScoreCard
                key={key}
                label={label}
                scoreData={report.scores?.[key]}
                onExplain={() =>
                  setExplain({ open: true, label, data: report.scores?.[key] })
                }
              />
            ))}
            <TrajectoryScoreCard
              label="Retention Risk"
              scoreData={report.scores?.retention_risk}
              highlightRisk
            />
            <TrajectoryScoreCard label="Overall Trajectory" scoreData={report.scores?.overall_career_trajectory} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Trajectory radar</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                    <Radar dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Career timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <CareerTimeline timeline={report.career_timeline} />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-lg">Strength signals</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(report.strengths || []).map((s, i) => (
                  <div key={i} className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
                    <p className="font-medium text-slate-900">{s.title}</p>
                    <p className="text-sm text-slate-600">{s.evidence}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">Risk signals</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(report.risks || []).map((r, i) => (
                  <div key={i} className="rounded-lg border border-amber-100 bg-amber-50/50 p-3">
                    <p className="font-medium text-slate-900">{r.title} · {r.severity}</p>
                    <p className="text-sm text-slate-600">{r.evidence}</p>
                    <p className="text-xs text-indigo-700 mt-1">{r.recommended_validation}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-lg">Decision gate</CardTitle></CardHeader>
            <CardContent>
              <p className="font-semibold text-indigo-800">{report.decision_gate?.category}</p>
              <p className="text-sm text-slate-600 mt-2">{report.decision_gate?.reason}</p>
              <p className="text-sm text-slate-800 mt-2">{report.decision_gate?.recommended_next_step}</p>
            </CardContent>
          </Card>

          <MissingEvidencePanel items={report.missing_evidence} />

          {report.fairness_validation ? (
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Fairness validation</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-700">
                Status: <Badge variant={report.fairness_validation.status === 'Passed' ? 'default' : 'secondary'}>
                  {report.fairness_validation.status}
                </Badge>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader><CardTitle className="text-lg">Interview probes</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(report.recommended_interview_probes || []).map((p, i) => (
                <div key={i} className="text-sm border-b border-slate-100 pb-2">
                  <span className="font-medium text-slate-700">{p.area}: </span>
                  {p.question}
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => downloadExport('json')} data-testid="career-traj-export-json">
              Export JSON
            </Button>
            <Button variant="outline" onClick={() => downloadExport('pdf')} data-testid="career-traj-export-pdf">
              Export PDF
            </Button>
            <Button variant="outline" onClick={() => downloadExport('csv')} data-testid="career-traj-export-csv">
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => downloadExport('xlsx')}>
              Export XLSX
            </Button>
            {candidateId ? (
              <Button
                variant="outline"
                onClick={downloadFitPack}
                data-testid="career-traj-export-fit-pack"
              >
                Export fit pack (P1+P2)
              </Button>
            ) : null}
            {candidateId ? (
              <Button variant="outline" asChild>
                <Link
                  to={`/ai-hiring/candidate-fit/phase2?candidate_id=${candidateId}&trajectory_report_id=${report.id}${jobId ? `&job_id=${jobId}` : ''}`}
                >
                  Phase 2 fit
                </Link>
              </Button>
            ) : null}
            {candidateId ? (
              <Button variant="outline" onClick={() => runAnalysis()}>Re-analyze</Button>
            ) : null}
          </div>
        </>
      ) : null}

      {report && candidateId ? (
        <Phase2FitPanel
          candidateId={candidateId}
          trajectoryReportId={report.id}
          jobId={jobId || report.job_id}
          phase1Ready
          lockToCandidate={Boolean(initialCandidate)}
          candidateDisplayName={
            candidates.find((c) => c.id === candidateId)?.full_name
          }
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
