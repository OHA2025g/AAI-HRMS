import React, { useEffect, useState } from 'react';
import { Bell, ChevronDown } from 'lucide-react';
import { useAuth } from '@/shared/context/AuthContext';
import { usePlacementFilters } from '@/shared/context/PlacementFiltersContext';
import { notificationsApi } from '@/shared/lib/api';
import {
  BUSINESS_ORG_PILLARS,
  getDepartmentsForPillar,
  getSubDepartmentsForDepartment,
} from '@/data/businessOrgHierarchy';

function getInitials(name) {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function FilterPill({ className = '', value, onChange, disabled, children }) {
  return (
    <div className={`cj-filter-pill ${className}`.trim()}>
      <select value={value} onChange={onChange} disabled={disabled} aria-label={children}>
        {children}
      </select>
      <ChevronDown aria-hidden />
    </div>
  );
}

export default function CreateJobCommandTopbar() {
  const { user } = useAuth();
  const placement = usePlacementFilters();
  const [unreadCount, setUnreadCount] = useState(0);

  const pillarId = placement.pillarId || '';
  const departmentId = placement.departmentId || '';
  const subDepartment = placement.subDepartment || '';
  const projectId = placement.projectId || '';

  const departmentOptions = pillarId ? getDepartmentsForPillar(pillarId) : [];
  const subDepartmentOptions =
    pillarId && departmentId ? getSubDepartmentsForDepartment(pillarId, departmentId) : [];

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await notificationsApi.getUnreadCount();
        if (alive) setUnreadCount(res.data.unread_count || 0);
      } catch {
        if (alive) setUnreadCount(0);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const onPillar = (e) => {
    const next = e.target.value;
    placement.setPillarId(next);
    placement.setDepartmentId('');
    placement.setSubDepartment('');
    placement.setProjectId('');
  };

  const onDepartment = (e) => {
    const next = e.target.value;
    placement.setDepartmentId(next);
    placement.setSubDepartment('');
    placement.setProjectId('');
  };

  return (
    <header className="cj-topbar">
      <div className="cj-page-title">
        <h2>Jobs</h2>
      </div>
      <div className="cj-filters" aria-label="Global filters">
        <FilterPill value={pillarId} onChange={onPillar}>
          <option value="">All</option>
          {BUSINESS_ORG_PILLARS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </FilterPill>
        <FilterPill value={departmentId} onChange={onDepartment} disabled={!pillarId}>
          <option value="">{pillarId ? 'All' : 'All'}</option>
          {departmentOptions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </FilterPill>
        <FilterPill
          value={subDepartment}
          onChange={(e) => {
            placement.setSubDepartment(e.target.value);
            placement.setProjectId('');
          }}
          disabled={!departmentId}
        >
          <option value="">{departmentId ? 'All' : 'All'}</option>
          {subDepartmentOptions.map((sub) => (
            <option key={sub} value={sub}>
              {sub}
            </option>
          ))}
        </FilterPill>
        <FilterPill
          className="small"
          value={projectId}
          onChange={(e) => placement.setProjectId(e.target.value)}
        >
          <option value="">All</option>
          {projectId ? (
            <option value={projectId}>{projectId}</option>
          ) : null}
        </FilterPill>
        <button type="button" className="cj-clear-btn" onClick={placement.clearAll}>
          Clear filters
        </button>
      </div>
      <div className="cj-top-actions">
        <button type="button" className="cj-bell" aria-label="Notifications">
          <Bell size={20} strokeWidth={2} />
          {unreadCount > 0 ? (
            <span className="cj-bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
          ) : null}
        </button>
        <div className="cj-avatar">{getInitials(user?.full_name)}</div>
        <div className="cj-admin">{user?.full_name || 'User'}</div>
      </div>
    </header>
  );
}
