import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { BarChart3, FolderKanban, Link2, Scale, ArrowRight } from 'lucide-react';
import { Button } from '@/shared/ui/button';

const links = [
  {
    to: '/resource-optimization',
    title: 'Resource optimization',
    description: 'Utilization, bench, and staffing metrics (legacy RO workspace).',
    icon: BarChart3,
  },
  {
    to: '/workforce-intelligence/demand-supply',
    title: 'Demand vs supply (WFI)',
    description: 'Workforce Intelligence planning view for demand and supply balance.',
    icon: Scale,
  },
  {
    to: '/project-demands',
    title: 'Project demands',
    description: 'Open project staffing demands.',
    icon: FolderKanban,
  },
  {
    to: '/resource-project-optimization/allocation/dashboard',
    title: 'Allocation section',
    description: 'Allocation dashboard, requests, and fulfillment.',
    icon: Link2,
  },
];

export default function ResourceStaffingHubPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
          Resource & staffing hub
        </h1>
        <p className="text-slate-600 mt-1">
          One place to jump into optimization, workforce planning, project demands, and allocations. Canonical drill-downs remain in each module.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {links.map(({ to, title, description, icon: Icon }) => (
          <Card key={to} className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-indigo-50 p-2 text-indigo-700">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary" className="w-full sm:w-auto">
                <Link to={to}>
                  Open <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
