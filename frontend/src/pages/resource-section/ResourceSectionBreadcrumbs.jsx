import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const ResourceSectionBreadcrumbs = ({ current, trail = [] }) => {
  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm text-slate-600 mb-4" aria-label="Breadcrumb">
      <Link to="/dashboard" className="inline-flex items-center gap-1 hover:text-indigo-600">
        <Home className="w-4 h-4" />
        Home
      </Link>
      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
      <span className="text-slate-500">Resource vs Project Optimization</span>
      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
      <Link to="/resource-project-optimization/resource/dashboard" className="hover:text-indigo-600">
        Resource Section
      </Link>
      {trail.map((t) => (
        <React.Fragment key={t.label}>
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          {t.path ? (
            <Link to={t.path} className="hover:text-indigo-600">
              {t.label}
            </Link>
          ) : (
            <span className="text-slate-500">{t.label}</span>
          )}
        </React.Fragment>
      ))}
      {current ? (
        <>
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="font-medium text-slate-900">{current}</span>
        </>
      ) : null}
    </nav>
  );
};

export default ResourceSectionBreadcrumbs;
