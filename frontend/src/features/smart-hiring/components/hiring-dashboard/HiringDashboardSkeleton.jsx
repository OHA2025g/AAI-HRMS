import React from 'react';
import { Card, CardContent } from '@/shared/ui/card';
import { Loader2 } from 'lucide-react';

export default function HiringDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between">
        <div className="h-10 w-48 bg-slate-200 rounded" />
        <div className="h-10 w-32 bg-slate-200 rounded" />
      </div>
      <Card>
        <CardContent className="p-6 h-24 bg-slate-100" />
      </Card>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="p-5 h-28 bg-slate-100" />
          </Card>
        ))}
      </div>
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    </div>
  );
}
