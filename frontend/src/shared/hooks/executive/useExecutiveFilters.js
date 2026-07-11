import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

const DEFAULTS = {
  tab: 'summary',
  horizon: '3',
  window: '30',
  department: '',
  manager: '',
  role: '',
  compare: '',
  compareAgainst: '',
  analyst: '0',
};

const VALID_TABS = new Set(['summary', 'workforce', 'skills', 'people', 'hiring', 'automation', 'reports']);

export function useExecutiveFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(
    () => ({
      activeTab: (() => {
        const t = searchParams.get('tab') || DEFAULTS.tab;
        return VALID_TABS.has(t) ? t : DEFAULTS.tab;
      })(),
      horizonMonths: Number(searchParams.get('horizon') || DEFAULTS.horizon),
      windowDays: Number(searchParams.get('window') || DEFAULTS.window),
      department: searchParams.get('department') || '',
      managerRootId: searchParams.get('manager') || '',
      roleContains: searchParams.get('role') || '',
      comparePeriod: searchParams.get('compare') || '',
      compareAgainst: searchParams.get('compare_against') || '',
      analystMode: searchParams.get('analyst') === '1',
    }),
    [searchParams],
  );

  const setFilters = useCallback(
    (patch) => {
      const next = new URLSearchParams(searchParams);
      const map = {
        activeTab: 'tab',
        horizonMonths: 'horizon',
        windowDays: 'window',
        department: 'department',
        managerRootId: 'manager',
        roleContains: 'role',
        comparePeriod: 'compare',
        compareAgainst: 'compare_against',
        analystMode: 'analyst',
      };
      Object.entries(patch).forEach(([key, val]) => {
        const param = map[key];
        if (!param) return;
        if (key === 'analystMode') {
          if (val) next.set(param, '1');
          else next.delete(param);
          return;
        }
        if (key === 'activeTab' && (val === 'summary' || val === DEFAULTS.tab)) {
          next.delete(param);
          return;
        }
        if (val === '' || val == null || val === false) next.delete(param);
        else next.set(param, String(val));
      });
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const clearFilters = useCallback(() => {
    const next = new URLSearchParams();
    if (searchParams.get('analyst') === '1') next.set('analyst', '1');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const activeChips = useMemo(() => {
    const chips = [];
    if (filters.department) chips.push({ key: 'department', label: `Dept: ${filters.department}` });
    if (filters.managerRootId) chips.push({ key: 'managerRootId', label: 'Team filter' });
    if (filters.roleContains) chips.push({ key: 'roleContains', label: `Role: ${filters.roleContains}` });
    if (filters.horizonMonths !== 3) chips.push({ key: 'horizonMonths', label: `${filters.horizonMonths}mo horizon` });
    if (filters.windowDays !== 30) chips.push({ key: 'windowDays', label: `${filters.windowDays}d window` });
    if (filters.comparePeriod) {
      const against = filters.compareAgainst || 'prior period';
      chips.push({
        key: 'comparePeriod',
        label: `${filters.comparePeriod} vs ${against}`,
      });
    }
    return chips;
  }, [filters]);

  return { filters, setFilters, clearFilters, activeChips };
}
