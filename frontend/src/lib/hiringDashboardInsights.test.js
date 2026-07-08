import { describe, expect, it } from 'vitest';
import { buildAllAiInsightsFromPack, alertToInsight } from './hiringDashboardInsights';

describe('hiringDashboardInsights', () => {
  it('maps alert severity to insight colors', () => {
    expect(alertToInsight({ severity: 'critical', title: 'A', message: 'B' }).severity).toBe('red');
    expect(alertToInsight({ severity: 'warning', title: 'A', message: 'B' }).severity).toBe('orange');
    expect(alertToInsight({ severity: 'info', title: 'A', message: 'B' }).severity).toBe('blue');
  });

  it('builds full insight list from alerts with monitoring tip', () => {
    const insights = buildAllAiInsightsFromPack({
      alerts: [
        { severity: 'warning', title: 'Jobs without pipeline activity', message: '86 open jobs', action_path: '/jobs' },
        { severity: 'warning', title: 'Jobs without AI matches', message: 'Run Find Matches', action_path: '/jobs' },
      ],
    });

    expect(insights).toHaveLength(3);
    expect(insights[2].title).toBe('Continue monitoring hiring health');
    expect(insights[2].severity).toBe('green');
  });

  it('falls back to ai_insights when alerts are empty', () => {
    const insights = buildAllAiInsightsFromPack({
      ai_insights: [{ severity: 'blue', title: 'Only insight', message: 'msg' }],
      alerts: [],
    });

    expect(insights).toHaveLength(1);
    expect(insights[0].title).toBe('Only insight');
  });
});
