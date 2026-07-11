import React from 'react';
import ChartCard from './ChartCard';
import { Badge } from '@/shared/ui/badge';

export default {
  title: 'Hiring Dashboard/ChartCard',
  component: ChartCard,
};

export const WithChart = {
  render: () => (
    <ChartCard
      title="Sample chart"
      headerRight={<Badge variant="outline">Live</Badge>}
      testId="story-chart-card"
    >
      <div className="h-40 flex items-center justify-center bg-slate-50 rounded-lg text-slate-500 text-sm">
        Chart content area
      </div>
    </ChartCard>
  ),
};

export const Empty = {
  render: () => (
    <ChartCard title="Empty chart" empty emptyMessage="No data for this period" testId="story-empty-chart" />
  ),
};
