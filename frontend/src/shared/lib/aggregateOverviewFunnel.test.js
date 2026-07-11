import { describe, expect, it } from 'vitest';
import { aggregateOverviewFunnel } from './aggregateOverviewFunnel';

describe('aggregateOverviewFunnel', () => {
  it('aggregates pipeline stages into six overview buckets', () => {
    const rows = aggregateOverviewFunnel([
      { stage: 'SOURCED', label: 'Sourced', count: 496 },
      { stage: 'SCREENING', label: 'Screening', count: 0 },
      { stage: 'ASSESSMENT_SENT', label: 'Assessment Sent', count: 24 },
      { stage: 'ASSESSMENT_CLEARED', label: 'Assessment Cleared', count: 8 },
      { stage: 'INTERVIEW_1', label: 'Interview 1', count: 1 },
      { stage: 'INTERVIEW_2', label: 'Interview 2', count: 0 },
      { stage: 'INTERVIEW_3', label: 'Interview 3', count: 0 },
      { stage: 'HR_ROUND', label: 'Hr Round', count: 0 },
      { stage: 'OFFER', label: 'Offer', count: 0 },
      { stage: 'JOINED', label: 'Joined', count: 0 },
    ]);

    expect(rows).toEqual([
      { key: 'applications', label: 'Applications', stage: 'SOURCED', count: 496 },
      { key: 'screened', label: 'Screened', stage: 'SCREENING', count: 0 },
      { key: 'assessment', label: 'Assessment', stage: 'ASSESSMENT_SENT', count: 32 },
      { key: 'interview', label: 'Interview', stage: 'INTERVIEW_1', count: 1 },
      { key: 'offer', label: 'Offer', stage: 'OFFER', count: 0 },
      { key: 'joined', label: 'Joined', stage: 'JOINED', count: 0 },
    ]);
  });

  it('preserves already aggregated mock rows', () => {
    const rows = aggregateOverviewFunnel([
      { stage: 'APPLICATIONS', label: 'Applications', count: 1455 },
      { stage: 'SCREENED', label: 'Screened', count: 812 },
      { stage: 'ASSESSMENT', label: 'Assessment', count: 465 },
      { stage: 'INTERVIEW', label: 'Interview', count: 112 },
      { stage: 'OFFER', label: 'Offer', count: 21 },
      { stage: 'JOINED', label: 'Joined', count: 8 },
    ]);

    expect(rows.map((row) => row.count)).toEqual([1455, 812, 465, 112, 21, 8]);
  });
});
