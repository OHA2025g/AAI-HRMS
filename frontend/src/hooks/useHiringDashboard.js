import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { dashboardApi } from '../lib/api';

export function useHiringDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const windowDays = Number(searchParams.get('window') || 30);
  const scope = searchParams.get('scope') || 'all';
  const department = searchParams.get('department') || '';
  const jobId = searchParams.get('job_id') || '';
  const ownerId = searchParams.get('owner_id') || '';
  const [pack, setPack] = useState(null);
  const [trends, setTrends] = useState(null);
  const [trendsHealth, setTrendsHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);
  const [error, setError] = useState(null);

  const setWindowDays = useCallback(
    (days) => {
      const next = new URLSearchParams(searchParams);
      next.set('window', String(days));
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const setScope = useCallback(
    (value) => {
      const next = new URLSearchParams(searchParams);
      next.set('scope', value);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const setDepartment = useCallback(
    (value) => {
      const next = new URLSearchParams(searchParams);
      if (value?.trim()) next.set('department', value.trim());
      else next.delete('department');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const setJobId = useCallback(
    (value) => {
      const next = new URLSearchParams(searchParams);
      if (value?.trim()) next.set('job_id', value.trim());
      else next.delete('job_id');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const setOwnerId = useCallback(
    (value) => {
      const next = new URLSearchParams(searchParams);
      if (value?.trim()) next.set('owner_id', value.trim());
      else next.delete('owner_id');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const load = useCallback(
    async (isRefetch = false) => {
      if (isRefetch) setRefetching(true);
      else setLoading(true);
      setError(null);
      try {
        const params = {
          window_days: windowDays,
          scope,
          include_trends: true,
          trends_months: 6,
        };
        if (department.trim()) params.department = department.trim();
        if (jobId.trim()) params.job_id = jobId.trim();
        if (ownerId.trim()) params.owner_id = ownerId.trim();
        const packRes = await dashboardApi.getHiringPack(params);
        setPack(packRes.data);
        if (packRes.data?.trends) {
          setTrends(packRes.data.trends);
        } else {
          const trendsRes = await dashboardApi.getTrends({ months: 6 });
          setTrends(trendsRes.data);
        }
        try {
          const healthRes = await dashboardApi.getTrendsHealth();
          setTrendsHealth(healthRes.data);
        } catch {
          setTrendsHealth(null);
        }
      } catch (e) {
        setError(e?.response?.data?.detail || e?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
        setRefetching(false);
      }
    },
    [windowDays, scope, department, jobId, ownerId]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  return {
    pack,
    trends,
    trendsHealth,
    loading,
    refetching,
    error,
    windowDays,
    scope,
    department,
    jobId,
    ownerId,
    setWindowDays,
    setScope,
    setDepartment,
    setJobId,
    setOwnerId,
    reload: () => load(true),
  };
}

export function formatDelta(deltaPct) {
  if (deltaPct == null || Number.isNaN(deltaPct)) return null;
  const sign = deltaPct > 0 ? '+' : '';
  return `${sign}${deltaPct}%`;
}
