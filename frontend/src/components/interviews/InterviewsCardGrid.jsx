import React from 'react';
import InterviewCommandCard from './InterviewCommandCard';

export default function InterviewsCardGrid({
  title,
  interviews,
  applicationMap,
  canManageInterviews,
  onFeedback,
  onCancel,
  emptyMessage,
}) {
  if (!interviews.length) {
    return (
      <div className="iv-empty" data-testid="interviews-empty-state">
        <h3>{title}</h3>
        <p>{emptyMessage || 'No interviews in this view yet.'}</p>
      </div>
    );
  }

  return (
    <>
      <h3 className="iv-section-title">{title}</h3>
      <section className="iv-interviews" data-testid="interviews-card-grid">
        {interviews.map((interview) => (
          <InterviewCommandCard
            key={interview.id}
            interview={interview}
            applicationMap={applicationMap}
            canManageInterviews={canManageInterviews}
            onFeedback={onFeedback}
            onCancel={onCancel}
          />
        ))}
      </section>
    </>
  );
}
