import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import AdminDatabasePage from './AdminDatabasePage';
import { adminApi } from '../lib/api';

vi.mock('../config/appModules', () => ({
  SMART_HIRING_ONLY: false,
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'qa_admin@aai-hrms.local' } }),
}));

vi.mock('../lib/api', () => ({
  adminApi: {
    getDatabaseStats: vi.fn(),
    flushDatabase: vi.fn(),
  },
  jobsApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const stats = {
  db_name: 'aai_hrms',
  collection_count: 3,
  document_count: 100,
  flush_enabled: true,
  flush_confirm_phrase: 'FLUSH ALL DATA',
  collections: [
    { name: 'candidates', document_count: 50 },
    { name: 'applications', document_count: 40 },
    { name: '_schema_migrations', document_count: 10 },
  ],
};

describe('AdminDatabasePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminApi.getDatabaseStats.mockResolvedValue({ data: stats });
    adminApi.flushDatabase.mockResolvedValue({ data: { dropped_collections: ['candidates'] } });
  });

  it('renders command center layout and overview table', async () => {
    render(<AdminDatabasePage />);

    await waitFor(() => {
      expect(screen.getByTestId('admin-database-command-root')).toBeInTheDocument();
    });

    expect(screen.getByText('Database Maintenance')).toBeInTheDocument();
    expect(screen.getByText('Database overview')).toBeInTheDocument();
    expect(screen.getByText('candidates')).toBeInTheDocument();
    expect(screen.getByText('Flush all data')).toBeInTheDocument();
  });

  it('requires confirmation phrase before flush', async () => {
    render(<AdminDatabasePage />);

    await waitFor(() => {
      expect(screen.getByTestId('admin-database-flush-btn')).toBeInTheDocument();
    });

    expect(screen.getByTestId('admin-database-flush-btn')).toBeDisabled();

    fireEvent.change(screen.getByTestId('admin-database-flush-confirm'), {
      target: { value: 'FLUSH ALL DATA' },
    });
    fireEvent.click(screen.getByTestId('admin-database-flush-btn'));

    await waitFor(() => {
      expect(adminApi.flushDatabase).toHaveBeenCalled();
    });
  });
});
