import React, { useMemo } from 'react';
import { usePlacementFilters } from '../../../context/PlacementFiltersContext';
import {
  BUSINESS_ORG_PILLARS,
  getDepartmentsForPillar,
  getSubDepartmentsForDepartment,
} from '../../../data/businessOrgHierarchy';

const ALL = '';

export default function AssessmentsOrgFilterBar({ jobs = [] }) {
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
    <section className="as-org-filter" aria-label="Organization scope filters" data-testid="assessment-org-filter-bar">
      <label>Org scope</label>
      <div className="as-org-grid">
        <select
          value={pillarId || ALL}
          onChange={(e) => {
            setPillarId(e.target.value);
            setDepartmentId('');
            setSubDepartment('');
            setProjectId('');
          }}
          data-testid="assessment-pillar-filter"
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
          data-testid="assessment-department-filter"
        >
          <option value={ALL}>{pillarId ? 'All departments' : 'Select pillar'}</option>
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
          data-testid="assessment-subdepartment-filter"
        >
          <option value={ALL}>{departmentId ? 'All sub-depts' : 'Select dept'}</option>
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
          data-testid="assessment-project-filter"
        >
          <option value={ALL}>{projectOptions.length ? 'All projects' : 'No projects'}</option>
          {projectOptions.map((pid) => (
            <option key={pid} value={pid}>
              {pid}
            </option>
          ))}
        </select>
        <button type="button" className="as-clear-btn" onClick={clearAll} data-testid="assessment-clear-org-filters">
          Clear
        </button>
      </div>
    </section>
  );
}
