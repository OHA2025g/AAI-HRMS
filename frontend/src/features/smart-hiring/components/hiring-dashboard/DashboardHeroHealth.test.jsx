import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardHeroHealth from './DashboardHeroHealth';

describe('DashboardHeroHealth', () => {
  it('renders score and risk metrics', () => {
    render(
      <MemoryRouter>
        <DashboardHeroHealth
          score={57}
          status="watch"
          asOf="2026-06-12T12:30:00Z"
          heroRisk={{ reqs_at_risk: 12, jobs_miss_sla: 4, high_fit_awaiting_review: 78 }}
          aiRecommendation={{
            title: 'Increase recruiter capacity',
            message: 'Engineering bottleneck',
            impact_days: 14,
            action_path: '/pipeline',
          }}
        />
      </MemoryRouter>
    );
    expect(screen.getByTestId('dashboard-hero-health')).toBeInTheDocument();
    expect(screen.getByText('57')).toBeInTheDocument();
    expect(screen.getByText('Increase recruiter capacity')).toBeInTheDocument();
  });

  it('shows LLM badge when insights source is llm', () => {
    render(
      <MemoryRouter>
        <DashboardHeroHealth
          score={57}
          status="watch"
          aiRecommendation={{ title: 'LLM rec', message: 'Generated', action_path: '/pipeline' }}
          aiInsightsSource="llm"
        />
      </MemoryRouter>
    );
    expect(screen.getByTestId('dashboard-llm-insights-badge')).toHaveTextContent('LLM insights');
  });
});
