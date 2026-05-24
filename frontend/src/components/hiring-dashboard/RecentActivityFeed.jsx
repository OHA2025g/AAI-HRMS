import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { applicationActivityPath } from '../../lib/hiringDashboardDrill';

export default function RecentActivityFeed({ activities = [] }) {
  return (
    <Card data-testid="recent-activity-feed">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold" style={{ fontFamily: 'Outfit' }}>
            Recent activity
          </CardTitle>
          <Link to="/pipeline">
            <Button variant="ghost" size="sm" className="text-indigo-600">
              View pipeline
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {activities.length > 0 ? (
          <div className="space-y-3">
            {activities.slice(0, 6).map((activity, index) => (
              <Link
                key={`${activity.candidate_name}-${activity.job_title}-${index}`}
                to={applicationActivityPath(activity)}
                className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 -mx-2 px-2 rounded-md transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <Users className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{activity.candidate_name}</p>
                    <p className="text-xs text-slate-500">{activity.job_title}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {(activity.stage || '').replace(/_/g, ' ')}
                </Badge>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-500">
            <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No recent activity</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
