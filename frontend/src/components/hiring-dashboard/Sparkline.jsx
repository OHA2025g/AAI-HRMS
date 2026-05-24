import React from 'react';

/** Minimal SVG sparkline for KPI tiles (Phase 5.6). */
export default function Sparkline({ values = [], stroke = '#6366F1', className = '' }) {
  const nums = (values || [])
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));
  if (nums.length < 2) return null;

  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;
  const width = 72;
  const height = 22;
  const points = nums
    .map((v, i) => {
      const x = (i / (nums.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 2) - 1;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      width={width}
      height={height}
      className={className}
      aria-hidden
      data-testid="kpi-sparkline"
    >
      <polyline fill="none" stroke={stroke} strokeWidth="1.75" strokeLinejoin="round" points={points} />
    </svg>
  );
}
