import React from 'react';
import { buildQuickInsightCards } from '@/shared/lib/candidateDetailTrajectoryUtils';

function QuickIcon({ type }) {
  if (type === 'bolt') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M13 2 3 14h9l-1 8 10-12h-9Z" />
      </svg>
    );
  }
  if (type === 'alert') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
    );
  }
  if (type === 'user') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M16 21v-2a4 4 0 0 0-8 0v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M12 20V10" />
      <path d="M18 20V4" />
      <path d="M6 20v-6" />
    </svg>
  );
}

export default function TrajectoryQuickInsights({ report, phase2Report }) {
  const cards = buildQuickInsightCards(report, phase2Report);

  return (
    <div className="cdt-panel cdt-quick-actions" data-testid="trajectory-quick-insights">
      {cards.map((card) => (
        <div key={card.key} className="cdt-quick-card">
          <div className={`cdt-quick-icon cdt-quick-icon-${card.tone}`}>
            <QuickIcon type={card.icon} />
          </div>
          <div>
            <strong>{card.title}</strong>
            <span>{card.text}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
