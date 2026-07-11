import React, { useMemo } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { getEmployeeLifecycleNavChildren } from './navConfig';

const flatten = (nodes) => {
  const out = [];
  const walk = (n) => {
    if (!n) return;
    if (Array.isArray(n)) return n.forEach(walk);
    if (n.path) out.push({ path: n.path, label: n.label });
    if (n.children) walk(n.children);
  };
  walk(nodes);
  return out;
};

export default function EmployeeLifecycleManagementLayout() {
  const { pathname } = useLocation();
  const routes = useMemo(() => flatten(getEmployeeLifecycleNavChildren()), []);
  const current = useMemo(() => routes.find((r) => r.path === pathname), [routes, pathname]);

  const crumbs = useMemo(() => {
    if (!current) return [{ label: 'Employee Lifecycle Management', path: '/employee-lifecycle-management/dashboard' }];
    return [
      { label: 'Employee Lifecycle Management', path: '/employee-lifecycle-management/dashboard' },
      { label: current.label, path: current.path },
    ];
  }, [current]);

  return (
    <div className="space-y-4">
      <div className="flex items-center text-sm text-muted-foreground gap-1">
        {crumbs.map((c, i) => (
          <React.Fragment key={c.path}>
            <Link to={c.path} className="hover:text-foreground">
              {c.label}
            </Link>
            {i < crumbs.length - 1 ? <ChevronRight className="h-4 w-4" /> : null}
          </React.Fragment>
        ))}
      </div>
      <Outlet />
    </div>
  );
}

