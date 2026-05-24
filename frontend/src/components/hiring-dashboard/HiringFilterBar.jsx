import React, { useEffect, useState } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

const ALL_JOBS = '__ALL_JOBS__';
const ALL_OWNERS = '__ALL_OWNERS__';

export default function HiringFilterBar({
  scope,
  department,
  jobId,
  ownerId,
  jobs = [],
  owners = [],
  onScopeChange,
  onDepartmentChange,
  onJobIdChange,
  onOwnerIdChange,
  disabled,
}) {
  const [localDepartment, setLocalDepartment] = useState(department || '');
  const useJobPicker = Array.isArray(jobs) && jobs.length > 0;
  const useOwnerPicker = Array.isArray(owners) && owners.length > 0;

  useEffect(() => {
    setLocalDepartment(department || '');
  }, [department]);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-full sm:w-40">
        <Label className="text-xs text-slate-500 mb-1 block">Scope</Label>
        <Select value={scope} onValueChange={onScopeChange} disabled={disabled}>
          <SelectTrigger className="h-9" data-testid="hiring-scope-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All jobs</SelectItem>
            <SelectItem value="mine">My jobs</SelectItem>
            <SelectItem value="my_department">My department</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="w-full sm:w-52">
        <Label className="text-xs text-slate-500 mb-1 block">Department</Label>
        <Input
          className="h-9"
          placeholder="e.g. Engineering"
          value={localDepartment}
          onChange={(e) => setLocalDepartment(e.target.value)}
          onBlur={() => onDepartmentChange(localDepartment)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onDepartmentChange(localDepartment);
          }}
          disabled={disabled || scope === 'my_department'}
          data-testid="hiring-department-filter"
        />
      </div>
      <div className="w-full sm:w-56">
        <Label className="text-xs text-slate-500 mb-1 block">Job</Label>
        {useJobPicker ? (
          <Select
            value={jobId || ALL_JOBS}
            onValueChange={(v) => onJobIdChange(v === ALL_JOBS ? '' : v)}
            disabled={disabled}
          >
            <SelectTrigger className="h-9" data-testid="hiring-job-filter">
              <SelectValue placeholder="All jobs" />
            </SelectTrigger>
            <SelectContent className="max-h-[min(60vh,360px)]">
              <SelectItem value={ALL_JOBS}>All jobs</SelectItem>
              {jobs.map((job) => (
                <SelectItem key={job.id} value={job.id}>
                  {job.title || job.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            className="h-9 font-mono text-xs"
            placeholder="Optional job UUID"
            value={jobId || ''}
            onChange={(e) => onJobIdChange(e.target.value)}
            disabled={disabled}
            data-testid="hiring-job-id-filter"
          />
        )}
      </div>
      <div className="w-full sm:w-52">
        <Label className="text-xs text-slate-500 mb-1 block">Owner</Label>
        {useOwnerPicker ? (
          <Select
            value={ownerId || ALL_OWNERS}
            onValueChange={(v) => onOwnerIdChange(v === ALL_OWNERS ? '' : v)}
            disabled={disabled || scope === 'mine'}
          >
            <SelectTrigger className="h-9" data-testid="hiring-owner-filter">
              <SelectValue placeholder="All owners" />
            </SelectTrigger>
            <SelectContent className="max-h-[min(60vh,360px)]">
              <SelectItem value={ALL_OWNERS}>All owners</SelectItem>
              {owners.map((owner) => (
                <SelectItem key={owner.id} value={owner.id}>
                  {owner.label || owner.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            className="h-9 font-mono text-xs"
            placeholder={scope === 'mine' ? 'Current user' : 'Optional owner UUID'}
            value={ownerId || ''}
            onChange={(e) => onOwnerIdChange(e.target.value)}
            disabled={disabled || scope === 'mine'}
            data-testid="hiring-owner-id-filter"
          />
        )}
      </div>
    </div>
  );
}
