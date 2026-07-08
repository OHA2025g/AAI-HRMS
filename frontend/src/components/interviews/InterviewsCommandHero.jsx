import React from 'react';

export default function InterviewsCommandHero({ canManageInterviews, onScheduleClick }) {
  return (
    <header className="iv-page-head" data-testid="interviews-command-hero">
      <div>
        <h1 data-testid="interviews-heading">Interview Command Center</h1>
        <p>Schedule, monitor and improve interview conversion across active hiring pipelines.</p>
      </div>
      {canManageInterviews ? (
        <button
          type="button"
          className="iv-primary"
          onClick={onScheduleClick}
          data-testid="schedule-interview-btn"
        >
          ＋ Schedule Interview
        </button>
      ) : null}
    </header>
  );
}
