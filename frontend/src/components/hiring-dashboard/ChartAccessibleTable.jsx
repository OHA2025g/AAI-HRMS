import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Accessible tabular fallback for Recharts visualizations (Phase 6.3).
 * Visible "View data as table" toggle plus always-present sr-only table for screen readers.
 */
export default function ChartAccessibleTable({ caption, columns = [], rows = [], className }) {
  if (!rows?.length || !columns?.length) return null;

  return (
    <>
      <table className="sr-only" aria-label={caption}>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} scope="col">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.id ?? idx}>
              {columns.map((col) => (
                <td key={col.key}>{row[col.key] ?? '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <details className={cn('mt-3 border-t border-slate-100 pt-2', className)}>
        <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700 select-none">
          View data as table
        </summary>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-xs text-left border-collapse" aria-label={`${caption} (expanded)`}>
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                {columns.map((col) => (
                  <th key={col.key} scope="col" className="py-1.5 pr-3 font-medium">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.id ?? idx} className="border-b border-slate-100 last:border-0">
                  {columns.map((col) => (
                    <td key={col.key} className="py-1.5 pr-3 text-slate-800">
                      {row[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
