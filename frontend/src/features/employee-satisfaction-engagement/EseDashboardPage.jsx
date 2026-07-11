import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { employeeSatisfactionEngagementApi } from '@/shared/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Loader2, ArrowRight, Activity, MessageSquare, AlertTriangle } from 'lucide-react';

export default function EseDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await employeeSatisfactionEngagementApi.getDashboardSummary();
      setData(res.data || null);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to load engagement dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const snap = data?.snapshot || {};
  const live = data?.live_metrics || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Engagement Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Strategic employee voice, experience, and engagement intelligence — snapshot plus live pulse metrics.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading dashboard…
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Overall engagement</CardDescription>
                <CardTitle className="text-3xl">{Number(snap.overall_engagement_score ?? 0).toFixed(1)}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">Rolling composite index</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Satisfaction index</CardDescription>
                <CardTitle className="text-3xl">{Number(snap.satisfaction_index ?? 0).toFixed(1)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>eNPS</CardDescription>
                <CardTitle className="text-3xl">{Number(snap.enps_score ?? 0).toFixed(0)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Pulse participation</CardDescription>
                <CardTitle className="text-3xl">{Number(snap.pulse_participation_rate ?? 0).toFixed(0)}%</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-medium">Live pulse</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <div>Responses: {live.pulse_response_count ?? 0}</div>
                <div>Survey definitions: {live.active_survey_definitions ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-medium">Actions</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="text-sm">Pending action plans: {live.pending_action_plans ?? 0}</CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-medium">Risk alerts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="text-sm">{snap.experience_risk_alert_count ?? 0} open (snapshot)</CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/employee-satisfaction-engagement/pulse-surveys">
                Pulse surveys <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/employee-satisfaction-engagement/feedback">Feedback</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/employee-satisfaction-engagement/burnout-risk">Burnout risk (WFI)</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/employee-engagement/legacy">Legacy pulse tools</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
