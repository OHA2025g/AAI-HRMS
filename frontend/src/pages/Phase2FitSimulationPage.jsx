import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import { Phase2FitPanel } from '../components/career-trajectory/Phase2FitPanel';
import { addCandidateToPhase2Session } from '../components/career-trajectory/Phase2CandidateSelect';
import { Button } from '../components/ui/button';

export default function Phase2FitSimulationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const candidateId = searchParams.get('candidate_id') || '';
  const jobId = searchParams.get('job_id') || '';
  const trajectoryReportId = searchParams.get('trajectory_report_id') || '';

  const onCandidateChange = ({ candidate_id, report_id, job_id, phase1Ready }) => {
    if (!candidate_id) {
      setSearchParams({}, { replace: true });
      return;
    }
    if (phase1Ready) addCandidateToPhase2Session(candidate_id);
    const next = { candidate_id, trajectory_report_id: report_id || '' };
    if (job_id) next.job_id = job_id;
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-6 pb-12" data-testid="phase2-fit-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2" style={{ fontFamily: 'Outfit' }}>
          <Users className="h-7 w-7 text-indigo-600" />
          Contextual fit simulation (Phase 2)
        </h1>
        <p className="text-slate-600 mt-1">
          Leadership style, communication, and manager-fit analysis built on Phase 1 career trajectory.
        </p>
        <Button variant="link" className="px-0 h-auto text-indigo-600" asChild>
          <Link to="/ai-hiring/candidate-fit/career-trajectory">Back to Phase 1 analyzer</Link>
        </Button>
      </div>

      <Phase2FitPanel
        candidateId={candidateId}
        jobId={jobId || undefined}
        trajectoryReportId={trajectoryReportId || undefined}
        phase1Ready={Boolean(candidateId && trajectoryReportId)}
        lockToCandidate={Boolean(candidateId)}
        showCandidatePicker={!candidateId}
        onCandidateChange={onCandidateChange}
      />
    </div>
  );
}
