import React from 'react';
import { TabsList, TabsTrigger } from '../ui/tabs';
import { cn } from '../../lib/utils';

export const DASHBOARD_TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'pipeline', label: 'Pipeline' },
  { value: 'offers', label: 'Offers' },
  { value: 'interviews', label: 'Interviews' },
  { value: 'signals', label: 'Signals' },
  { value: 'analytics', label: 'Analytics' },
];

/** Tab bar for Smart Hiring Dashboard (must be rendered inside `<Tabs>`). */
export default function DashboardSectionNav({ className }) {
  return (
    <TabsList
      aria-label="Dashboard sections"
      className={cn(
        'sticky top-0 z-[90] h-auto w-full justify-start gap-1 overflow-x-auto rounded-lg bg-slate-100/90 p-1 backdrop-blur',
        className
      )}
      data-testid="dashboard-tabs"
    >
      {DASHBOARD_TABS.map((tab) => (
        <TabsTrigger
          key={tab.value}
          value={tab.value}
          className="shrink-0 px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
        >
          {tab.label}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}

export { DASHBOARD_TABS as DASHBOARD_SECTION_IDS };
