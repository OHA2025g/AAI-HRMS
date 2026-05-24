import React from 'react';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { BUSINESS_ORG_PILLARS } from '../../data/businessOrgHierarchy';

const ALL = '__ALL__';

/**
 * Pillar / department / sub-dept / project filters shared by desktop header and mobile sheet.
 */
export default function PlacementHeaderFilters({
  pillarId,
  departmentId,
  subDepartment,
  projectId,
  departmentOptions = [],
  subDepartmentOptions = [],
  projectOptions = [],
  onPillarChange,
  onDepartmentChange,
  onSubDepartmentChange,
  onProjectChange,
  onClearAll,
  layout = 'inline',
}) {
  const isStacked = layout === 'stacked';

  const wrap = (child) =>
    isStacked ? (
      <div className="space-y-1 w-full">{child}</div>
    ) : (
      child
    );

  return (
    <div
      className={
        isStacked
          ? 'flex flex-col gap-3 w-full'
          : 'flex items-center gap-2 min-w-0 flex-wrap'
      }
    >
      {wrap(
        <>
          {!isStacked ? null : <p className="text-xs font-medium text-slate-500">Pillar</p>}
          <Select
            value={pillarId || ALL}
            onValueChange={(v) => onPillarChange(v === ALL ? '' : v)}
          >
            <SelectTrigger className={isStacked ? 'w-full' : 'w-44'} data-testid="pipeline-pillar-filter">
              <SelectValue placeholder="Pillar (All)" />
            </SelectTrigger>
            <SelectContent className="max-h-[min(60vh,420px)]">
              <SelectItem value={ALL}>All</SelectItem>
              {BUSINESS_ORG_PILLARS.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}

      {wrap(
        <>
          {!isStacked ? null : <p className="text-xs font-medium text-slate-500">Department</p>}
          <Select
            value={departmentId || ALL}
            onValueChange={(v) => onDepartmentChange(v === ALL ? '' : v)}
            disabled={!pillarId}
          >
            <SelectTrigger className={isStacked ? 'w-full' : 'w-44'} data-testid="pipeline-department-filter">
              <SelectValue placeholder={pillarId ? 'Department (All)' : 'Dept (select pillar)'} />
            </SelectTrigger>
            <SelectContent className="max-h-[min(60vh,420px)]">
              <SelectItem value={ALL}>All</SelectItem>
              {departmentOptions.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}

      {wrap(
        <>
          {!isStacked ? null : <p className="text-xs font-medium text-slate-500">Sub-department</p>}
          <Select
            value={subDepartment || ALL}
            onValueChange={(v) => onSubDepartmentChange(v === ALL ? '' : v)}
            disabled={!departmentId}
          >
            <SelectTrigger className={isStacked ? 'w-full' : 'w-52'} data-testid="pipeline-subdepartment-filter">
              <SelectValue placeholder={departmentId ? 'Sub-dept (All)' : 'Sub-dept (select dept)'} />
            </SelectTrigger>
            <SelectContent className="max-h-[min(60vh,420px)]">
              <SelectItem value={ALL}>All</SelectItem>
              {subDepartmentOptions.map((sub) => (
                <SelectItem key={sub} value={sub}>
                  {sub}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}

      {wrap(
        <>
          {!isStacked ? null : <p className="text-xs font-medium text-slate-500">Project</p>}
          <Select
            value={projectId || ALL}
            onValueChange={(v) => onProjectChange(v === ALL ? '' : v)}
            disabled={projectOptions.length === 0}
          >
            <SelectTrigger className={isStacked ? 'w-full' : 'w-36'} data-testid="pipeline-projectid-filter">
              <SelectValue placeholder={projectOptions.length > 0 ? 'Project (All)' : 'Project (none)'} />
            </SelectTrigger>
            <SelectContent className="max-h-[min(60vh,420px)]">
              <SelectItem value={ALL}>All</SelectItem>
              {projectOptions.map((pid) => (
                <SelectItem key={pid} value={pid}>
                  {pid}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}

      <Button
        variant="outline"
        size="sm"
        className={isStacked ? 'w-full h-9' : 'h-9'}
        data-testid="clear-placement-filters"
        onClick={onClearAll}
      >
        Clear filters
      </Button>
    </div>
  );
}
