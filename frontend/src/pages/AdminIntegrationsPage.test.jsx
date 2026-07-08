import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import AdminIntegrationsPage from './AdminIntegrationsPage';
import { adminApi } from '../lib/api';

vi.mock('../config/appModules', () => ({
  SMART_HIRING_ONLY: false,
}));

vi.mock('../lib/api', () => ({
  adminApi: {
    getConnectorConfigs: vi.fn(),
    updateConnectorConfig: vi.fn(),
    getConnectorsHealth: vi.fn(),
    getLinkedInStatus: vi.fn(),
    getLinkedInExportQueue: vi.fn(),
    getApifyLinkedInStatus: vi.fn(),
  },
  jobsApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const emptyConfigs = {
  COMPANY_DB_CANDIDATES: { enabled: false },
  LINKEDIN: { enabled: false, api_mode: 'apify' },
  NAUKRI: { enabled: false },
  MONSTER: { enabled: false },
};

describe('AdminIntegrationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminApi.getConnectorConfigs.mockResolvedValue({ data: emptyConfigs });
    adminApi.getConnectorsHealth.mockResolvedValue({
      data: {
        COMPANY_DB_CANDIDATES: { enabled: false, health_ok: null },
        LINKEDIN: { enabled: false, health_ok: null },
        NAUKRI: { enabled: false, health_ok: null },
        MONSTER: { enabled: false, health_ok: null },
      },
    });
    adminApi.getLinkedInStatus.mockResolvedValue({
      data: { configured: false, pending_export_count: 0 },
    });
    adminApi.getLinkedInExportQueue.mockResolvedValue({ data: { items: [] } });
    adminApi.getApifyLinkedInStatus.mockResolvedValue({
      data: { configured: false, token_set: false },
    });
    adminApi.updateConnectorConfig.mockResolvedValue({ data: {} });
  });

  it('renders health grid and overview tab', async () => {
    render(
      <MemoryRouter>
        <AdminIntegrationsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('admin-integrations-command-root')).toBeInTheDocument();
    });

    expect(screen.getByText('Admin Integrations')).toBeInTheDocument();
    expect(screen.getByText('Connector health')).toBeInTheDocument();
    expect(screen.getByText('Integration readiness')).toBeInTheDocument();
    expect(screen.getByTestId('admin-integrations-tab-overview')).toHaveClass('aic-tab--active');
  });

  it('saves all connector configs', async () => {
    render(
      <MemoryRouter>
        <AdminIntegrationsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('admin-integrations-save-footer')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('admin-integrations-save-footer'));

    await waitFor(() => {
      expect(adminApi.updateConnectorConfig).toHaveBeenCalledTimes(4);
    });

    expect(adminApi.updateConnectorConfig).toHaveBeenCalledWith(
      'COMPANY_DB_CANDIDATES',
      expect.objectContaining({ enabled: false })
    );
    expect(adminApi.updateConnectorConfig).toHaveBeenCalledWith(
      'LINKEDIN',
      expect.objectContaining({ api_mode: 'apify', enabled: false })
    );
  });
});
