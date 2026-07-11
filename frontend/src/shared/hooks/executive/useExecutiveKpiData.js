import { useCallback, useEffect, useRef, useState } from 'react';
import { executiveApi } from '@/shared/lib/api';

export function useExecutiveKpiData(filters) {
  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);
  const [pack, setPack] = useState(null);
  const [drill, setDrill] = useState(null);
  const [definitions, setDefinitions] = useState([]);
  const [drillOpts, setDrillOpts] = useState(null);
  const [trends, setTrends] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [narrative, setNarrative] = useState(null);
  const [predictive, setPredictive] = useState(null);
  const [error, setError] = useState(null);
  const roleDebounceRef = useRef(null);
  const [debouncedRole, setDebouncedRole] = useState(filters.roleContains);

  useEffect(() => {
    if (roleDebounceRef.current) clearTimeout(roleDebounceRef.current);
    roleDebounceRef.current = setTimeout(() => setDebouncedRole(filters.roleContains), 300);
    return () => {
      if (roleDebounceRef.current) clearTimeout(roleDebounceRef.current);
    };
  }, [filters.roleContains]);

  const loadSnapshots = useCallback(async () => {
    try {
      const res = await executiveApi.listM9ExportPacks(24);
      setSnapshots(res.data?.items || []);
    } catch {
      setSnapshots([]);
    }
  }, []);

  const hasLoadedOnceRef = useRef(false);

  const applyBundle = useCallback((data) => {
    setPack(data.pack ?? null);
    setDrill(data.drill ?? null);
    setDefinitions(data.definitions ?? []);
    setTrends(data.trends ?? null);
    setDrillOpts(data.drill_options ?? null);
    setSnapshots(data.snapshots ?? []);
    setNarrative(data.narrative ?? null);
    setPredictive(data.predictive ?? null);
  }, []);

  const load = useCallback(
    async (isRefetch = false) => {
      if (hasLoadedOnceRef.current || isRefetch) {
        setRefetching(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const params = {
          horizon_months: filters.horizonMonths,
          window_days: filters.windowDays,
          department: filters.department || undefined,
          manager_root_id: filters.managerRootId || undefined,
          role_title_contains: debouncedRole.trim() || undefined,
          compare_period: filters.comparePeriod || undefined,
          compare_against: filters.compareAgainst || undefined,
          trends_months: 12,
          snapshot_limit: 24,
        };
        const res = await executiveApi.getM9DashboardBundle(params);
        applyBundle(res.data || {});
      } catch (e) {
        setError(e?.response?.data?.detail || 'Failed to load executive KPIs');
      } finally {
        hasLoadedOnceRef.current = true;
        setLoading(false);
        setRefetching(false);
      }
    },
    [
      filters.horizonMonths,
      filters.windowDays,
      filters.department,
      filters.managerRootId,
      debouncedRole,
      filters.comparePeriod,
      filters.compareAgainst,
      applyBundle,
    ],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const defById = useCallback(
    (kpiId) => definitions.find((d) => d.kpi_id === kpiId),
    [definitions],
  );

  const getDelta = useCallback(
    (kpiId) => {
      const row = (drill?.compare?.deltas || []).find((d) => d.kpi_id === kpiId);
      return row || null;
    },
    [drill?.compare],
  );

  return {
    loading,
    refetching,
    error,
    pack,
    drill,
    drillOpts,
    trends,
    snapshots,
    narrative,
    predictive,
    definitions,
    defById,
    getDelta,
    reload: () => load(true),
    loadSnapshots,
    debouncedRole,
  };
}
