import React, { useMemo } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { getEmployeeSatisfactionEngagementNavChildren } from './navConfig';

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

export default function EmployeeSatisfactionEngagementLayout() {
  const { pathname } = useLocation();
  const routes = useMemo(() => flatten(getEmployeeSatisfactionEngagementNavChildren()), []);
  const current = useMemo(() => routes.find((r) => r.path === pathname), [routes, pathname]);

  const crumbs = useMemo(() => {
    if (!current) {
      return [{ label: 'Employee Satisfaction & Engagement', path: '/employee-satisfaction-engagement/dashboard' }];
    }
    return [
      { label: 'Employee Satisfaction & Engagement', path: '/employee-satisfaction-engagement/dashboard' },
      { label: current.label, path: current.path },
    ];
  }, [current]);

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-slate-600" aria-label="Breadcrumb">
        {crumbs.map((c, i) => (
          <span key={`${c.path}-${i}`} className="flex items-center gap-1">
            {i > 0 ? <span className="text-slate-400">/</span> : null}
            {i === crumbs.length - 1 ? (
              <span className="text-slate-900 font-medium">{c.label}</span>
            ) : (
              <Link to={c.path} className="hover:text-indigo-600">
                {c.label}
              </Link>
            )}
          </span>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
