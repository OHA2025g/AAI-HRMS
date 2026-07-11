import React from 'react';

export default function ReferralsProgramBanner() {
  return (
    <section className="rf-hero" data-testid="referrals-program-banner">
      <div className="rf-gift" aria-hidden>
        🎁
      </div>
      <div>
        <h3>Employee Referral Program</h3>
        <p>
          Invite great candidates into active hiring pipelines. Referrals are automatically matched to open jobs,
          scored by AI fit, and tracked across stages.
        </p>
      </div>
      <div className="rf-reward">
        <small>Referral impact</small>
        <b>+18%</b>
        <small>higher conversion</small>
      </div>
    </section>
  );
}
