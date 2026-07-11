import React, { useMemo } from 'react';
import { usePlacementFilters } from '@/shared/context/PlacementFiltersContext';
import {
  BUSINESS_ORG_PILLARS,
  getDepartmentsForPillar,
  getSubDepartmentsForDepartment,
} from '@/data/businessOrgHierarchy';

const ALL = '';

export default function ReferralsOrgFilterBar({ jobs = [] }) {
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
    <section className="rf-filterbar" aria-label="Referral scope filters" data-testid="referrals-org-filterbar">
      <div className="rf-field">
        <label htmlFor="rf-pillar-filter">Pillar</label>
        <select
          id="rf-pillar-filter"
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
      <div className="rf-field">
        <label htmlFor="rf-dept-filter">Department</label>
        <select
          id="rf-dept-filter"
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
      <div className="rf-field">
        <label htmlFor="rf-subdept-filter">Sub-dept</label>
        <select
          id="rf-subdept-filter"
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
      <div className="rf-field">
        <label htmlFor="rf-project-filter">Project ID</label>
        <select
          id="rf-project-filter"
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
      <button type="button" className="rf-clear" onClick={clearAll} data-testid="referrals-clear-filters">
        Clear filters
      </button>
    </section>
  );
}
