import React from 'react';

const STEPS = [
  {
    num: 1,
    title: 'Submit candidate',
    text: 'Add contact, role preference, resume, and relationship context.',
  },
  {
    num: 2,
    title: 'AI fit analysis',
    text: 'Candidate is matched to open jobs using skills, title, and experience signals.',
  },
  {
    num: 3,
    title: 'Track pipeline',
    text: 'Monitor status from screening to offer and joining.',
  },
];

export default function ReferralsSideStack({ qualitySignals }) {
  const signals = qualitySignals || [];

  return (
    <aside className="rf-side-stack">
      <div className="rf-card">
        <div className="rf-section-title">
          <h2>How referrals work</h2>
        </div>
        <div className="rf-steps">
          {STEPS.map((step) => (
            <div key={step.num} className="rf-step">
              <div className="rf-step-num">{step.num}</div>
              <div>
                <b>{step.title}</b>
                <small>{step.text}</small>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rf-card">
        <div className="rf-section-title">
          <h2>Referral quality signals</h2>
        </div>
        <div className="rf-signals">
          {signals.map((sig) => (
            <div key={sig.label}>
              <b>{sig.label}</b>
              <div className="rf-progress">
                <i style={{ width: `${sig.pct}%` }} />
              </div>
              <small>{sig.sub}</small>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
