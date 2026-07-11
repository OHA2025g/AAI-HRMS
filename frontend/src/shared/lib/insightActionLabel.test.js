import { describe, expect, it } from 'vitest';
import { shortenInsightActionLabel } from './insightActionLabel';

describe('shortenInsightActionLabel', () => {
  it('keeps labels with three or fewer words', () => {
    expect(shortenInsightActionLabel('Take Action')).toBe('Take Action');
    expect(shortenInsightActionLabel('View Details')).toBe('View Details');
  });

  it('truncates longer labels to three words', () => {
    expect(shortenInsightActionLabel('Review and Advance Stuck Candidates')).toBe(
      'Review and Advance'
    );
    expect(shortenInsightActionLabel('Run Sourcing Campaigns for Empty Jobs')).toBe(
      'Run Sourcing Campaigns'
    );
  });
});
