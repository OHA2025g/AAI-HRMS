import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

const crumbsFor = (pathname) => {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'training-development') return [];
  const tail = parts.slice(1).join(' / ') || 'home';
  return [
    { to: '/dashboard', label: 'Home' },
    { to: '/training-development/dashboard', label: 'Training & Development' },
    { to: pathname, label: tail.replace(/-/g, ' ') },
  ];
};

const TrainingDevelopmentLayout = () => {
  const { pathname } = useLocation();
  const crumbs = crumbsFor(pathname);

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-slate-600" aria-label="Breadcrumb">
        {crumbs.map((c, i) => (
          <span key={`${c.to}-${i}`} className="flex items-center gap-1">
            {i > 0 ? <span className="text-slate-400">/</span> : null}
            {i === crumbs.length - 1 ? (
              <span className="text-slate-900 font-medium capitalize">{c.label}</span>
            ) : (
              <Link to={c.to} className="hover:text-indigo-600 capitalize">
                {c.label}
              </Link>
            )}
          </span>
        ))}
      </nav>
      <Outlet />
    </div>
  );
};

export default TrainingDevelopmentLayout;
