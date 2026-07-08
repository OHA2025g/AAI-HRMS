import React from 'react';

export default function CandidateAssessmentLifecycleStepper({ steps = [] }) {
  return (
    <div className="cdas-journey" data-testid="assessment-lifecycle-stepper">
      <h5>Assessment lifecycle</h5>
      <div className="cdas-steps">
        {steps.map((step) => (
          <div key={step.key} className={`cdas-step ${step.state}`} data-testid={`lifecycle-step-${step.key}`}>
            <div className="cdas-step-dot">{step.state === 'done' ? '✓' : step.index}</div>
            <strong>{step.label}</strong>
            <span>{step.hint}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
