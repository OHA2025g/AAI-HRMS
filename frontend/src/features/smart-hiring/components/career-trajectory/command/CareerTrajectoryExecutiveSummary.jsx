import React from 'react';
import { buildExecutiveChips } from '@/shared/lib/careerTrajectoryCommandUtils';

export default function CareerTrajectoryExecutiveSummary({ report }) {
  if (!report) return null;
  const chips = buildExecutiveChips(report);

  return (
    <section className="ct-card ct-summary" data-testid="career-traj-executive-summary">
      <h3>Executive summary</h3>
      <p className="ct-muted">{report.career_pattern || report.primary_archetype?.name || '—'}</p>
      <p>{report.executive_summary}</p>
      {chips.length ? (
        <div className="ct-chips">
          {chips.map((chip) => (
            <span key={chip.label} className={chip.className}>
              {chip.label}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
