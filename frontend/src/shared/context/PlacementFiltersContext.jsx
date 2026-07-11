import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'aai_hrms.placement_filters.v1';

const PlacementFiltersContext = createContext(null);

const defaultState = {
  pillarId: '',
  departmentId: '',
  subDepartment: '',
  projectId: '',
};

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function PlacementFiltersProvider({ children }) {
  const [pillarId, setPillarId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [subDepartment, setSubDepartment] = useState('');
  const [projectId, setProjectId] = useState('');

  // Load persisted filters once.
  useEffect(() => {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return;
    const parsed = safeParse(raw);
    const v = parsed && typeof parsed === 'object' ? parsed : null;
    if (!v) return;
    setPillarId(typeof v.pillarId === 'string' ? v.pillarId : '');
    setDepartmentId(typeof v.departmentId === 'string' ? v.departmentId : '');
    setSubDepartment(typeof v.subDepartment === 'string' ? v.subDepartment : '');
    setProjectId(typeof v.projectId === 'string' ? v.projectId : '');
  }, []);

  // Persist on change.
  useEffect(() => {
    const payload = { pillarId, departmentId, subDepartment, projectId };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [pillarId, departmentId, subDepartment, projectId]);

  const value = useMemo(
    () => ({
      pillarId,
      setPillarId,
      departmentId,
      setDepartmentId,
      subDepartment,
      setSubDepartment,
      projectId,
      setProjectId,
      clearAll: () => {
        setPillarId('');
        setDepartmentId('');
        setSubDepartment('');
        setProjectId('');
      },
      setAll: (next) => {
        const v = { ...defaultState, ...(next || {}) };
        setPillarId(v.pillarId || '');
        setDepartmentId(v.departmentId || '');
        setSubDepartment(v.subDepartment || '');
        setProjectId(v.projectId || '');
      },
    }),
    [pillarId, departmentId, subDepartment, projectId]
  );

  return <PlacementFiltersContext.Provider value={value}>{children}</PlacementFiltersContext.Provider>;
}

export function usePlacementFilters() {
  const ctx = useContext(PlacementFiltersContext);
  if (!ctx) throw new Error('usePlacementFilters must be used within PlacementFiltersProvider');
  return ctx;
}

