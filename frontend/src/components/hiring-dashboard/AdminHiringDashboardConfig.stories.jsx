import React, { useEffect } from 'react';
import { Toaster } from 'sonner';
import AdminHiringDashboardConfigPage from '../../pages/AdminHiringDashboardConfigPage';
import { adminApi } from '../../lib/api';
import { DEFAULT_RULE_FLAGS, DEFAULT_STAGE_SLA } from '../../lib/hiringDashboardConfigConstants';

const mockConfig = {
  low_fit_threshold: 50,
  stuck_critical_count: 25,
  monthly_hire_target: 10,
  stale_req_zero_interviews_days: 90,
  stage_sla_days: DEFAULT_STAGE_SLA,
  rule_flags: DEFAULT_RULE_FLAGS,
  llm_insights_enabled: true,
  updated_at: '2026-06-18T12:00:00Z',
  audit_trail: [
    {
      id: 'audit-story-1',
      user_name: 'Storybook Admin',
      summary: 'Updated rule flags',
      created_at: '2026-06-18T11:30:00Z',
      changes: { rule_flags: { from: {}, to: {} } },
    },
    {
      id: 'audit-story-2',
      user_name: 'Ops Admin',
      summary: 'Updated monthly hire target',
      created_at: '2026-06-18T10:00:00Z',
      changes: { monthly_hire_target: { from: 8, to: 10 } },
    },
  ],
};

function withMockedAdminApi(Story) {
  useEffect(() => {
    const originalGet = adminApi.getHiringDashboardConfig;
    const originalPut = adminApi.updateHiringDashboardConfig;
    adminApi.getHiringDashboardConfig = () => Promise.resolve({ data: mockConfig });
    adminApi.updateHiringDashboardConfig = (payload) =>
      Promise.resolve({
        data: {
          ...mockConfig,
          ...payload,
          updated_at: new Date().toISOString(),
          audit_trail: [
            {
              id: 'audit-story-save',
              user_name: 'Storybook Admin',
              summary: 'Configuration saved',
              created_at: new Date().toISOString(),
              changes: payload,
            },
            ...mockConfig.audit_trail,
          ],
        },
      });
    return () => {
      adminApi.getHiringDashboardConfig = originalGet;
      adminApi.updateHiringDashboardConfig = originalPut;
    };
  }, []);

  return (
    <div className="hiring-dashboard-root min-h-screen bg-slate-50 p-6">
      <Story />
      <Toaster />
    </div>
  );
}

export default {
  title: 'Hiring Dashboard/Admin Config',
  component: AdminHiringDashboardConfigPage,
  decorators: [withMockedAdminApi],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  render: () => <AdminHiringDashboardConfigPage />,
};

export const RuleMatrixOnly = {
  render: () => (
    <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Object.entries(DEFAULT_RULE_FLAGS).map(([key, enabled]) => (
        <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-bold text-sm">{key.replace(/_/g, ' ')}</h4>
            <span className={`text-xs font-bold ${enabled ? 'text-emerald-700' : 'text-slate-400'}`}>
              {enabled ? 'Active' : 'Disabled'}
            </span>
          </div>
          <p className="text-xs text-slate-500">Rule flag: {key}</p>
        </div>
      ))}
    </div>
  ),
  decorators: [],
};
