import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Briefcase,
  Users,
  GitBranch,
  Target,
  Sparkles,
  TrendingUp,
  Plus,
  RefreshCw,
  AlertCircle,
  Presentation,
  ClipboardCheck,
  Video,
  FileCheck,
  Clock,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent } from '../components/ui/tabs';
import { cn } from '../lib/utils';
import { useHiringDashboard } from '../hooks/useHiringDashboard';
import { useHiringAlertDismissals } from '../hooks/useHiringAlertDismissals';
import KpiTile, { HealthStrip } from '../components/hiring-dashboard/KpiTile';
import PeriodToggle from '../components/hiring-dashboard/PeriodToggle';
import AlertsPanel from '../components/hiring-dashboard/AlertsPanel';
import PipelineFunnelChart from '../components/hiring-dashboard/PipelineFunnelChart';
import SourceMixChart from '../components/hiring-dashboard/SourceMixChart';
import FitScoreHistogram from '../components/hiring-dashboard/FitScoreHistogram';
import ReqAgingChart from '../components/hiring-dashboard/ReqAgingChart';
import TopJobsTable from '../components/hiring-dashboard/TopJobsTable';
import TrendsChart from '../components/hiring-dashboard/TrendsChart';
import RelatedViewsFooter from '../components/hiring-dashboard/RelatedViewsFooter';
import HiringDashboardSkeleton from '../components/hiring-dashboard/HiringDashboardSkeleton';
import HiringFilterBar from '../components/hiring-dashboard/HiringFilterBar';
import DataFreshnessBadge from '../components/hiring-dashboard/DataFreshnessBadge';
import QualityBySourceChart from '../components/hiring-dashboard/QualityBySourceChart';
import StageAgingHeatmap from '../components/hiring-dashboard/StageAgingHeatmap';
import OfferAgingPanel from '../components/hiring-dashboard/OfferAgingPanel';
import OfferAgingChart from '../components/hiring-dashboard/OfferAgingChart';
import OfferStatusStrip from '../components/hiring-dashboard/OfferStatusStrip';
import OfferFunnelChart from '../components/hiring-dashboard/OfferFunnelChart';
import PipelineSnapshotStrip from '../components/hiring-dashboard/PipelineSnapshotStrip';
import InterviewRoundsPanel from '../components/hiring-dashboard/InterviewRoundsPanel';
import ConversionBottleneckChart from '../components/hiring-dashboard/ConversionBottleneckChart';
import HireJourneyPanel from '../components/hiring-dashboard/HireJourneyPanel';
import TalentAcquisitionPanel from '../components/hiring-dashboard/TalentAcquisitionPanel';
import AssessmentCommandCenterPanel from '../components/assessments/AssessmentCommandCenterPanel';
import AiMatchAdoptionPanel from '../components/hiring-dashboard/AiMatchAdoptionPanel';
import HiringQualitySignalsPanel from '../components/hiring-dashboard/HiringQualitySignalsPanel';
import HiringQuickActions from '../components/hiring-dashboard/HiringQuickActions';
import MiniKpiTile from '../components/hiring-dashboard/MiniKpiTile';
import RecentActivityFeed from '../components/hiring-dashboard/RecentActivityFeed';
import SwipeableChartRow from '../components/hiring-dashboard/SwipeableChartRow';
import { KPI_DRILL_PATHS } from '../lib/hiringDashboardDrill';
import { jobsApi, adminApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import SmartHiringPageHeader from '../components/hiring/SmartHiringPageHeader';
import DashboardSectionNav, { DASHBOARD_TABS } from '../components/hiring-dashboard/DashboardSectionNav';

const HIRING_PACK_CACHE_SECONDS = 60;
const DEFAULT_DASHBOARD_TAB = 'overview';
const DASHBOARD_TAB_VALUES = new Set(DASHBOARD_TABS.map((t) => t.value));

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const DashboardPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || DEFAULT_DASHBOARD_TAB;
  const activeTab = DASHBOARD_TAB_VALUES.has(tabParam) ? tabParam : DEFAULT_DASHBOARD_TAB;
  const [presentationMode, setPresentationMode] = useState(false);
  const [openJobs, setOpenJobs] = useState([]);
  const [jobOwners, setJobOwners] = useState([]);
  const { user } = useAuth();
  const {
    pack,
    trends,
    trendsHealth,
    loading,
    refetching,
    error,
    windowDays,
    scope,
    department,
    jobId,
    ownerId,
    setWindowDays,
    setScope,
    setDepartment,
    setJobId,
    setOwnerId,
    reload,
  } = useHiringDashboard();
  const { dismissed, dismiss, filterAlerts } = useHiringAlertDismissals();

  const setActiveTab = (tab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === DEFAULT_DASHBOARD_TAB) next.delete('tab');
    else next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  const allAlerts = pack?.alerts || [];
  const visibleAlerts = filterAlerts(allAlerts);

  useEffect(() => {
    document.body.classList.toggle('hiring-presentation-mode', presentationMode);
    return () => document.body.classList.remove('hiring-presentation-mode');
  }, [presentationMode]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await jobsApi.list('OPEN');
        if (alive) setOpenJobs(Array.isArray(res.data) ? res.data : []);
      } catch {
        if (alive) setOpenJobs([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const fromJobs = [];
    const seen = new Set();
    openJobs.forEach((job) => {
      if (job.created_by && !seen.has(job.created_by)) {
        seen.add(job.created_by);
        fromJobs.push({
          id: job.created_by,
          label: `Recruiter (${String(job.created_by).slice(0, 8)}…)`,
        });
      }
    });

    const loadOwners = async () => {
      if (user?.role !== 'admin') {
        if (alive) setJobOwners(fromJobs);
        return;
      }
      try {
        const res = await adminApi.listUsers({ page_size: 200 });
        const users = res.data?.items || [];
        const byId = new Map(
          users.map((u) => [u.id, u.full_name || u.email || u.id])
        );
        const merged = new Map();
        fromJobs.forEach((o) => {
          merged.set(o.id, { id: o.id, label: byId.get(o.id) || o.label });
        });
        users
          .filter((u) => ['recruiter', 'admin', 'hr_admin'].includes(u.role))
          .forEach((u) => {
            if (!merged.has(u.id)) {
              merged.set(u.id, { id: u.id, label: u.full_name || u.email || u.id });
            }
          });
        if (alive) {
          setJobOwners(
            Array.from(merged.values()).sort((a, b) => a.label.localeCompare(b.label))
          );
        }
      } catch {
        if (alive) setJobOwners(fromJobs);
      }
    };

    loadOwners();
    return () => {
      alive = false;
    };
  }, [openJobs, user?.role]);

  if (loading) {
    return <HiringDashboardSkeleton />;
  }

  const headline = pack?.headline || {};
  const fmt = (metric) => (metric?.value != null ? metric.value : '—');
  const delta = (metric) => metric?.delta_pct;
  const trendPoints = trends?.points || pack?.trends?.points || [];
  const sparkSeries = (key) =>
    trendPoints.map((p) => p[key]).filter((v) => v != null && Number.isFinite(Number(v)));
  const trendsForChart = trends || pack?.trends;
  const aiAdoption = pack?.ai_match_adoption;
  const showMiniKpis =
    !presentationMode &&
    (aiAdoption?.adoption_pct != null ||
      headline.interview_yield_pct != null ||
      headline.assessment_pass_pct != null ||
      headline.assessment_clearance_pct != null ||
      pack?.assessment?.completion_rate_pct != null ||
      headline.time_to_fill_days?.value != null ||
      headline.time_to_hire_days?.value != null);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'space-y-6 hiring-dashboard-root',
        presentationMode && 'hiring-presentation bg-slate-50/80 p-3 sm:p-6 md:p-8 rounded-xl'
      )}
      data-testid="hiring-dashboard-root"
    >
      <motion.div variants={itemVariants}>
        <SmartHiringPageHeader
          title="Smart Hiring Dashboard"
          description={
            presentationMode
              ? undefined
              : 'Operational view of reqs, pipeline quality, and hiring velocity.'
          }
          testId="dashboard-heading"
          className={presentationMode ? '[&_h1]:text-3xl [&_h1]:md:text-4xl' : undefined}
          filters={
            !presentationMode ? (
              <HiringFilterBar
                scope={scope}
                department={department}
                jobId={jobId}
                ownerId={ownerId}
                jobs={openJobs}
                owners={jobOwners}
                onScopeChange={setScope}
                onDepartmentChange={setDepartment}
                onJobIdChange={setJobId}
                onOwnerIdChange={setOwnerId}
                disabled={refetching}
              />
            ) : null
          }
          meta={
            !presentationMode ? (
              <DataFreshnessBadge
                asOf={pack?.as_of}
                freshness={pack?.data_freshness}
                cacheSeconds={HIRING_PACK_CACHE_SECONDS}
              />
            ) : null
          }
          actions={
            <>
              <div className="flex items-center gap-2">
                <Switch
                  id="hiring-presentation-mode"
                  checked={presentationMode}
                  onCheckedChange={setPresentationMode}
                  data-testid="hiring-presentation-toggle"
                />
                <Label htmlFor="hiring-presentation-mode" className="text-xs text-slate-600 flex items-center gap-1">
                  <Presentation className="h-3.5 w-3.5" /> TA review
                </Label>
              </div>
              {!presentationMode ? (
                <PeriodToggle value={windowDays} onChange={setWindowDays} disabled={refetching} />
              ) : null}
              <Button variant="outline" size="sm" onClick={reload} disabled={refetching} aria-label="Refresh dashboard">
                <RefreshCw className={`w-4 h-4 mr-1 ${refetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {!presentationMode ? (
                <Link to="/jobs/new">
                  <Button className="bg-indigo-600 hover:bg-indigo-700" data-testid="create-job-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    New Job
                  </Button>
                </Link>
              ) : null}
            </>
          }
        />
      </motion.div>

      {error ? (
        <motion.div variants={itemVariants}>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </CardContent>
          </Card>
        </motion.div>
      ) : null}

      <motion.div variants={itemVariants} id="dash-kpis">
        <HealthStrip
          score={pack?.health_score ?? 0}
          status={pack?.health_status || 'watch'}
          asOf={pack?.as_of}
          windowDays={windowDays}
          refetching={refetching}
          topAlerts={visibleAlerts}
          presentationMode={presentationMode}
        />
      </motion.div>

      {presentationMode ? (
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          <KpiTile
            label="Open jobs"
            value={fmt(headline.open_jobs)}
            deltaPct={delta(headline.open_jobs)}
            subtitle={`${pack?.total_jobs ?? 0} total`}
            icon={Briefcase}
            iconClassName="bg-indigo-100 text-indigo-600"
            href={KPI_DRILL_PATHS.open_jobs}
            sparkline={sparkSeries('open_jobs')}
            sparklineColor="#6366F1"
          />
          <KpiTile
            label="Active pipeline"
            value={fmt(headline.active_pipeline)}
            deltaPct={delta(headline.active_pipeline)}
            icon={GitBranch}
            iconClassName="bg-purple-100 text-purple-600"
            href={KPI_DRILL_PATHS.active_pipeline}
            sparkline={sparkSeries('active_pipeline')}
            sparklineColor="#A855F7"
          />
          <KpiTile
            label="Hires"
            value={fmt(headline.hires)}
            deltaPct={delta(headline.hires)}
            icon={Target}
            iconClassName="bg-amber-100 text-amber-600"
            href={KPI_DRILL_PATHS.hires}
            sparkline={sparkSeries('hires')}
            sparklineColor="#F59E0B"
          />
          <KpiTile
            label="Avg fit score"
            value={headline.avg_fit_score?.value != null ? `${Math.round(headline.avg_fit_score.value)}%` : '—'}
            deltaPct={delta(headline.avg_fit_score)}
            icon={Sparkles}
            iconClassName="bg-violet-100 text-violet-600"
            href={KPI_DRILL_PATHS.avg_fit_score}
            sparkline={sparkSeries('avg_fit_score')}
            sparklineColor="#8B5CF6"
          />
        </motion.div>
      ) : null}

      {presentationMode ? (
        <motion.div variants={itemVariants}>
          <PipelineFunnelChart
            funnel={pack?.funnel || []}
            jobsWithoutMatches={pack?.ai_match_adoption?.jobs_without_matches || []}
          />
        </motion.div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <motion.div variants={itemVariants}>
            <DashboardSectionNav />
          </motion.div>

          <TabsContent value="overview" className="space-y-6 mt-0 focus-visible:outline-none" id="dash-overview">
            <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        <KpiTile
          label="Open jobs"
          value={fmt(headline.open_jobs)}
          deltaPct={delta(headline.open_jobs)}
          subtitle={`${pack?.total_jobs ?? 0} total`}
          icon={Briefcase}
          iconClassName="bg-indigo-100 text-indigo-600"
          href={KPI_DRILL_PATHS.open_jobs}
          sparkline={sparkSeries('open_jobs')}
          sparklineColor="#6366F1"
        />
        <KpiTile
          label="Active pipeline"
          value={fmt(headline.active_pipeline)}
          deltaPct={delta(headline.active_pipeline)}
          icon={GitBranch}
          iconClassName="bg-purple-100 text-purple-600"
          href={KPI_DRILL_PATHS.active_pipeline}
          sparkline={sparkSeries('active_pipeline')}
          sparklineColor="#A855F7"
        />
        <KpiTile
          label="New applications"
          value={fmt(headline.new_applications)}
          deltaPct={delta(headline.new_applications)}
          subtitle={`Last ${windowDays}d`}
          icon={Users}
          iconClassName="bg-emerald-100 text-emerald-600"
          href={KPI_DRILL_PATHS.new_applications}
          sparkline={sparkSeries('new_applications')}
          sparklineColor="#10B981"
        />
        <KpiTile
          label="Hires"
          value={fmt(headline.hires)}
          deltaPct={delta(headline.hires)}
          icon={Target}
          iconClassName="bg-amber-100 text-amber-600"
          href={KPI_DRILL_PATHS.hires}
          sparkline={sparkSeries('hires')}
          sparklineColor="#F59E0B"
        />
        {headline.pending_offers != null ? (
          <KpiTile
            label="Pending offers"
            value={fmt(headline.pending_offers)}
            deltaPct={delta(headline.pending_offers)}
            subtitle="In salary discussion"
            icon={FileCheck}
            iconClassName="bg-emerald-100 text-emerald-700"
            href={KPI_DRILL_PATHS.pending_offers}
            testId="kpi-pending-offers"
          />
        ) : null}
        <KpiTile
          label="Avg fit score"
          value={headline.avg_fit_score?.value != null ? `${Math.round(headline.avg_fit_score.value)}%` : '—'}
          deltaPct={delta(headline.avg_fit_score)}
          icon={Sparkles}
          iconClassName="bg-violet-100 text-violet-600"
          href={KPI_DRILL_PATHS.avg_fit_score}
          sparkline={sparkSeries('avg_fit_score')}
          sparklineColor="#8B5CF6"
        />
        <KpiTile
          label="Good fit (70%+)"
          value={headline.good_fit_pct?.value != null ? `${headline.good_fit_pct.value}%` : '—'}
          deltaPct={delta(headline.good_fit_pct)}
          icon={TrendingUp}
          iconClassName="bg-teal-100 text-teal-600"
          href={KPI_DRILL_PATHS.good_fit_pct}
          sparkline={sparkSeries('good_fit_pct')}
          sparklineColor="#14B8A6"
        />
        <KpiTile
          label="High fit (90%+)"
          value={headline.high_fit_pct?.value != null ? `${headline.high_fit_pct.value}%` : '—'}
          deltaPct={delta(headline.high_fit_pct)}
          icon={TrendingUp}
          iconClassName="bg-sky-100 text-sky-600"
          href={KPI_DRILL_PATHS.high_fit_pct}
          sparkline={sparkSeries('high_fit_pct')}
          sparklineColor="#0EA5E9"
        />
      </motion.div>

      {showMiniKpis ? (
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3"
          data-testid="hiring-mini-kpi-row"
        >
          {aiAdoption?.adoption_pct != null ? (
            <MiniKpiTile
              label="AI Matches adoption"
              value={`${aiAdoption.adoption_pct}%`}
              subtitle={`${aiAdoption.jobs_with_matches ?? 0} of ${aiAdoption.open_jobs ?? 0} open roles`}
              icon={Sparkles}
              iconClassName="bg-violet-100 text-violet-600"
              href={KPI_DRILL_PATHS.ai_adoption}
              testId="mini-kpi-ai-adoption"
            />
          ) : null}
          {headline.interview_yield_pct != null ? (
            <MiniKpiTile
              label="Interview yield"
              value={`${headline.interview_yield_pct}%`}
              subtitle="Screening → Interview 1"
              icon={Video}
              iconClassName="bg-blue-100 text-blue-600"
              href={KPI_DRILL_PATHS.interview_yield}
              testId="mini-kpi-interview-yield"
            />
          ) : null}
          {(headline.assessment_clearance_pct ?? headline.assessment_pass_pct) != null ? (
            <MiniKpiTile
              label="Assessment clearance"
              value={`${headline.assessment_clearance_pct ?? headline.assessment_pass_pct}%`}
              subtitle="Cleared ÷ sent"
              icon={ClipboardCheck}
              iconClassName="bg-emerald-100 text-emerald-600"
              href={KPI_DRILL_PATHS.assessment_pass}
              testId="mini-kpi-assessment-pass"
            />
          ) : null}
          {pack?.assessment?.completion_rate_pct != null ? (
            <MiniKpiTile
              label="Assessment completion"
              value={`${pack.assessment.completion_rate_pct}%`}
              subtitle="Scored ÷ invited"
              icon={ClipboardCheck}
              iconClassName="bg-indigo-100 text-indigo-600"
              href={pack.assessment.command_center_path || '/assessments?tab=overview'}
              testId="mini-kpi-assessment-completion"
            />
          ) : null}
          {headline.time_to_fill_days?.value != null ? (
            <MiniKpiTile
              label="Time to fill"
              value={`${headline.time_to_fill_days.value}d`}
              deltaPct={headline.time_to_fill_days.delta_pct}
              subtitle="Req open → joined"
              icon={Target}
              iconClassName="bg-amber-100 text-amber-600"
              testId="mini-kpi-time-to-fill"
            />
          ) : null}
          {headline.time_to_hire_days?.value != null ? (
            <MiniKpiTile
              label="Time to hire"
              value={`${headline.time_to_hire_days.value}d`}
              deltaPct={headline.time_to_hire_days.delta_pct}
              subtitle="Application → joined"
              icon={Clock}
              iconClassName="bg-slate-100 text-slate-700"
              testId="mini-kpi-time-to-hire"
            />
          ) : null}
        </motion.div>
      ) : null}

            <motion.div variants={itemVariants}>
              <RelatedViewsFooter />
            </motion.div>

            <motion.div variants={itemVariants}>
              <HiringQuickActions alerts={visibleAlerts} />
            </motion.div>

            <motion.div variants={itemVariants}>
              <RecentActivityFeed activities={pack?.recent_activities || []} />
            </motion.div>
          </TabsContent>

          <TabsContent value="pipeline" className="space-y-6 mt-0 focus-visible:outline-none" id="dash-funnel">
            <motion.div variants={itemVariants} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <motion.div className="xl:col-span-2 space-y-6">
                <PipelineFunnelChart
                  funnel={pack?.funnel || []}
                  jobsWithoutMatches={pack?.ai_match_adoption?.jobs_without_matches || []}
                />
                <PipelineSnapshotStrip pipelineByStage={pack?.pipeline_by_stage || {}} />
              </motion.div>
              <AlertsPanel alerts={allAlerts} dismissedIds={dismissed} onDismiss={dismiss} />
            </motion.div>
          </TabsContent>

          <TabsContent value="offers" className="space-y-6 mt-0 focus-visible:outline-none" id="dash-offers">
            {(pack?.offer_status_counts || []).length > 0 ? (
              <OfferStatusStrip offerStatusCounts={pack.offer_status_counts} />
            ) : null}
            {(pack?.offer_funnel || []).some((row) => row.count > 0) ? (
              <OfferFunnelChart offerFunnel={pack.offer_funnel} />
            ) : null}
            <SwipeableChartRow testId="offer-analytics-charts">
              <motion.div variants={itemVariants} className="min-w-0 flex-1">
                <OfferAgingPanel offerAging={pack?.offer_aging || []} />
              </motion.div>
            </SwipeableChartRow>
            <motion.div variants={itemVariants}>
              <OfferAgingChart offerAgingBuckets={pack?.offer_aging_buckets || []} />
            </motion.div>
          </TabsContent>

          <TabsContent value="interviews" className="space-y-6 mt-0 focus-visible:outline-none" id="dash-interviews">
            <SwipeableChartRow testId="interview-bottleneck-charts">
              <motion.div variants={itemVariants} className="min-w-0 flex-1">
                <InterviewRoundsPanel interviewRoundMetrics={pack?.interview_round_metrics || []} />
              </motion.div>
              <motion.div variants={itemVariants} className="min-w-0 flex-1">
                <ConversionBottleneckChart
                  conversionBottleneck={pack?.conversion_bottleneck || []}
                  bottleneckSlowHires={pack?.bottleneck_slow_hires || []}
                />
              </motion.div>
            </SwipeableChartRow>
            <motion.div variants={itemVariants}>
              <HireJourneyPanel hireJourneys={pack?.hire_journeys || []} />
            </motion.div>
          </TabsContent>

          <TabsContent value="signals" className="space-y-6 mt-0 focus-visible:outline-none" id="dash-signals">
            <motion.div variants={itemVariants} id="dash-ai">
              <AiMatchAdoptionPanel aiMatchAdoption={pack?.ai_match_adoption} />
            </motion.div>

            <motion.div variants={itemVariants} id="dash-quality">
              <HiringQualitySignalsPanel
                referralMetrics={pack?.referral_metrics}
                careerTrajectoryCoverage={pack?.career_trajectory_coverage}
                medianFitScore={headline.median_fit_score}
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <TalentAcquisitionPanel talentAcquisition={pack?.talent_acquisition} />
            </motion.div>

            <motion.div variants={itemVariants}>
              <AssessmentCommandCenterPanel />
            </motion.div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6 mt-0 focus-visible:outline-none" id="dash-charts">
            <motion.div variants={itemVariants} id="dash-trends">
              <TrendsChart
                points={trendsForChart?.points || []}
                dataSource={trendsForChart?.data_source}
                lastLiveSnapshotAt={trendsForChart?.last_live_snapshot_at}
                snapshotHealth={trendsHealth}
              />
            </motion.div>

            <SwipeableChartRow testId="source-quality-charts">
              <motion.div variants={itemVariants}>
                <SourceMixChart sourceMix={pack?.source_mix || []} />
              </motion.div>
              <motion.div variants={itemVariants}>
                <QualityBySourceChart qualityBySource={pack?.quality_by_source || []} />
              </motion.div>
            </SwipeableChartRow>

            <SwipeableChartRow testId="fit-aging-charts">
              <motion.div variants={itemVariants}>
                <FitScoreHistogram fitDistribution={pack?.fit_distribution || []} />
              </motion.div>
              <motion.div variants={itemVariants}>
                <StageAgingHeatmap
                  stageAging={pack?.stage_aging || []}
                  stageAgingSummary={pack?.stage_aging_summary || []}
                />
              </motion.div>
            </SwipeableChartRow>

            <SwipeableChartRow testId="req-topjobs-charts">
              <motion.div variants={itemVariants}>
                <ReqAgingChart reqAging={pack?.req_aging || []} />
              </motion.div>
              <motion.div variants={itemVariants}>
                <TopJobsTable topJobs={pack?.top_jobs || []} />
              </motion.div>
            </SwipeableChartRow>

          </TabsContent>
        </Tabs>
      )}
    </motion.div>
  );
};

export default DashboardPage;
