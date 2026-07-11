import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useHiringAlertDismissals } from './useHiringAlertDismissals';

vi.mock('../lib/api', () => ({
  dashboardApi: {
    getHiringAlertDismissals: vi.fn(),
    dismissHiringAlert: vi.fn(),
  },
}));

import { dashboardApi } from '@/shared/lib/api';

describe('useHiringAlertDismissals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('loads dismissed ids from the server', async () => {
    dashboardApi.getHiringAlertDismissals.mockResolvedValue({
      data: { dismissed: ['stuck-screening'] },
    });

    const { result } = renderHook(() => useHiringAlertDismissals());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.dismissed).toEqual(['stuck-screening']);
    expect(result.current.filterAlerts([{ id: 'stuck-screening' }, { id: 'other' }])).toEqual([{ id: 'other' }]);
  });

  it('optimistically dismisses an alert and syncs to server', async () => {
    dashboardApi.getHiringAlertDismissals.mockResolvedValue({ data: { dismissed: [] } });
    dashboardApi.dismissHiringAlert.mockResolvedValue({ data: { ok: true } });

    const { result } = renderHook(() => useHiringAlertDismissals());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.dismiss('req-aging-over-60');
    });

    expect(result.current.dismissed).toContain('req-aging-over-60');
    expect(dashboardApi.dismissHiringAlert).toHaveBeenCalledWith('req-aging-over-60');
  });
});
