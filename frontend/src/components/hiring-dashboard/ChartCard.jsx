import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { cn } from '../../lib/utils';

/**
 * Shared chart card wrapper for Smart Hiring Dashboard (Phase 0.4).
 * Provides consistent title, optional header actions, and empty-state height.
 */
export default function ChartCard({
  title,
  headerRight,
  children,
  className,
  contentClassName,
  empty,
  emptyMessage = 'No data available',
  emptyHeight = 280,
  testId,
}) {
  return (
    <Card className={className} data-testid={testId}>
      {(title || headerRight) && (
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
          {title ? (
            <CardTitle className="text-lg font-semibold" style={{ fontFamily: 'Outfit' }}>
              {title}
            </CardTitle>
          ) : (
            <span />
          )}
          {headerRight}
        </CardHeader>
      )}
      <CardContent className={cn('pt-0', contentClassName)}>
        {empty ? (
          <div
            className="flex items-center justify-center text-sm text-slate-500"
            style={{ minHeight: emptyHeight }}
            data-testid={testId ? `${testId}-empty` : undefined}
          >
            {emptyMessage}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
