import React from 'react';
import { cn } from '@/shared/lib/utils';

export default function DashboardGlassCard({ className, children, ...props }) {
  return (
    <div className={cn('hd-glass-card p-5', className)} {...props}>
      {children}
    </div>
  );
}
