import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { getTrainingDevelopmentNavChildren } from './navConfig';

const SECTION_PREFIX = {
  '/training-development/learning-ops': 'Learning Operations & Administration',
  '/training-development/capability': 'Capability Development & Employee Growth',
  '/training-development/intelligence': 'Intelligence, Analytics & Strategic Planning',
};

const TrainingDevelopmentSectionLanding = () => {
  const { pathname } = useLocation();
  const title = SECTION_PREFIX[pathname] || 'Training & Development';
  const all = getTrainingDevelopmentNavChildren();
  const section = all.find((x) => x.path === pathname && Array.isArray(x.children));
  const links = section?.children || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
          {title}
        </h1>
        <p className="text-slate-600 mt-1">Choose a module to open its workspace.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.path} to={item.path}>
              <Card className="h-full card-hover border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon className="w-5 h-5 text-indigo-600" />
                    {item.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-500">Open workspace →</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default TrainingDevelopmentSectionLanding;
