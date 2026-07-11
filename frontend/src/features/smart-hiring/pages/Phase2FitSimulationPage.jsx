import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Phase2FitPanel } from '@/features/smart-hiring/components/career-trajectory/Phase2FitPanel';
import { addCandidateToPhase2Session } from '@/features/smart-hiring/components/career-trajectory/Phase2CandidateSelect';
import Phase2FitCommandHero from '@/features/smart-hiring/components/career-trajectory/phase2/Phase2FitCommandHero';

export default function Phase2FitSimulationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const candidateId = searchParams.get('candidate_id') || '';
  const jobId = searchParams.get('job_id') || '';
  const trajectoryReportId = searchParams.get('trajectory_report_id') || '';
  const [runState, setRunState] = useState({
    onRun: () => {},
    loading: false,
    disabled: true,
  });

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
    <div
      className="hiring-dashboard-root top-operational"
      data-testid="phase2-fit-command-root"
    >
      <div data-testid="phase2-fit-page">
        <Phase2FitCommandHero
          onRun={runState.onRun}
          loading={runState.loading}
          disabled={runState.disabled}
        />
        <Phase2FitPanel
          commandStyle
          candidateId={candidateId}
          jobId={jobId || undefined}
          trajectoryReportId={trajectoryReportId || undefined}
          phase1Ready={Boolean(candidateId && trajectoryReportId)}
          lockToCandidate={Boolean(candidateId)}
          showCandidatePicker={!candidateId}
          onCandidateChange={onCandidateChange}
          onRunStateChange={setRunState}
        />
      </div>
    </div>
  );
}
