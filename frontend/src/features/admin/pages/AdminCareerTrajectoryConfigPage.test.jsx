import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import AdminCareerTrajectoryConfigPage from './AdminCareerTrajectoryConfigPage';
import { careerTrajectoryApi } from '@/shared/lib/api';

vi.mock('@/shared/config/appModules', () => ({
  SMART_HIRING_ONLY: false,
}));

vi.mock('@/shared/lib/api', () => ({
  careerTrajectoryApi: {
    getConfig: vi.fn(),
    updateConfig: vi.fn(),
    getFairnessSummary: vi.fn(),
    exportTraining: vi.fn(),
    trainMlCalibration: vi.fn(),
  },
  jobsApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() },
}));

const baseConfig = {
  overall_weights: {
    career_progression: 0.14,
    scope_expansion: 0.12,
    project_complexity: 0.11,
    business_impact: 0.13,
    skill_evolution: 0.1,
    leadership_maturity: 0.12,
    adaptability: 0.1,
    tenure_stability: 0.09,
    future_role_readiness: 0.09,
  },
  sub_weights: {},
  updated_at: '2026-05-25T00:36:25Z',
};

describe('AdminCareerTrajectoryConfigPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    careerTrajectoryApi.getConfig.mockResolvedValue({ data: baseConfig });
    careerTrajectoryApi.getFairnessSummary.mockResolvedValue({
      data: {
        total_reports: 3,
        passed: 0,
        review_required: 3,
        pass_rate_pct: 0,
      },
    });
    careerTrajectoryApi.updateConfig.mockResolvedValue({ data: baseConfig });
  });

  it('renders command center layout and fairness dashboard', async () => {
    render(
      <MemoryRouter>
        <AdminCareerTrajectoryConfigPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('career-traj-config-command-root')).toBeInTheDocument();
    });

    expect(screen.getByTestId('career-traj-fairness-dashboard')).toBeInTheDocument();
    expect(screen.getByText('Career trajectory scoring')).toBeInTheDocument();
    expect(screen.getByText('Overall score weights')).toBeInTheDocument();
    expect(screen.getByText('Weight distribution')).toBeInTheDocument();
  });

  it('saves weights from save button', async () => {
    render(
      <MemoryRouter>
        <AdminCareerTrajectoryConfigPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('career-traj-config-save')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('career-traj-config-save'));

    await waitFor(() => {
      expect(careerTrajectoryApi.updateConfig).toHaveBeenCalled();
    });
  });
});
