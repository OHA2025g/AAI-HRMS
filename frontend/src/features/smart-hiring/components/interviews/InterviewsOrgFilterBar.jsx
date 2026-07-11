import React, { useMemo } from 'react';
import { usePlacementFilters } from '@/shared/context/PlacementFiltersContext';
import {
  BUSINESS_ORG_PILLARS,
  getDepartmentsForPillar,
  getSubDepartmentsForDepartment,
} from '@/data/businessOrgHierarchy';

const ALL = '';

export default function InterviewsOrgFilterBar({ jobs = [] }) {
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
    const ids = new Set();
    for (const job of jobs) {
      if (job?.project_id) ids.add(job.project_id);
    }
    return Array.from(ids).sort();
  }, [jobs]);

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
    <section className="iv-filterbar" aria-label="Interview scope filters" data-testid="interviews-org-filterbar">
      <div className="iv-field">
        <label htmlFor="iv-pillar-filter">Pillar</label>
        <select
          id="iv-pillar-filter"
          data-testid="interviews-pillar-filter"
          value={pillarId || ALL}
          onChange={(e) => handlePillarChange(e.target.value)}
        >
          <option value={ALL}>All pillars</option>
          {BUSINESS_ORG_PILLARS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="iv-field">
        <label htmlFor="iv-dept-filter">Department</label>
        <select
          id="iv-dept-filter"
          data-testid="interviews-dept-filter"
          value={departmentId || ALL}
          disabled={!pillarId}
          onChange={(e) => handleDepartmentChange(e.target.value)}
        >
          <option value={ALL}>{pillarId ? 'All departments' : 'Select pillar'}</option>
          {departmentOptions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      <div className="iv-field">
        <label htmlFor="iv-subdept-filter">Sub-dept</label>
        <select
          id="iv-subdept-filter"
          data-testid="interviews-subdept-filter"
          value={subDepartment || ALL}
          disabled={!departmentId}
          onChange={(e) => handleSubDepartmentChange(e.target.value)}
        >
          <option value={ALL}>{departmentId ? 'All sub-departments' : 'Select department'}</option>
          {subDepartmentOptions.map((sub) => (
            <option key={sub} value={sub}>
              {sub}
            </option>
          ))}
        </select>
      </div>

      <div className="iv-field">
        <label htmlFor="iv-project-filter">Project ID</label>
        <select
          id="iv-project-filter"
          data-testid="interviews-project-filter"
          value={projectId || ALL}
          disabled={projectOptions.length === 0}
          onChange={(e) => setProjectId(e.target.value)}
        >
          <option value={ALL}>{projectOptions.length ? 'All project IDs' : 'No projects'}</option>
          {projectOptions.map((pid) => (
            <option key={pid} value={pid}>
              {pid}
            </option>
          ))}
        </select>
      </div>

      <button type="button" className="iv-clear" onClick={clearAll} data-testid="interviews-clear-filters">
        Clear filters
      </button>
    </section>
  );
}
