import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Users } from 'lucide-react';
import { applicationActivityPath } from '@/shared/lib/hiringDashboardDrill';

export default function RecentActivityFeed({ activities = [] }) {
  return (
    <div className="card analytics-recent-activity-card" data-testid="recent-activity-feed">
      <div className="section-head analytics-recent-head">
        <h3>Recent activity</h3>
        <Link to="/pipeline" className="analytics-pipeline-link">
          View pipeline
        </Link>
      </div>
      {activities.length > 0 ? (
        <div className="analytics-recent-list">
          {activities.slice(0, 6).map((activity, index) => (
            <Link
              key={`${activity.candidate_name}-${activity.job_title}-${index}`}
              to={applicationActivityPath(activity)}
              className="analytics-recent-item"
            >
              <div className="analytics-recent-meta">
                <div className="analytics-recent-avatar" aria-hidden>
                  <Users className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <p className="analytics-recent-name">{activity.candidate_name}</p>
                  <p className="analytics-recent-role">{activity.job_title}</p>
                </div>
              </div>
              <span className="analytics-recent-stage">{(activity.stage || '').replace(/_/g, ' ')}</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="analytics-recent-empty">
          <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>No recent activity</p>
        </div>
      )}
    </div>
  );
}
