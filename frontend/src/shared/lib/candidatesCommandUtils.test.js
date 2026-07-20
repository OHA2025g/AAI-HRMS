import { describe, expect, it } from 'vitest';
import {
  estimateProfileReadinessScore,
  resolveCandidateFitScore,
  computeCommandMetrics,
} from './candidatesCommandUtils';

describe('resolveCandidateFitScore', () => {
  it('prefers application fit score', () => {
    const score = resolveCandidateFitScore(
      { id: 'c1' },
      { fit_score: { final_score: 88 } },
      null
    );
    expect(score).toBe(88);
  });

  it('uses candidate best_fit_score when no application score', () => {
    const score = resolveCandidateFitScore({ best_fit_score: 81 }, null, null);
    expect(score).toBe(81);
  });

  it('estimates profile readiness for talent pool rows without job scores', () => {
    const score = resolveCandidateFitScore(
      {
        email: 'vrushbhdoshi@gmail.com',
        total_experience_years: 4.1,
        skills: [
          { skill_name: 'Analytical Thinking' },
          { skill_name: 'Project Management' },
          { skill_name: 'Decision Making' },
        ],
      },
      null,
      null
    );
    expect(score).toBeGreaterThanOrEqual(58);
    expect(score).toBeLessThanOrEqual(92);
  });
});

describe('estimateProfileReadinessScore', () => {
  it('returns null for missing candidate', () => {
    expect(estimateProfileReadinessScore(null)).toBeNull();
  });
});

describe('computeCommandMetrics empty pool', () => {
  it('does not invent shortlist, analyzed, or duplicate percentages', () => {
    const metrics = computeCommandMetrics({
      totalCount: 0,
      candidates: [],
      applications: [],
      pack: null,
      trajSummaries: {},
    });
    expect(metrics.shortlistQuality).toBeNull();
    expect(metrics.profilesAnalyzedPct).toBeNull();
    expect(metrics.duplicateRiskPct).toBeNull();
    expect(metrics.recommendations).toEqual([]);
    expect(metrics.talentSegments).toEqual([]);
    expect(metrics.pipelineStages.every((s) => s.count === 0)).toBe(true);
  });
});
