import React from 'react';
import { Card, CardContent } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';

export function ChartSkeleton({ height = 280 }) {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-56" />
        <Skeleton className="rounded-lg w-full" style={{ height }} />
      </CardContent>
    </Card>
  );
}

export function KpiStripSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3" data-testid="assessments-kpi-skeleton">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-14" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AssessmentsWorkspaceSkeleton() {
  return (
    <div className="space-y-6" data-testid="assessments-workspace-skeleton">
      <p className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <span className="space-y-2 block">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-72" />
        </span>
        <Skeleton className="h-10 w-36" />
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-14" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-12 w-full rounded-lg" />
      <Skeleton className="h-10 w-full max-w-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ChartSkeleton height={300} />
        </div>
        <ChartSkeleton height={300} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    </div>
  );
}
