import { describe, expect, it } from 'vitest';
import { chartTitleCase } from './chartTitleCase';

describe('chartTitleCase', () => {
  it('capitalizes major words in chart titles', () => {
    expect(chartTitleCase('hiring funnel')).toBe('Hiring Funnel');
    expect(chartTitleCase('time to fill trend')).toBe('Time to Fill Trend');
    expect(chartTitleCase('candidate source mix')).toBe('Candidate Source Mix');
  });

  it('keeps small words lowercase in the middle', () => {
    expect(chartTitleCase('average fit by source')).toBe('Average Fit by Source');
    expect(chartTitleCase('time in stage heatmap')).toBe('Time in Stage Heatmap');
  });

  it('handles hyphenated numbers and preserves arrows', () => {
    expect(chartTitleCase('6-month hiring trend')).toBe('6-Month Hiring Trend');
    expect(chartTitleCase('assessment → interview & hire')).toBe('Assessment → Interview & Hire');
  });

  it('normalizes ageing to Aging in titles', () => {
    expect(chartTitleCase('requisition ageing')).toBe('Requisition Aging');
    expect(chartTitleCase('offer ageing')).toBe('Offer Aging');
    expect(chartTitleCase('Ageing by invite date')).toBe('Aging by Invite Date');
  });

  it('returns non-strings unchanged', () => {
    expect(chartTitleCase(null)).toBe(null);
    expect(chartTitleCase(undefined)).toBe(undefined);
  });
});
