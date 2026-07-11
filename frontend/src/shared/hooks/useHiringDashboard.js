import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { dashboardApi } from '@/shared/lib/api';
import { normalizeOrgFilterValue } from '@/features/smart-hiring/components/hiring-dashboard/dashboardOrgFilterUtils';

function readOrgParam(searchParams, key) {
  return normalizeOrgFilterValue(searchParams.get(key));
}

export function useHiringDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const windowDays = Number(searchParams.get('window') || 30);
  const scope = searchParams.get('scope') || 'all';
  const department = readOrgParam(searchParams, 'department');
  const pillar = readOrgParam(searchParams, 'pillar');
  const subDepartment = readOrgParam(searchParams, 'sub_department');
  const projectId = readOrgParam(searchParams, 'project_id');
  const jobId = searchParams.get('job_id') || '';
  const ownerId = searchParams.get('owner_id') || '';
  const [pack, setPack] = useState(null);
  const [trends, setTrends] = useState(null);
  const [trendsHealth, setTrendsHealth] = useState(null);
  const [filterOptions, setFilterOptions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);
  const [error, setError] = useState(null);

  const setParam = useCallback(
    (key, value, deleteWhenEmpty = true) => {
      const next = new URLSearchParams(searchParams);
      const normalized = normalizeOrgFilterValue(value);
      if (normalized) next.set(key, normalized);
      else if (deleteWhenEmpty) next.delete(key);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const setParams = useCallback(
    (updates) => {
      const next = new URLSearchParams(searchParams);
      updates.forEach(({ key, value, deleteWhenEmpty = true }) => {
        const normalized = normalizeOrgFilterValue(value);
        if (normalized) next.set(key, normalized);
        else if (deleteWhenEmpty) next.delete(key);
      });
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const setWindowDays = useCallback((days) => setParam('window', String(days), false), [setParam]);
  const setScope = useCallback((value) => setParam('scope', value, false), [setParam]);
  const setDepartment = useCallback(
    (value) =>
      setParams([
        { key: 'department', value },
        { key: 'sub_department', value: '' },
        { key: 'project_id', value: '' },
      ]),
    [setParams]
  );
  const setPillar = useCallback(
    (value) =>
      setParams([
        { key: 'pillar', value },
        { key: 'department', value: '' },
        { key: 'sub_department', value: '' },
        { key: 'project_id', value: '' },
      ]),
    [setParams]
  );
  const setSubDepartment = useCallback(
    (value) =>
      setParams([
        { key: 'sub_department', value },
        { key: 'project_id', value: '' },
      ]),
    [setParams]
  );
  const setProjectId = useCallback((value) => setParam('project_id', value), [setParam]);
  const setJobId = useCallback((value) => setParam('job_id', value), [setParam]);
  const setOwnerId = useCallback((value) => setParam('owner_id', value), [setParam]);

  const clearOrgFilters = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    ['pillar', 'department', 'sub_department', 'project_id'].forEach((k) => next.delete(k));
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await dashboardApi.getFilterOptions({
          scope,
          department: department || undefined,
          business_pillar: pillar || undefined,
          business_sub_department: subDepartment || undefined,
          owner_id: ownerId || undefined,
        });
        if (alive) setFilterOptions(res.data);
      } catch (err) {
        console.warn('Failed to load dashboard filter options', err?.response?.data || err?.message || err);
        if (alive) setFilterOptions({ pillars: [], departments: [], sub_departments: [], project_ids: [] });
      }
    })();
    return () => {
      alive = false;
    };
  }, [scope, department, pillar, subDepartment, ownerId]);

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
        if (pillar.trim()) params.business_pillar = pillar.trim();
        if (subDepartment.trim()) params.business_sub_department = subDepartment.trim();
        if (projectId.trim()) params.project_id = projectId.trim();
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
    [windowDays, scope, department, pillar, subDepartment, projectId, jobId, ownerId]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  return {
    pack,
    trends,
    trendsHealth,
    filterOptions,
    loading,
    refetching,
    error,
    windowDays,
    scope,
    department,
    pillar,
    subDepartment,
    projectId,
    jobId,
    ownerId,
    setWindowDays,
    setScope,
    setDepartment,
    setPillar,
    setSubDepartment,
    setProjectId,
    setJobId,
    setOwnerId,
    clearOrgFilters,
    reload: () => load(true),
  };
}

export function formatDelta(deltaPct, windowDays = 30) {
  if (deltaPct == null || Number.isNaN(deltaPct)) return null;
  const abs = Math.abs(deltaPct);
  const periodLabel = windowDays === 7 ? 'last 7 days' : windowDays === 90 ? 'last 90 days' : 'last 30 days';
  return `${abs}% from ${periodLabel}`;
}
