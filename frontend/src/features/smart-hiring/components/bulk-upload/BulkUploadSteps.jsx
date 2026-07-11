import React from 'react';
import { mockStepFromWizardStep } from '@/shared/lib/bulkUploadUtils';

const STEPS = [
  { n: 1, title: 'Upload', hint: 'Select workbook' },
  { n: 2, title: 'Preview', hint: 'Check records' },
  { n: 3, title: 'Import', hint: 'Commit data' },
];

export default function BulkUploadSteps({ wizardStep }) {
  const active = mockStepFromWizardStep(wizardStep);

  return (
    <div className="bu-card" data-testid="bulk-upload-steps">
      <div className="bu-steps">
        {STEPS.map((step) => (
          <div
            key={step.n}
            className={`bu-step ${active === step.n ? 'active' : ''}`}
            data-testid={`bulk-upload-step-${step.n}`}
          >
            <div className="bu-step-n">{step.n}</div>
            <b>{step.title}</b>
            <small className="bu-muted">{step.hint}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
