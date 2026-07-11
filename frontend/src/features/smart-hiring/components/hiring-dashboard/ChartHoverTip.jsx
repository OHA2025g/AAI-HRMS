import React from 'react';
import { cn } from '@/shared/lib/utils';

/** CSS hover tooltip wrapper for static dashboard bars and cells. */
export default function ChartHoverTip({
  tip,
  children,
  className,
  as: Component = 'span',
  ...rest
}) {
  if (!tip) {
    return children;
  }

  return (
    <Component className={cn('chart-hover-tip', className)} tabIndex={0} {...rest}>
      {children}
      <span className="chart-hover-tip__popup" role="tooltip">
        {tip}
      </span>
    </Component>
  );
}
