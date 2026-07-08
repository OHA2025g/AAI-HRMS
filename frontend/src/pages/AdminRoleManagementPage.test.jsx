import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import AdminRoleManagementPage from './AdminRoleManagementPage';
import { adminApi } from '../lib/api';

vi.mock('../config/appModules', () => ({
  SMART_HIRING_ONLY: false,
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin-1', role: 'admin' } }),
}));

vi.mock('../lib/api', () => ({
  adminApi: {
    listUsers: vi.fn(),
    updateUserRole: vi.fn(),
  },
  jobsApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() },
}));

const users = {
  items: [
    {
      id: 'user-hm',
      full_name: 'QA Hiring Manager',
      email: 'qa_hm@aai-hrms.local',
      role: 'hiring_manager',
    },
    {
      id: 'admin-1',
      full_name: 'QA Admin',
      email: 'qa_admin@aai-hrms.local',
      role: 'admin',
    },
  ],
  total_pages: 1,
};

describe('AdminRoleManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminApi.listUsers.mockResolvedValue({ data: users });
    adminApi.updateUserRole.mockResolvedValue({ data: {} });
  });

  it('renders command center layout and summary cards', async () => {
    render(<AdminRoleManagementPage />);

    await waitFor(() => {
      expect(screen.getByTestId('admin-role-management-command-root')).toBeInTheDocument();
    });

    expect(screen.getByText('Access governance score')).toBeInTheDocument();
    expect(screen.getByText('Users & role assignment')).toBeInTheDocument();
    expect(screen.getByText('Role access matrix')).toBeInTheDocument();
    expect(screen.getByText('Role health & audit trail')).toBeInTheDocument();
  });

  it('applies pending role changes in batch', async () => {
    render(<AdminRoleManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('QA Hiring Manager')).toBeInTheDocument();
    });

    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'project_manager' } });
    fireEvent.click(screen.getByTestId('admin-role-apply-changes'));

    await waitFor(() => {
      expect(screen.getByText(/Apply 1 pending role change/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() => {
      expect(adminApi.updateUserRole).toHaveBeenCalledWith('user-hm', { role: 'project_manager' });
    });
  });
});
