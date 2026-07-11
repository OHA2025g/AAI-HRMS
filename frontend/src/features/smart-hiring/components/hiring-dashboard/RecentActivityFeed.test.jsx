import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RecentActivityFeed from './RecentActivityFeed';

describe('RecentActivityFeed', () => {
  it('renders activity rows with drill links', () => {
    render(
      <MemoryRouter>
        <RecentActivityFeed
          activities={[
            { candidate_name: 'Jane Doe', job_title: 'Engineer', stage: 'SCREENING' },
          ]}
        />
      </MemoryRouter>
    );
    expect(screen.getByTestId('recent-activity-feed')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Engineer')).toBeInTheDocument();
    expect(screen.getByText('SCREENING')).toBeInTheDocument();
  });

  it('shows empty state when no activities', () => {
    render(
      <MemoryRouter>
        <RecentActivityFeed activities={[]} />
      </MemoryRouter>
    );
    expect(screen.getByText('No recent activity')).toBeInTheDocument();
  });
});
