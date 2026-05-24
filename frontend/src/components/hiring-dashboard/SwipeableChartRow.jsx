import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Horizontal swipe row for chart pairs on mobile (Phase 6.4).
 * On md+ screens children render in a normal grid via className on parent.
 */
export default function SwipeableChartRow({ children, className, testId }) {
  const items = React.Children.toArray(children).filter(Boolean);

  return (
    <>
      <div
        className={cn(
          'md:hidden flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1',
          'scrollbar-thin scrollbar-thumb-slate-200'
        )}
        data-testid={testId ? `${testId}-mobile` : 'swipeable-chart-row-mobile'}
        role="region"
        aria-label="Swipeable charts"
      >
        {items.map((child, index) => (
          <div
            key={index}
            className="min-w-[88vw] sm:min-w-[75vw] snap-center shrink-0"
          >
            {child}
          </div>
        ))}
      </div>
      <div className={cn('hidden md:grid gap-6', className || 'grid-cols-1 lg:grid-cols-2')} data-testid={testId}>
        {items}
      </div>
    </>
  );
}
