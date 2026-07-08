import React from 'react';
import { render, screen } from '@testing-library/react';
import HiringVelocityChart from './HiringVelocityChart';
import TimeToFillTrendChart from './TimeToFillTrendChart';
import { mockTrendPoints } from './fixtures/hiringPackFixture';

describe('Overview trend charts', () => {
  it('renders hiring velocity chart with data', () => {
    render(
      <HiringVelocityChart
        points={mockTrendPoints}
        headline={{ new_applications: { value: 205 }, hires: { value: 4 } }}
        pipelineByStage={{ INTERVIEW_1: 2 }}
      />
    );
    expect(screen.getByTestId('hiring-velocity-chart')).toBeInTheDocument();
    expect(screen.getByText(/Applications:/)).toBeInTheDocument();
  });

  it('shows empty state when no trend points', () => {
    render(<TimeToFillTrendChart points={[]} />);
    expect(screen.getByText('Time to fill trend unavailable')).toBeInTheDocument();
  });
});
