import React from 'react';

const CHECKS = [
  {
    title: 'Template structure verified',
    text: 'Candidate import template and worksheet layout are supported.',
  },
  {
    title: 'Mandatory fields identified',
    text: 'Full name and email or phone are required for each row.',
  },
  {
    title: 'Rollback enabled',
    text: 'The import batch can be reviewed and reversed if needed.',
  },
];

export default function BulkUploadChecklist() {
  return (
    <div className="bu-card" data-testid="bulk-upload-checklist">
      <h2>Pre-import Checklist</h2>
      <div className="bu-checklist">
        {CHECKS.map((item) => (
          <div key={item.title} className="bu-check">
            <i aria-hidden>✓</i>
            <div>
              <b>{item.title}</b>
              <br />
              <span className="bu-muted">{item.text}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
