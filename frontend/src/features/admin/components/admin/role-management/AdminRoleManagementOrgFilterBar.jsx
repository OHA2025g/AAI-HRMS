import React, { useMemo } from 'react';
import { usePlacementFilters } from '@/shared/context/PlacementFiltersContext';
import {
  BUSINESS_ORG_PILLARS,
  getDepartmentsForPillar,
  getSubDepartmentsForDepartment,
} from '@/data/businessOrgHierarchy';

const ALL = '';

export default function AdminRoleManagementOrgFilterBar({ jobs = [] }) {
  const placement = usePlacementFilters();
  const {
    pillarId,
    departmentId,
    subDepartment,
    projectId,
    setPillarId,
    setDepartmentId,
    setSubDepartment,
    setProjectId,
    clearAll,
  } = placement;

  const departmentOptions = pillarId ? getDepartmentsForPillar(pillarId) : [];
  const subDepartmentOptions =
    pillarId && departmentId ? getSubDepartmentsForDepartment(pillarId, departmentId) : [];

  const projectOptions = useMemo(() => {
    const pillarLabel = BUSINESS_ORG_PILLARS.find((p) => p.id === pillarId)?.label || '';
    const deptLabel =
      pillarId && departmentId
        ? getDepartmentsForPillar(pillarId).find((d) => d.id === departmentId)?.label || ''
        : '';
    const ids = new Set();
    (jobs || []).forEach((j) => {
      if (pillarLabel && (j?.business_pillar || '') !== pillarLabel) return;
      if (deptLabel && (j?.business_department || '') !== deptLabel) return;
      if (subDepartment && (j?.business_sub_department || '') !== subDepartment) return;
      if (j?.project_id) ids.add(j.project_id);
    });
    return [...ids].sort();
  }, [jobs, pillarId, departmentId, subDepartment]);

  return (
    <div className="arm-topbar-filters" data-testid="admin-role-org-filter-bar">
      <select
        value={pillarId || ALL}
        onChange={(e) => {
          setPillarId(e.target.value);
          setDepartmentId('');
          setSubDepartment('');
          setProjectId('');
        }}
      >
        <option value={ALL}>All pillars</option>
        {BUSINESS_ORG_PILLARS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      <select
        value={departmentId || ALL}
        disabled={!pillarId}
        onChange={(e) => {
          setDepartmentId(e.target.value);
          setSubDepartment('');
          setProjectId('');
        }}
      >
        <option value={ALL}>All departments</option>
        {departmentOptions.map((d) => (
          <option key={d.id} value={d.id}>
            {d.label}
          </option>
        ))}
      </select>
      <select
        value={subDepartment || ALL}
        disabled={!departmentId}
        onChange={(e) => {
          setSubDepartment(e.target.value);
          setProjectId('');
        }}
      >
        <option value={ALL}>All sub-depts</option>
        {subDepartmentOptions.map((sub) => (
          <option key={sub} value={sub}>
            {sub}
          </option>
        ))}
      </select>
      <select
        value={projectId || ALL}
        disabled={projectOptions.length === 0}
        onChange={(e) => setProjectId(e.target.value)}
      >
        <option value={ALL}>All projects</option>
        {projectOptions.map((pid) => (
          <option key={pid} value={pid}>
            {pid}
          </option>
        ))}
      </select>
      <button type="button" className="arm-clear-btn" onClick={clearAll}>
        Clear filters
      </button>
    </div>
  );
}
