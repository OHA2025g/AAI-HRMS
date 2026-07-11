import React from 'react';

export default function ReferralsCommandHero({ canRefer, onSubmitClick }) {
  return (
    <header className="rf-title-row" data-testid="referrals-command-hero">
      <div>
        <h1 data-testid="referrals-heading">Referrals</h1>
        <p>Refer candidates, track submissions, and convert trusted talent faster.</p>
      </div>
      {canRefer ? (
        <button type="button" className="rf-primary-btn" onClick={onSubmitClick} data-testid="submit-referral-btn">
          ♧ Submit Referral
        </button>
      ) : null}
    </header>
  );
}
