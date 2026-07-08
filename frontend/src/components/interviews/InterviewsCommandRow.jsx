import React from 'react';
import {
  buildAiRecommendations,
  formatScheduleRowDate,
  getScheduleRowTag,
  getUpcomingScheduleRows,
} from '../../lib/interviewsCommandUtils';

function tagClassName(variant) {
  if (variant === 'warn') return 'iv-tag iv-tag-warn';
  if (variant === 'good') return 'iv-tag iv-tag-good';
  return 'iv-tag';
}

export default function InterviewsCommandRow({ interviews, applicationMap }) {
  const recommendations = buildAiRecommendations(interviews, applicationMap);
  const scheduleRows = getUpcomingScheduleRows(interviews, applicationMap);

  return (
    <section className="iv-command" data-testid="interviews-command-row">
      <div className="iv-card iv-ai-card">
        <h3>🧠 AI Interview Recommendations</h3>
        <div className="iv-ai-grid">
          {recommendations.map((item) => (
            <div key={item.title} className="iv-ai-item">
              <b>{item.title}</b>
              <span>{item.body}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="iv-card">
        <h3>Today & Next 7 Days</h3>
        {scheduleRows.length ? (
          scheduleRows.map((interview) => {
            const tag = getScheduleRowTag(interview, applicationMap);
            return (
              <div key={interview.id} className="iv-schedule-row">
                <div>
                  <b>{interview.candidate?.full_name || 'Candidate'}</b>
                  <br />
                  <small>{formatScheduleRowDate(interview)}</small>
                </div>
                <span className={tagClassName(tag.variant)}>{tag.label}</span>
              </div>
            );
          })
        ) : (
          <div className="iv-schedule-row">
            <div>
              <b>No upcoming interviews</b>
              <br />
              <small>Schedule interviews to populate this view.</small>
            </div>
            <span className="iv-tag">—</span>
          </div>
        )}
      </div>
    </section>
  );
}
