import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AnalyticsTrendChart, { mapTrendChartData } from './AnalyticsTrendChart';

describe('AnalyticsTrendChart', () => {
  it('maps trend points to chart series', () => {
    const data = mapTrendChartData([
      {
        label: 'May',
        new_applications: 410,
        avg_fit_score: 80,
        pending_offers: 6,
        time_to_fill_days: 33,
        hire_target: 8,
      },
    ]);
    expect(data).toEqual([
      {
        label: 'May',
        applications: 410,
        fit: 80,
        pendingOffers: 6,
        timeToFill: 33,
        hireTarget: 8,
      },
    ]);
  });

  it('renders chart when points exist', () => {
    render(
      <AnalyticsTrendChart
        points={[
          {
            label: 'Jun',
            new_applications: 530,
            avg_fit_score: 80,
            pending_offers: 8,
            time_to_fill_days: 32,
            hire_target: 8,
          },
        ]}
      />
    );
    expect(screen.getByTestId('analytics-trend-chart')).toBeInTheDocument();
  });

  it('shows empty state without points', () => {
    render(<AnalyticsTrendChart points={[]} />);
    expect(screen.getByText('Trend data unavailable')).toBeInTheDocument();
  });
});
