import React, { useMemo } from 'react';
import { usePlacementFilters } from '../../../context/PlacementFiltersContext';
import {
  BUSINESS_ORG_PILLARS,
  getDepartmentsForPillar,
  getSubDepartmentsForDepartment,
} from '../../../data/businessOrgHierarchy';

const ALL = '';

export default function CareerTrajectoryOrgFilterBar({ jobs = [] }) {
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

  const handlePillarChange = (value) => {
    setPillarId(value);
    setDepartmentId('');
    setSubDepartment('');
    setProjectId('');
  };

  const handleDepartmentChange = (value) => {
    setDepartmentId(value);
    setSubDepartment('');
    setProjectId('');
  };

  const handleSubDepartmentChange = (value) => {
    setSubDepartment(value);
    setProjectId('');
  };

  return (
    <section
      className="ct-filterbar"
      aria-label="Career trajectory scope filters"
      data-testid="career-trajectory-org-filterbar"
    >
      <div className="ct-filter-field">
        <label htmlFor="ct-pillar-filter">Pillar</label>
        <select
          id="ct-pillar-filter"
          data-testid="career-trajectory-pillar-filter"
          value={pillarId || ALL}
          onChange={(e) => handlePillarChange(e.target.value)}
        >
          <option value={ALL}>All</option>
          {BUSINESS_ORG_PILLARS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="ct-filter-field">
        <label htmlFor="ct-dept-filter">Department</label>
        <select
          id="ct-dept-filter"
          data-testid="career-trajectory-dept-filter"
          value={departmentId || ALL}
          disabled={!pillarId}
          onChange={(e) => handleDepartmentChange(e.target.value)}
        >
          <option value={ALL}>{pillarId ? 'All' : 'Select pillar'}</option>
          {departmentOptions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      <div className="ct-filter-field">
        <label htmlFor="ct-subdept-filter">Sub-dept</label>
        <select
          id="ct-subdept-filter"
          data-testid="career-trajectory-subdept-filter"
          value={subDepartment || ALL}
          disabled={!departmentId}
          onChange={(e) => handleSubDepartmentChange(e.target.value)}
        >
          <option value={ALL}>{departmentId ? 'All' : 'Select dept'}</option>
          {subDepartmentOptions.map((sub) => (
            <option key={sub} value={sub}>
              {sub}
            </option>
          ))}
        </select>
      </div>

      <div className="ct-filter-field">
        <label htmlFor="ct-project-filter">Project ID</label>
        <select
          id="ct-project-filter"
          data-testid="career-trajectory-project-filter"
          value={projectId || ALL}
          disabled={projectOptions.length === 0}
          onChange={(e) => setProjectId(e.target.value)}
        >
          <option value={ALL}>{projectOptions.length ? 'All' : 'No projects'}</option>
          {projectOptions.map((pid) => (
            <option key={pid} value={pid}>
              {pid}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        className="ct-filter-clear"
        onClick={clearAll}
        data-testid="career-trajectory-clear-filters"
      >
        Clear filters
      </button>
    </section>
  );
}
