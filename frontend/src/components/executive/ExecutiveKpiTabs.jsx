import React from 'react';
import {
  Bot,
  Briefcase,
  FileBarChart,
  LayoutDashboard,
  Target,
  UserRound,
  Users,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { EXEC_TABS } from '../../config/executiveKpiConfig';
import { cn } from '@/lib/utils';

const TAB_ICONS = {
  summary: LayoutDashboard,
  workforce: Users,
  skills: Target,
  people: UserRound,
  hiring: Briefcase,
  automation: Bot,
  reports: FileBarChart,
};

export function ExecutiveKpiTabs({ value, onValueChange, presentationMode, children }) {
  return (
    <Tabs
      value={value}
      onValueChange={onValueChange}
      className="w-full"
      data-testid="executive-kpi-tabs"
    >
      <div className="executive-kpi-tab-shell rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 p-2 shadow-sm ring-1 ring-slate-900/[0.04]">
        <TabsList
          className={cn(
            'executive-kpi-tablist h-auto w-full bg-transparent p-0',
            'flex flex-nowrap items-stretch gap-1.5 overflow-x-auto',
            'lg:grid lg:grid-cols-7 lg:overflow-visible',
          )}
          aria-label="Executive KPI sections"
        >
          {EXEC_TABS.map((tab) => {
            const Icon = TAB_ICONS[tab.id] || LayoutDashboard;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                data-testid={`executive-tab-${tab.id}`}
                className={cn(
                  'group relative flex min-w-[6.75rem] flex-1 items-center justify-center gap-2 rounded-xl border border-transparent',
                  'px-3 py-2.5 text-sm font-medium text-slate-600 transition-all duration-200 ease-out',
                  'hover:border-slate-200/80 hover:bg-white hover:text-indigo-700 hover:shadow-sm',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/35 focus-visible:ring-offset-2',
                  'data-[state=active]:border-indigo-500/20 data-[state=active]:bg-gradient-to-br',
                  'data-[state=active]:from-indigo-600 data-[state=active]:via-indigo-600 data-[state=active]:to-violet-600',
                  'data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-indigo-500/30',
                  presentationMode && 'min-h-[3rem] px-4 py-3 text-base',
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0 transition-colors duration-200',
                    'text-slate-400 group-hover:text-indigo-500',
                    'group-data-[state=active]:text-white/95',
                    presentationMode && 'h-5 w-5',
                  )}
                  aria-hidden
                />
                <span className="truncate">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>
      {children}
    </Tabs>
  );
}
