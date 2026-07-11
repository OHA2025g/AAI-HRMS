import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OverviewTabContent from './tabs/OverviewTabContent';
import PipelineTabContent from './tabs/PipelineTabContent';
import OffersTabContent from './tabs/OffersTabContent';
import InterviewsTabContent from './tabs/InterviewsTabContent';
import SignalsTabContent from './tabs/SignalsTabContent';
import AnalyticsTabContent from './tabs/AnalyticsTabContent';
import { mockHiringPack, mockTrendPoints } from './fixtures/hiringPackFixture';

function renderTab(Component, extraProps = {}) {
  return render(
    <MemoryRouter>
      <Component pack={mockHiringPack} {...extraProps} />
    </MemoryRouter>
  );
}

describe('Dashboard tab sections', () => {
  it('renders Overview with velocity and TTF charts', () => {
    renderTab(OverviewTabContent, { trends: { points: mockTrendPoints } });
    expect(screen.getByTestId('dash-overview')).toBeInTheDocument();
    expect(screen.getByTestId('hiring-velocity-chart')).toBeInTheDocument();
    expect(screen.getByTestId('time-to-fill-trend-chart')).toBeInTheDocument();
    expect(screen.getByText('Hiring Velocity')).toBeInTheDocument();
  });

  it('shows four insight cards on Overview', () => {
    renderTab(OverviewTabContent, { trends: { points: mockTrendPoints } });
    expect(screen.getAllByRole('button', { name: /View Details|Take Action|Review Candidates|View Trend/i }).length).toBeGreaterThan(0);
  });

  it('opens all insights modal from View all insights', () => {
    renderTab(OverviewTabContent, { trends: { points: mockTrendPoints } });
    fireEvent.click(screen.getByTestId('view-all-insights'));
    expect(screen.getByTestId('ai-insights-modal')).toBeInTheDocument();
    expect(screen.getByText('Stuck assessment')).toBeInTheDocument();
    expect(screen.getByText('Continue monitoring hiring health')).toBeInTheDocument();
  });

  it('uses exact mock layout classes on Overview', () => {
    const { container } = renderTab(OverviewTabContent, { trends: { points: mockTrendPoints } });
    expect(container.querySelector('.kpis')).toBeTruthy();
    expect(container.querySelector('.insights')).toBeTruthy();
    expect(container.querySelector('.grid3')).toBeTruthy();
    expect(container.querySelector('.grid3b')).toBeTruthy();
    expect(container.querySelector('.bottom')).toBeTruthy();
    expect(container.querySelector('.funnel-shape')).toBeTruthy();
    expect(container.querySelector('.funnel-list')).toBeTruthy();
    expect(container.querySelector('[data-testid="department-risk-card"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="department-risk-rows"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="hiring-velocity-chart"] .recharts-responsive-container')).toBeTruthy();
  });

  it('renders Pipeline tab', () => {
    renderTab(PipelineTabContent);
    expect(screen.getByTestId('dash-funnel')).toBeInTheDocument();
  });

  it('renders Offers tab', () => {
    const { container } = renderTab(OffersTabContent);
    expect(screen.getByTestId('dash-offers')).toBeInTheDocument();
    expect(container.querySelector('.offers-hero')).toBeTruthy();
    expect(container.querySelector('[data-testid="offers-command-center"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="offers-lifecycle"]')).toBeTruthy();
    expect(container.querySelector('.offers-lifecycle-timeline')).toBeTruthy();
    expect(container.querySelector('[data-testid="offers-ai-insight"]')).toBeTruthy();
    expect(container.querySelector('.offers-insight-cta')).toBeTruthy();
    expect(container.querySelector('.offers-funnel-card')).toBeTruthy();
    expect(container.querySelector('.offers-priority-card')).toBeTruthy();
    expect(container.querySelector('.offers-aging-card')).toBeTruthy();
    expect(container.querySelector('.offers-bottom-insights')).toBeTruthy();
  });

  it('renders Interviews tab', () => {
    const { container } = renderTab(InterviewsTabContent);
    expect(screen.getByTestId('dash-interviews')).toBeInTheDocument();
    expect(screen.getByTestId('interviews-kpi-row')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-testid="interviews-kpi-row"] .card.kpi')).toHaveLength(4);
    expect(screen.getByTestId('interviews-grid-row')).toBeInTheDocument();
    expect(screen.getByTestId('interview-rounds-panel')).toBeInTheDocument();
    expect(screen.getByTestId('conversion-bottleneck-chart')).toBeInTheDocument();
    expect(container.querySelector('.interviews-rounds-table')).toBeTruthy();
    expect(container.querySelector('.interviews-bottleneck-bars')).toBeTruthy();
    expect(screen.getByTestId('interviews-insights-row')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-testid="interviews-insights-row"] .insight')).toHaveLength(1);
    expect(screen.getByText('High risk')).toBeInTheDocument();
    expect(screen.getByTestId('interviews-bottom-row')).toBeInTheDocument();
    expect(screen.getByTestId('interview-journeys-panel')).toBeInTheDocument();
    expect(screen.getByTestId('interview-action-queue')).toBeInTheDocument();
    expect(screen.getByText('Recent interview journeys')).toBeInTheDocument();
    expect(screen.getByText('AI action queue')).toBeInTheDocument();
    expect(screen.getByText('Clear Interview 1 decisions')).toBeInTheDocument();
    expect(screen.getByText('Schedule Interviews')).toBeInTheDocument();
    expect(screen.getByText('2 actions')).toBeInTheDocument();
    expect(screen.getByText('Aarav Sharma')).toBeInTheDocument();
    expect(screen.getByText('Kabir Khan')).toBeInTheDocument();
  });

  it('renders Signals tab', () => {
    const { container } = renderTab(SignalsTabContent);
    expect(screen.getByTestId('dash-signals')).toBeInTheDocument();
    expect(screen.getByTestId('signals-hero-row')).toBeInTheDocument();
    expect(container.querySelector('.signals-adoption-card')).toBeTruthy();
    expect(container.querySelector('.signals-quality-card')).toBeTruthy();
    expect(container.querySelector('.signals-trajectory-card')).toBeTruthy();
    expect(screen.getByText('✦ AI Matches adoption')).toBeInTheDocument();
    expect(screen.getByText('Quality Signal')).toBeInTheDocument();
    expect(screen.getByText('Career trajectory coverage')).toBeInTheDocument();
    expect(screen.getByTestId('signals-kpi-row')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-testid="signals-kpi-row"] .card')).toHaveLength(3);
    expect(container.querySelector('.signals-referrals-card')).toBeTruthy();
    expect(container.querySelector('.signals-match-precision-card')).toBeTruthy();
    expect(container.querySelector('.signals-assessment-card')).toBeTruthy();
    expect(screen.getByText('Referrals in window')).toBeInTheDocument();
    expect(screen.getByText('Match precision proxy')).toBeInTheDocument();
    expect(screen.getByText('Assessment in progress')).toBeInTheDocument();
    expect(screen.getByTestId('signals-grid2-row')).toBeInTheDocument();
    expect(container.querySelector('.signals-strength-card')).toBeTruthy();
    expect(container.querySelector('.signals-recommendations-card')).toBeTruthy();
    expect(screen.getByText('Signal strength by category')).toBeInTheDocument();
    expect(screen.getByText('AI recommendations')).toBeInTheDocument();
    expect(screen.getByTestId('signals-assessment-row')).toBeInTheDocument();
    expect(container.querySelector('.signals-funnel-card')).toBeTruthy();
    expect(container.querySelector('.signals-actions-card')).toBeTruthy();
    expect(screen.getByText('Assessment completion funnel')).toBeInTheDocument();
    expect(screen.getByText('Signal actions')).toBeInTheDocument();
  });

  it('renders Analytics tab', () => {
    const { container } = renderTab(AnalyticsTabContent, {
      trends: { points: mockTrendPoints, data_source: 'mixed' },
    });
    expect(screen.getByTestId('dash-charts')).toBeInTheDocument();
    expect(screen.getByTestId('analytics-kpi-row')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-testid="analytics-kpi-row"] .card.metric')).toHaveLength(5);
    expect(container.querySelector('.analytics-applications-card')).toBeTruthy();
    expect(container.querySelector('.analytics-fit-card')).toBeTruthy();
    expect(container.querySelector('.analytics-offer-card')).toBeTruthy();
    expect(container.querySelector('.analytics-stage-age-card')).toBeTruthy();
    expect(container.querySelector('.analytics-high-fit-card')).toBeTruthy();
    const kpiRow = screen.getByTestId('analytics-kpi-row');
    expect(within(kpiRow).getByText('Applications')).toBeInTheDocument();
    expect(within(kpiRow).getByText('Avg Fit Score')).toBeInTheDocument();
    expect(within(kpiRow).getByText('Offer Conversion')).toBeInTheDocument();
    expect(within(kpiRow).getByText('Avg Stage Age')).toBeInTheDocument();
    expect(within(kpiRow).getByText('High Fit Talent')).toBeInTheDocument();
    expect(screen.getByTestId('analytics-grid2-row')).toBeInTheDocument();
    expect(container.querySelector('.analytics-trend-card')).toBeTruthy();
    expect(container.querySelector('.analytics-summary-card')).toBeTruthy();
    expect(screen.getByText('6-month hiring trend')).toBeInTheDocument();
    expect(screen.getByText('AI analytics summary')).toBeInTheDocument();
    expect(container.querySelectorAll('.analytics-summary-card .insight-item')).toHaveLength(4);
    expect(screen.getByText('Pipeline spike detected')).toBeInTheDocument();
    expect(screen.getByTestId('analytics-trend-chart')).toBeInTheDocument();
    expect(screen.getByTestId('analytics-source-row')).toBeInTheDocument();
    expect(container.querySelector('.analytics-source-mix-card')).toBeTruthy();
    expect(container.querySelector('.analytics-fit-source-card')).toBeTruthy();
    expect(screen.getByText('Candidate source mix')).toBeInTheDocument();
    expect(screen.getByText('Average fit by source')).toBeInTheDocument();
    expect(screen.getByTestId('analytics-fit-aging-row')).toBeInTheDocument();
    expect(container.querySelector('.analytics-fit-dist-card')).toBeTruthy();
    expect(container.querySelector('.analytics-stage-heat-card')).toBeTruthy();
    expect(screen.getByText('Fit score distribution')).toBeInTheDocument();
    expect(screen.getByText('Time in stage heatmap')).toBeInTheDocument();
    expect(screen.getByTestId('analytics-req-row')).toBeInTheDocument();
    expect(container.querySelector('.analytics-req-aging-card')).toBeTruthy();
    expect(container.querySelector('.analytics-top-jobs-card')).toBeTruthy();
    expect(screen.getByText('Requisition ageing')).toBeInTheDocument();
    expect(screen.getByText('Top open roles')).toBeInTheDocument();
  });
});
