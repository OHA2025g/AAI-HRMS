import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { assessmentsApi } from '@/shared/lib/api';
import { usePlacementFilters } from '@/shared/context/PlacementFiltersContext';
import { useAssessmentFeatureFlags } from '@/shared/hooks/useAssessmentFeatureFlags';
import { BUSINESS_ORG_PILLARS, getDepartmentsForPillar } from '@/data/businessOrgHierarchy';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Loader2 } from 'lucide-react';
import { AssessmentFunnelChart } from './AssessmentCharts';

function orgParams(placement) {
  const pillarLabel = BUSINESS_ORG_PILLARS.find((p) => p.id === placement.pillarId)?.label || '';
  const deptLabel =
    placement.pillarId && placement.departmentId
      ? getDepartmentsForPillar(placement.pillarId).find((d) => d.id === placement.departmentId)?.label || ''
      : '';
  const params = {};
  if (pillarLabel) params.pillar = pillarLabel;
  if (deptLabel) params.department = deptLabel;
  if (placement.subDepartment) params.sub_department = placement.subDepartment;
  if (placement.projectId) params.project_id = placement.projectId;
  return params;
}

export default function AssessmentCommandCenterPanel() {
  const { flags, loading: flagsLoading } = useAssessmentFeatureFlags();
  const placement = usePlacementFilters();
  const org = useMemo(() => orgParams(placement), [placement]);
  const orgKey = JSON.stringify(org);

  const [loading, setLoading] = useState(true);
  const [funnel, setFunnel] = useState([]);
  const [headline, setHeadline] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const analyticsParams = { ...org, window_days: 30 };
        const [funnelRes, summaryRes] = await Promise.all([
          assessmentsApi.analyticsFunnel(analyticsParams),
          assessmentsApi.analyticsSummary(analyticsParams),
        ]);
        if (!cancelled) {
          setFunnel(funnelRes.data || []);
          setHeadline(summaryRes.data?.headline || null);
        }
      } catch {
        if (!cancelled) {
          setFunnel([]);
          setHeadline(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgKey]);

  if (flagsLoading) {
    return null;
  }

  if (flags.command_center === false) {
    return null;
  }

  if (loading) {
    return (
      <Card data-testid="dashboard-assessment-panel">
        <CardContent className="py-10 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </CardContent>
      </Card>
    );
  }

  const invited = funnel.find((f) => f.stage === 'invited')?.count ?? funnel[0]?.count;
  const completed = funnel.find((f) => f.stage === 'passed')?.count ?? funnel.find((f) => f.stage === 'submitted')?.count;
  const completionPct =
    invited > 0 && completed != null ? Math.round((100 * completed) / invited) : headline?.completion_rate_pct;
  const inProgress = headline?.active_submissions?.value ?? headline?.active_submissions ?? 0;

  return (
    <Card data-testid="dashboard-assessment-panel" className="border-violet-100">
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-lg font-semibold" style={{ fontFamily: 'Outfit' }}>
            Assessment completion
          </CardTitle>
          <CardDescription>Invite → submit → score funnel (30d, org scope)</CardDescription>
        </div>
        <Link to="/assessments?tab=overview">
          <Button variant="outline" size="sm" data-testid="dashboard-assessment-panel-link">
            Command center
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 text-sm">
          <Badge variant="secondary" data-testid="dashboard-assessment-in-progress">
            {inProgress} in progress
          </Badge>
          {completionPct != null ? (
            <Badge className="bg-violet-100 text-violet-800">{completionPct}% completion</Badge>
          ) : null}
          {headline?.pass_rate_pct != null ? (
            <Badge className="bg-emerald-100 text-emerald-800">{headline.pass_rate_pct}% pass rate</Badge>
          ) : null}
        </div>
        <AssessmentFunnelChart funnel={funnel} />
      </CardContent>
    </Card>
  );
}
