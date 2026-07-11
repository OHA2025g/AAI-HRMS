import React, { useMemo } from 'react';
import { usePlacementFilters } from '@/shared/context/PlacementFiltersContext';
import {
  BUSINESS_ORG_PILLARS,
  getDepartmentsForPillar,
  getSubDepartmentsForDepartment,
} from '@/data/businessOrgHierarchy';
import { Button } from '@/shared/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';

const ALL = '__all__';

/**
 * Visible org/placement filters for Assessments Command Center (same scope as sidebar filters).
 */
export default function AssessmentPlacementFilterBar({ jobs = [] }) {
  const placement = usePlacementFilters();
  const { pillarId, departmentId, subDepartment, projectId } = placement;

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

  const activeCount = [pillarId, departmentId, subDepartment, projectId].filter(Boolean).length;

  return (
    <div
      className="relative z-0 flex flex-wrap items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/80"
      data-testid="assessment-org-filter-bar"
    >
      <span className="text-xs font-medium text-slate-600 mr-1">
        Org scope{activeCount ? ` (${activeCount} active)` : ''}:
      </span>
      <Select
        value={pillarId || ALL}
        onValueChange={(v) => {
          const next = v === ALL ? '' : v;
          placement.setPillarId(next);
          placement.setDepartmentId('');
          placement.setSubDepartment('');
          placement.setProjectId('');
        }}
      >
        <SelectTrigger className="w-full min-w-[10rem] h-9 bg-white" data-testid="assessment-pillar-filter">
          <SelectValue placeholder="Pillar" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All pillars</SelectItem>
          {BUSINESS_ORG_PILLARS.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={departmentId || ALL}
        onValueChange={(v) => {
          const next = v === ALL ? '' : v;
          placement.setDepartmentId(next);
          placement.setSubDepartment('');
          placement.setProjectId('');
        }}
        disabled={!pillarId}
      >
        <SelectTrigger className="w-full min-w-[10rem] h-9 bg-white" data-testid="assessment-department-filter">
          <SelectValue placeholder={pillarId ? 'Department' : 'Select pillar'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All departments</SelectItem>
          {departmentOptions.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={subDepartment || ALL}
        onValueChange={(v) => {
          const next = v === ALL ? '' : v;
          placement.setSubDepartment(next);
          placement.setProjectId('');
        }}
        disabled={!departmentId}
      >
        <SelectTrigger className="w-full min-w-[10rem] h-9 bg-white" data-testid="assessment-subdepartment-filter">
          <SelectValue placeholder={departmentId ? 'Sub-dept' : 'Select dept'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All sub-depts</SelectItem>
          {subDepartmentOptions.map((sub) => (
            <SelectItem key={sub} value={sub}>
              {sub}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={projectId || ALL}
        onValueChange={(v) => placement.setProjectId(v === ALL ? '' : v)}
        disabled={projectOptions.length === 0}
      >
        <SelectTrigger className="w-full min-w-[9rem] h-9 bg-white" data-testid="assessment-project-filter">
          <SelectValue placeholder={projectOptions.length ? 'Project' : 'No projects'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All projects</SelectItem>
          {projectOptions.map((pid) => (
            <SelectItem key={pid} value={pid}>
              {pid}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant="outline" size="sm" className="h-9" onClick={() => placement.clearAll()} data-testid="assessment-clear-org-filters">
        Clear
      </Button>
    </div>
  );
}
