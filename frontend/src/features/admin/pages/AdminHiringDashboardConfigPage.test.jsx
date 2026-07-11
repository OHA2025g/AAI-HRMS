import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import AdminHiringDashboardConfigPage from './AdminHiringDashboardConfigPage';
import { adminApi } from '@/shared/lib/api';

vi.mock('@/shared/config/appModules', () => ({
  SMART_HIRING_ONLY: false,
}));

vi.mock('@/shared/lib/api', () => ({
  adminApi: {
    getHiringDashboardConfig: vi.fn(),
    updateHiringDashboardConfig: vi.fn(),
  },
  jobsApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const baseConfig = {
  low_fit_threshold: 50,
  stuck_critical_count: 25,
  monthly_hire_target: 10,
  stale_req_zero_interviews_days: 90,
  stage_sla_days: { SCREENING: 14 },
  rule_flags: {
    low_fit: true,
    stuck_stage: true,
    stale_req: true,
    trend_target: true,
    no_pipeline: true,
    no_ai_matches: true,
    high_fit_recent: true,
  },
  llm_insights_enabled: false,
  updated_at: '2026-06-18T10:00:00Z',
  audit_trail: [
    {
      id: 'audit-1',
      user_name: 'Ops Admin',
      summary: 'Updated rule flags',
      created_at: '2026-06-18T09:00:00Z',
      changes: { rule_flags: { from: {}, to: {} } },
    },
  ],
};

describe('AdminHiringDashboardConfigPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminApi.getHiringDashboardConfig.mockResolvedValue({ data: baseConfig });
    adminApi.updateHiringDashboardConfig.mockResolvedValue({
      data: { ...baseConfig, updated_at: '2026-06-18T11:00:00Z' },
    });
  });

  it('loads rule toggles and audit trail from API', async () => {
    render(
      <MemoryRouter>
        <AdminHiringDashboardConfigPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('admin-hiring-config-page')).toBeInTheDocument();
    });

    expect(screen.getByTestId('hiring-rule-toggle-low-fit')).toHaveAttribute('data-state', 'checked');
    expect(screen.getByTestId('hiring-dashboard-llm-insights-toggle')).toHaveAttribute('data-state', 'unchecked');
    expect(screen.getByTestId('hiring-config-audit-trail')).toBeInTheDocument();
    expect(screen.getByText('Updated rule flags')).toBeInTheDocument();
    expect(screen.getByText(/Ops Admin/)).toBeInTheDocument();
  });

  it('saves rule flags and LLM toggle', async () => {
    render(
      <MemoryRouter>
        <AdminHiringDashboardConfigPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('hiring-rule-toggle-stale-req')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('hiring-rule-toggle-stale-req'));
    fireEvent.click(screen.getByTestId('hiring-dashboard-llm-insights-toggle'));
    fireEvent.click(screen.getByTestId('hiring-dashboard-config-save'));

    await waitFor(() => {
      expect(adminApi.updateHiringDashboardConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          rule_flags: expect.objectContaining({ stale_req: false }),
          llm_insights_enabled: true,
        })
      );
    });
  });
});
