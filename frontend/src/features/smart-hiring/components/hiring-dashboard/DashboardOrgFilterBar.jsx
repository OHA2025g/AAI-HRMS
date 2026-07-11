import React from 'react';
import {
  ORG_FILTER_ALL,
  orgFilterChangeValue,
  orgFilterSelectValue,
  withSelectedOrgOption,
} from './dashboardOrgFilterUtils';

export default function DashboardOrgFilterBar({
  filterOptions,
  pillar,
  department,
  subDepartment,
  projectId,
  onPillarChange,
  onDepartmentChange,
  onSubDepartmentChange,
  onProjectIdChange,
  onClear,
  disabled,
}) {
  const opts = filterOptions || {};

  const renderSelect = (list, value, onChange, label, placeholder, testId) => {
    const options = withSelectedOrgOption(list, value);
    const selectValue = orgFilterSelectValue(value);

    return (
      <div className="filter-field">
        <label htmlFor={testId}>{label}</label>
        <select
          id={testId}
          data-testid={testId}
          className="hd-org-filter-select"
          value={selectValue}
          disabled={disabled}
          onChange={(e) => onChange(orgFilterChangeValue(e.target.value))}
        >
          <option value={ORG_FILTER_ALL}>{placeholder}</option>
          {options.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <section className="filterbar" aria-label="Dashboard filters">
      {renderSelect(opts.pillars, pillar, onPillarChange, 'Pillar', 'All pillars', 'hiring-pillar-filter')}
      {renderSelect(opts.departments, department, onDepartmentChange, 'Department', 'All departments', 'hiring-dept-filter')}
      {renderSelect(opts.sub_departments, subDepartment, onSubDepartmentChange, 'Sub-dept', 'All sub-departments', 'hiring-subdept-filter')}
      {renderSelect(opts.project_ids, projectId, onProjectIdChange, 'Project ID', 'All project IDs', 'hiring-project-filter')}
      <button type="button" className="clear-filter" onClick={onClear} disabled={disabled}>
        Clear filters
      </button>
    </section>
  );
}
