import React, { useMemo } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { getEmployeeSatisfactionEngagementNavChildren } from './navConfig';

function findTrail(pathname) {
  const groups = getEmployeeSatisfactionEngagementNavChildren();
  for (const g of groups) {
    for (const c of g.children || []) {
      if (c.path === pathname) {
        return [
          { label: 'Employee Satisfaction & Engagement', path: '/employee-satisfaction-engagement/dashboard' },
          { label: g.label, path: '/employee-satisfaction-engagement/dashboard' },
          { label: c.label, path: c.path },
        ];
      }
    }
  }
  return [
    { label: 'Employee Satisfaction & Engagement', path: '/employee-satisfaction-engagement/dashboard' },
    { label: 'Workspace', path: pathname },
  ];
}

export default function EmployeeSatisfactionEngagementLayout() {
  const { pathname } = useLocation();
  const crumbs = useMemo(() => findTrail(pathname), [pathname]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center text-sm text-muted-foreground gap-1">
        {crumbs.map((c, i) => (
          <React.Fragment key={`${c.path}-${i}`}>
            {i > 0 ? <ChevronRight className="h-4 w-4 shrink-0" /> : null}
            <Link to={c.path} className="hover:text-foreground truncate max-w-[220px]">
              {c.label}
            </Link>
          </React.Fragment>
        ))}
      </div>
      <Outlet />
    </div>
  );
}
