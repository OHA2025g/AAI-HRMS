import React, { useMemo, useState } from 'react';
import {
  buildGuidanceSections,
  categoryTopic,
  formatTimeframe,
  guidanceSectionMeta,
  ownerLabel,
  severityChipVariant,
} from '../../../lib/candidateDetailTrajectoryUtils';

function AccordionIcon({ type }) {
  if (type === 'recommendations') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    );
  }
  if (type === 'actions') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M4 12h16" />
        <path d="M4 6h16" />
        <path d="M4 18h16" />
      </svg>
    );
  }
  if (type === 'next') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M9 18 15 12 9 6" />
    </svg>
  );
}

function InsightCard({ insight, index, warn }) {
  const severity = insight.severity || 'info';
  const cardClass = warn ? 'warn' : severity === 'low' ? 'teal' : severity === 'high' ? 'blue' : '';

  return (
    <div className={`cdt-insight-card ${cardClass}`}>
      <div className="cdt-insight-glyph">
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M7 17 17 7" />
          <path d="M7 7h10v10" />
        </svg>
      </div>
      <div>
        <div className="cdt-insight-meta">
          <span className="cdt-index">{String(index + 1).padStart(2, '0')}</span>
          <span className={`cdt-chip cdt-chip-${severityChipVariant(severity)}`}>{severity}</span>
          <span className="cdt-topic">{categoryTopic(insight.category)}</span>
        </div>
        <h4>{insight.title}</h4>
        <p>{insight.summary}</p>
      </div>
    </div>
  );
}

function RecommendationBody({ recommendations }) {
  return recommendations.map((rec, i) => (
    <div key={rec.id || rec.title || i} className="cdt-insight-card blue">
      <div className="cdt-insight-glyph">
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M8 6h13M8 12h13M8 18h13" />
          <path d="M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
      </div>
      <div>
        <div className="cdt-insight-meta">
          <span className="cdt-index">{String(i + 1).padStart(2, '0')}</span>
          {rec.audience ? (
            <span className="cdt-chip cdt-chip-blue">{String(rec.audience).replace(/_/g, ' ')}</span>
          ) : null}
          <span className="cdt-topic">Follow-up</span>
        </div>
        <h4>{rec.title}</h4>
        <p>{rec.rationale || rec.detail}</p>
      </div>
    </div>
  ));
}

function ActionItemsBody({ actionItems }) {
  return (
    <div className="cdt-action-grid">
      {actionItems.map((act, i) => (
        <div key={act.id || act.title || i} className="cdt-action-item">
          <div className="cdt-check">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <div>
            <strong>{act.title}</strong>
            <span>
              Owner: {ownerLabel(act.owner_role)}
              {act.timeframe ? ` · Due: ${formatTimeframe(act.timeframe)}` : ''}
              {act.detail ? ` · ${act.detail}` : ''}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function NextStepsBody({ nextSteps }) {
  return nextSteps.map((step, i) => (
    <div key={i} className={`cdt-insight-card ${i === 0 ? 'teal' : ''}`}>
      <div className="cdt-insight-glyph">
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>
      <div>
        <div className="cdt-insight-meta">
          <span className="cdt-index">{String(i + 1).padStart(2, '0')}</span>
          <span className={`cdt-chip cdt-chip-${i === 0 ? 'teal' : 'purple'}`}>
            {i === 0 ? 'Next' : 'Report'}
          </span>
          <span className="cdt-topic">{i === 0 ? 'Validate' : 'Document'}</span>
        </div>
        <h4>{typeof step === 'string' ? step.slice(0, 48) : step.title || 'Next step'}</h4>
        <p>{typeof step === 'string' ? step : step.detail || step.title}</p>
      </div>
    </div>
  ));
}

export default function TrajectoryGuidanceAccordion({ phase2Report }) {
  const sections = useMemo(() => buildGuidanceSections(phase2Report), [phase2Report]);
  const meta = guidanceSectionMeta();
  const counts = {
    insights: sections.insights.length,
    recommendations: sections.recommendations.length,
    actionItems: sections.actionItems.length,
    nextSteps: sections.nextSteps.length,
  };

  const defaultOpen = useMemo(() => {
    if (counts.insights) return 'insights';
    if (counts.recommendations) return 'recommendations';
    if (counts.actionItems) return 'actionItems';
    if (counts.nextSteps) return 'nextSteps';
    return null;
  }, [counts]);

  const [openKey, setOpenKey] = useState(defaultOpen);

  const toggle = (key) => {
    setOpenKey((prev) => (prev === key ? null : key));
  };

  const hasAny = Object.values(counts).some((n) => n > 0);

  if (!hasAny) return null;

  const renderBody = (key) => {
    if (key === 'insights') {
      return sections.insights.map((ins, i) => (
        <InsightCard key={ins.id || ins.title || i} insight={ins} index={i} warn={ins.severity === 'medium'} />
      ));
    }
    if (key === 'recommendations') {
      return <RecommendationBody recommendations={sections.recommendations} />;
    }
    if (key === 'actionItems') {
      return <ActionItemsBody actionItems={sections.actionItems} />;
    }
    return <NextStepsBody nextSteps={sections.nextSteps} />;
  };

  return (
    <div data-testid="phase2-guidance-accordion">
      <div className="cdt-guidance-banner">
        <strong>
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M12 2l2.6 6.3L21 11l-6.4 2.7L12 20l-2.6-6.3L3 11l6.4-2.7L12 2z" />
          </svg>
          AI-generated hiring guidance — expand one section at a time.
        </strong>
        <span className="cdt-chip cdt-chip-purple">Structured recruiter view</span>
      </div>

      <div className="cdt-accordion-stack">
        {meta.map((section) => {
          const count = counts[section.key];
          if (!count) return null;
          const isOpen = openKey === section.key;
          return (
            <div
              key={section.key}
              className={`cdt-acc cdt-acc-${section.accent} ${isOpen ? 'open' : ''}`}
              data-testid={`phase2-${section.key.replace(/([A-Z])/g, '-$1').toLowerCase()}`}
            >
              <button
                type="button"
                className="cdt-acc-head"
                onClick={() => toggle(section.key)}
                aria-expanded={isOpen}
              >
                <div className="cdt-acc-title">
                  <div className={`cdt-acc-icon cdt-acc-icon-${section.accent}`}>
                    <AccordionIcon type={section.icon} />
                  </div>
                  <div>
                    <h3>
                      {section.title} <span className="cdt-badge-count">{count}</span>
                    </h3>
                    <p>{section.description}</p>
                  </div>
                </div>
                <svg className="cdt-chevron" viewBox="0 0 24 24" aria-hidden>
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {isOpen ? <div className="cdt-acc-body">{renderBody(section.key)}</div> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
