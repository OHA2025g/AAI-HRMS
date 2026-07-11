import React from 'react';
import { Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';

const INSIGHTS = [
  {
    icon: Sparkles,
    title: 'Auto-map columns',
    text: 'AI can map similar column names to required fields.',
  },
  {
    icon: AlertTriangle,
    title: 'Detect duplicate candidates',
    text: 'Match by email, phone and LinkedIn URL.',
  },
  {
    icon: CheckCircle2,
    title: 'Validate pipeline stages',
    text: 'Ensure stages match configured hiring workflow.',
  },
];

export default function BulkUploadAiPanel() {
  return (
    <div className="bu-card bu-ai-panel" data-testid="bulk-upload-ai-panel">
      <h2>AI Import Assistant</h2>
      <p className="bu-muted">Recommended checks before import.</p>
      {INSIGHTS.map(({ icon: Icon, title, text }) => (
        <div key={title} className="bu-insight">
          <div className="bu-insight-ico">
            <Icon aria-hidden />
          </div>
          <div>
            <b>{title}</b>
            <br />
            <small className="bu-muted">{text}</small>
          </div>
        </div>
      ))}
    </div>
  );
}
