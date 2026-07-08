import React from 'react';
import { buildMetricCards } from '../../../lib/careerTrajectoryCommandUtils';

export default function CareerTrajectoryMetricsGrid({ scores, onExplain }) {
  const cards = buildMetricCards(scores);

  return (
    <section className="ct-metrics" data-testid="career-traj-metrics-grid">
      {cards.map((card) => (
        <div key={card.key} className="ct-metric">
          <h4>{card.label}</h4>
          <div className="ct-num">{card.score}</div>
          <p className="ct-muted">{card.description}</p>
          {card.confidence ? <small>{card.confidence}</small> : null}
          {onExplain ? (
            <button
              type="button"
              className="ct-explain-link"
              onClick={() => onExplain(card.label, card.scoreData)}
            >
              View explainability
            </button>
          ) : null}
        </div>
      ))}
    </section>
  );
}
