import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { employeeSatisfactionEngagementApi } from '../lib/api';

const Kpi = ({ title, value, hint }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardDescription>{title}</CardDescription>
      <CardTitle className="text-2xl">{value}</CardTitle>
      {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
    </CardHeader>
  </Card>
);

const fmtPct = (n) => (n == null || Number.isNaN(Number(n)) ? '—' : `${(Number(n) * 100).toFixed(1)}%`);

export default function EseDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [bundle, setBundle] = useState(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const [d, b] = await Promise.all([
          employeeSatisfactionEngagementApi.getDashboardSummary(),
          employeeSatisfactionEngagementApi.getSummariesBundle().catch(() => null),
        ]);
        setData(d.data || null);
        setBundle(b?.data || null);
      } catch (e) {
        toast.error(e?.response?.data?.detail || 'Failed to load engagement dashboard');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const snap = data?.snapshot || {};
  const k = data?.kpis || {};
  const risks = useMemo(() => data?.top_experience_risks || [], [data]);
  const campaigns = useMemo(() => data?.recent_pulse_campaigns || [], [data]);

  const riskChart = useMemo(
    () =>
      (risks || []).slice(0, 6).map((r) => ({
        id: r.decline_prediction_id || r.id,
        p: Math.round((r.engagement_drop_probability || 0) * 100),
      })),
    [risks],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold">Employee Satisfaction & Engagement</div>
          <div className="text-sm text-muted-foreground">
            Voice, sentiment, experience monitoring, and predictive workforce experience intelligence
          </div>
        </div>
        <div className="text-xs text-muted-foreground">Generated: {data?.generated_at || '—'}</div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading dashboard…
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">Snapshot: {snap.snapshot_date || '—'}</Badge>
        <Badge variant="outline">eNPS: {snap.enps_score ?? k.enps_score ?? '—'}</Badge>
        <Badge variant="outline">Pulse participation: {fmtPct(snap.pulse_participation_rate ?? k.pulse_participation_rate)}</Badge>
        <Badge variant="outline">Open feedback: {k.open_feedback_items ?? 0}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Kpi title="Engagement score" value={fmtPct(snap.overall_engagement_score ?? k.overall_engagement_score)} />
        <Kpi title="Satisfaction index" value={fmtPct(snap.satisfaction_index ?? k.satisfaction_index)} />
        <Kpi title="Burnout signal" value={fmtPct(snap.burnout_signal_score ?? k.burnout_signal_score)} hint="Lower is better" />
        <Kpi title="Experience risk alerts" value={k.experience_risk_alert_count ?? snap.experience_risk_alert_count ?? '—'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader>
            <CardTitle>Engagement decline risk (mock)</CardTitle>
            <CardDescription>Top predicted drops — drill into predictive views</CardDescription>
          </CardHeader>
          <CardContent>
            {riskChart.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={riskChart}>
                  <XAxis dataKey="id" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="p" fill="#EC4899" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-muted-foreground">No risk rows.</div>
            )}
            <div className="mt-2 text-sm">
              <Link className="text-indigo-600 hover:underline" to="/employee-satisfaction-engagement/engagement-decline">
                Open decline prediction →
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Module coverage</CardTitle>
            <CardDescription>Record counts (seeded collections)</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            {bundle ? (
              <>
                <div>Pulse campaigns: {bundle.pulse_campaigns?.records ?? '—'}</div>
                <div>Feedback: {bundle.feedback?.records ?? '—'}</div>
                <div>Burnout predictions: {bundle.burnout_predictions?.records ?? '—'}</div>
                <div>AI recommendations: {bundle.ai_recommendations?.records ?? '—'}</div>
              </>
            ) : (
              <div>Bundle summary unavailable.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent pulse campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Participation</TableHead>
                  <TableHead>Launch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(campaigns || []).slice(0, 8).map((r, idx) => (
                  <TableRow key={r.campaign_id || idx}>
                    <TableCell>{r.campaign_name}</TableCell>
                    <TableCell>{r.status}</TableCell>
                    <TableCell>{fmtPct(r.participation_rate)}</TableCell>
                    <TableCell>{r.launch_date}</TableCell>
                  </TableRow>
                ))}
                {!campaigns?.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground text-sm">
                      No campaigns.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <Link
          className="block p-4 rounded-lg border bg-white hover:border-indigo-300 transition-colors"
          to="/employee-satisfaction-engagement/pulse-surveys"
        >
          <div className="font-semibold">Pulse surveys</div>
          <div className="text-muted-foreground">Campaigns, participation, history</div>
        </Link>
        <Link
          className="block p-4 rounded-lg border bg-white hover:border-indigo-300 transition-colors"
          to="/employee-satisfaction-engagement/burnout-risk"
        >
          <div className="font-semibold">Burnout risk</div>
          <div className="text-muted-foreground">Predictions and severity</div>
        </Link>
        <Link
          className="block p-4 rounded-lg border bg-white hover:border-indigo-300 transition-colors"
          to="/employee-satisfaction-engagement/experience-copilot"
        >
          <div className="font-semibold">Experience copilot</div>
          <div className="text-muted-foreground">Mock NL queries (audited)</div>
        </Link>
      </div>
    </div>
  );
}
