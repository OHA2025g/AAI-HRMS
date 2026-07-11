import React from 'react';
import { Skeleton } from '@/shared/ui/skeleton';

export function ExecutiveSectionSkeleton({ height = 220 }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="rounded-lg" style={{ height }} />
    </div>
  );
}
