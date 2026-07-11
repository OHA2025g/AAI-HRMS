import React from 'react';
import KpiTile, { HealthStrip } from './KpiTile';
import { Briefcase } from 'lucide-react';

export default {
  title: 'Hiring Dashboard/KpiTile',
  component: KpiTile,
};

export const Default = {
  render: () => (
    <div className="max-w-xs">
      <KpiTile
        label="Open jobs"
        value={42}
        deltaPct={5.2}
        subtitle="141 total"
        icon={Briefcase}
        iconClassName="bg-indigo-100 text-indigo-600"
        sparkline={[38, 40, 39, 41, 42]}
      />
    </div>
  ),
};

export const HealthStripWithAlerts = {
  render: () => (
    <HealthStrip
      score={68}
      status="watch"
      asOf={new Date().toISOString()}
      windowDays={30}
      topAlerts={[
        { id: 'a1', severity: 'warning', title: '8 reqs open > 60 days', action_path: '/jobs?status=OPEN' },
        { id: 'a2', severity: 'critical', title: '12 stuck in SCREENING', action_path: '/pipeline?stage=SCREENING' },
      ]}
    />
  ),
};
