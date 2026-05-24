import React from 'react';
import { useNavigate } from 'react-router-dom';
import { pipelinePathForStage } from '../../lib/hiringDashboardDrill';
import { Badge } from '../ui/badge';
import ChartCard from './ChartCard';

const STAGE_ORDER = [
  'SOURCED',
  'SCREENING',
  'ASSESSMENT_SENT',
  'ASSESSMENT_CLEARED',
  'INTERVIEW_1',
  'INTERVIEW_2',
  'INTERVIEW_3',
  'HR_ROUND',
  'OFFER',
];

const STAGE_LABELS = {
  SOURCED: 'Sourced',
  SCREENING: 'Screening',
  ASSESSMENT_SENT: 'Assessment sent',
  ASSESSMENT_CLEARED: 'Assessment cleared',
  INTERVIEW_1: 'Interview 1',
  INTERVIEW_2: 'Interview 2',
  INTERVIEW_3: 'Interview 3',
  HR_ROUND: 'HR round',
  OFFER: 'Offer',
};

export default function PipelineSnapshotStrip({ pipelineByStage = {} }) {
  const navigate = useNavigate();
  const chips = STAGE_ORDER.map((stage) => ({
    stage,
    label: STAGE_LABELS[stage] || stage.replace(/_/g, ' '),
    count: pipelineByStage[stage] || 0,
  })).filter((c) => c.count > 0);

  return (
    <ChartCard title="Pipeline snapshot" testId="pipeline-snapshot-strip" empty={chips.length === 0} emptyMessage="No active pipeline">
      <div className="flex flex-wrap gap-2">
        {chips.map(({ stage, label, count }) => (
          <button
            key={stage}
            type="button"
            onClick={() => navigate(pipelinePathForStage(stage))}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
          >
            <span className="text-slate-700">{label}</span>
            <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
              {count}
            </Badge>
          </button>
        ))}
      </div>
    </ChartCard>
  );
}
