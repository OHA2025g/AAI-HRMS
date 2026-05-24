import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useExecutiveFilters } from '../hooks/executive/useExecutiveFilters';
import { useExecutiveKpiData } from '../hooks/executive/useExecutiveKpiData';
import { ExecutivePageHeader } from '../components/executive/ExecutivePageHeader';
import { ExecutiveFilterBar } from '../components/executive/ExecutiveFilterBar';
import { DataFreshnessStrip } from '../components/executive/DataFreshnessStrip';
import { ExecutiveInsightsPanel } from '../components/executive/ExecutiveInsightsPanel';
import { ExecutiveNarrativePanel } from '../components/executive/ExecutiveNarrativePanel';
import { ExecutiveQuickLinks } from '../components/executive/ExecutiveQuickLinks';
import { ExecutiveKpiTile } from '../components/executive/ExecutiveKpiTile';
import {
  ExecutiveSection,
  RetentionRiskTable,
  SentimentDonut,
  SkillGapsChart,
  SourceMixDonut,
  WorkforceTrendChart,
} from '../components/executive/ExecutiveCharts';
import { LeadershipExportSection } from '../components/executive/LeadershipExportSection';
import { ExecutivePredictivePanel } from '../components/executive/ExecutivePredictivePanel';
import { ExecutiveDashboardSkeleton } from '../components/executive/ExecutiveDashboardSkeleton';
import { Button } from '../components/ui/button';
import { TabsContent } from '../components/ui/tabs';
import { ExecutiveKpiTabs } from '../components/executive/ExecutiveKpiTabs';
import { cn } from '@/lib/utils';
import { hasExecutiveDrillFilters } from '../config/executiveKpiConfig';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

const TAB_TILE_TARGETS = {
  '#workforce': 'workforce',
  '#skills': 'skills',
  '#people-risk': 'people',
};

const ExecutiveKpiPage = () => {
  const navigate = useNavigate();
  const { filters, setFilters, clearFilters, activeChips } = useExecutiveFilters();
  const {
    loading,
    refetching,
    error,
    pack,
    drill,
    drillOpts,
    trends,
    snapshots,
    defById,
    getDelta,
    reload,
    loadSnapshots,
    narrative,
    predictive,
    debouncedRole,
  } = useExecutiveKpiData(filters);

  const [presentationMode, setPresentationMode] = useState(false);

  useEffect(() => {
    if (presentationMode) {
      document.documentElement.classList.add('executive-board-mode');
    } else {
      document.documentElement.classList.remove('executive-board-mode');
    }
    return () => document.documentElement.classList.remove('executive-board-mode');
  }, [presentationMode]);

  const [periodYm, setPeriodYm] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const strategic = drill?.dashboard || {};
  const winDays = strategic?.analytics_window_days ?? filters.windowDays;
  const gaps = strategic?.top_skill_gaps || [];
  const ta = drill?.talent_acquisition || pack?.talent_acquisition || {};
  const freshness = drill?.freshness || pack?.freshness;
  const insights = drill?.insights || pack?.insights || [];
  const metricStatus = drill?.metric_status || {};

  const scopeHint =
    drill?.scope_employee_count != null
      ? `${drill.scope_employee_count} employees in scope`
      : 'Full organization';

  const drillFiltersActive = hasExecutiveDrillFilters(filters);

  const coverage =
    strategic?.skill_coverage_pct != null
      ? strategic.skill_coverage_pct
      : pack?.values?.skill_coverage_pct?.value;
  const coverageScope = strategic?.skill_coverage_scope || 'org';

  const onHeroTileClick = useCallback(
    (target) => {
      if (target === 'attrition') {
        navigate('/high-skill-talent-retention/dashboard');
        return;
      }
      if (target === 'engagement') {
        navigate('/employee-satisfaction-engagement/executive-decision-support');
        return;
      }
      const tabId = TAB_TILE_TARGETS[target];
      if (tabId) {
        setFilters({ activeTab: tabId });
      }
    },
    [navigate, setFilters],
  );

  if (loading && !pack) {
    return <ExecutiveDashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-rose-600">{error}</p>
        <Button onClick={reload}>Retry</Button>
      </div>
    );
  }

  const m7Ok = strategic?.automation_runs_succeeded_30d ?? 0;
  const m7Fail = strategic?.automation_runs_failed_30d ?? 0;
  const m7Total = m7Ok + m7Fail;
  const m7SuccessPct = m7Total ? Math.round((100 * m7Ok) / m7Total) : null;

  return (
    <motion.div className="relative">
      {refetching ? (
        <motion.div
          className="absolute inset-0 z-20 flex items-start justify-center pt-24 bg-white/50 rounded-xl pointer-events-none"
          aria-live="polite"
          aria-busy="true"
        >
          <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
        </motion.div>
      ) : null}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={cn(
          'space-y-5 pb-10 transition-opacity duration-200',
          refetching && 'opacity-60 pointer-events-none',
          presentationMode && 'executive-presentation bg-slate-50 p-4 md:p-8 rounded-xl',
        )}
      >
        <motion.div variants={itemVariants}>
          <ExecutivePageHeader
            generatedAt={strategic?.generated_at || pack?.strategic_summary?.generated_at}
            onRefresh={reload}
            refetching={refetching}
            presentationMode={presentationMode}
            onPresentationModeChange={setPresentationMode}
            analystMode={filters.analystMode}
            onAnalystModeChange={(v) => setFilters({ analystMode: v })}
          />
        </motion.div>

        {!presentationMode ? (
          <motion.div variants={itemVariants}>
            <ExecutiveQuickLinks />
          </motion.div>
        ) : null}

        <motion.div variants={itemVariants}>
          <ExecutiveFilterBar
            filters={filters}
            setFilters={setFilters}
            clearFilters={clearFilters}
            activeChips={activeChips}
            drillOpts={drillOpts}
            scopeHint={scopeHint}
            snapshots={snapshots}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <DataFreshnessStrip freshness={freshness} />
        </motion.div>

        <motion.div variants={itemVariants}>
          <ExecutiveKpiTabs
            value={filters.activeTab}
            onValueChange={(tab) => setFilters({ activeTab: tab })}
            presentationMode={presentationMode}
          >
            <TabsContent value="summary" className="mt-5 space-y-4 focus-visible:outline-none">
              <ExecutiveInsightsPanel insights={insights} />
              <ExecutiveNarrativePanel narrative={narrative} />
            </TabsContent>

            <TabsContent value="workforce" className="mt-5 space-y-4 focus-visible:outline-none">
              <motion.div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
                <ExecutiveKpiTile
                  label="Active headcount"
                  value={strategic?.active_employee_count ?? pack?.values?.headcount_active?.value}
                  icon="users"
                  status={metricStatus.headcount_active || pack?.values?.headcount_active?.status || 'ok'}
                  definition={defById('headcount_active')}
                  delta={getDelta('active_employee_count') || getDelta('headcount_active')}
                  hint={`${strategic?.employee_count ?? '—'} total records`}
                  onClick={() => onHeroTileClick('#workforce')}
                />
                <ExecutiveKpiTile
                  label="Attrition rate"
                  value={`${strategic?.attrition_rate_pct ?? pack?.values?.attrition_rate_pct?.value ?? 0}%`}
                  icon="trending"
                  status={metricStatus.attrition_rate_pct || pack?.values?.attrition_rate_pct?.status}
                  definition={defById('attrition_rate_pct')}
                  delta={getDelta('attrition_rate_pct')}
                  onClick={() => onHeroTileClick('attrition')}
                />
                <ExecutiveKpiTile
                  label="Skill coverage"
                  value={`${coverage ?? 0}%`}
                  icon="target"
                  status={metricStatus.skill_coverage_pct || pack?.values?.skill_coverage_pct?.status}
                  definition={defById('skill_coverage_pct')}
                  delta={getDelta('skill_coverage_pct')}
                  hint={coverageScope === 'filtered' ? 'Scoped to current filters' : 'Organization-wide'}
                  onClick={() => onHeroTileClick('#skills')}
                />
                <ExecutiveKpiTile
                  label="Forecast skill gap"
                  value={strategic?.forecast_gap_total ?? pack?.values?.forecast_gap_total?.value}
                  icon="alert"
                  status={metricStatus.forecast_gap_total || pack?.values?.forecast_gap_total?.status}
                  definition={defById('forecast_gap_total')}
                  delta={getDelta('forecast_gap_total')}
                  hint={`${filters.horizonMonths} month horizon`}
                  onClick={() => onHeroTileClick('#skills')}
                />
                <ExecutiveKpiTile
                  label="Engagement avg"
                  value={strategic?.engagement_avg_rating ?? pack?.values?.engagement_avg_rating?.value}
                  icon="heart"
                  status={metricStatus.engagement_avg_rating || pack?.values?.engagement_avg_rating?.status}
                  definition={defById('engagement_avg_rating')}
                  delta={getDelta('engagement_avg_rating')}
                  hint={`${strategic?.engagement_last_30_days_responses ?? 0} pulses (${winDays}d)`}
                  onClick={() => onHeroTileClick('engagement')}
                />
                <ExecutiveKpiTile
                  label="Retention risk"
                  value={strategic?.retention_avg_risk_score ?? pack?.values?.retention_avg_risk_score?.value}
                  icon="shield"
                  status={metricStatus.retention_avg_risk_score || pack?.values?.retention_avg_risk_score?.status}
                  definition={defById('retention_avg_risk_score')}
                  delta={getDelta('retention_avg_risk_score')}
                  onClick={() => onHeroTileClick('#people-risk')}
                />
              </motion.div>
              <motion.div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ExecutiveSection
                  title="Workforce trend"
                  description="From monthly leadership snapshots"
                  refetching={refetching}
                  skeletonHeight={260}
                >
                  <WorkforceTrendChart trends={trends} scopeFiltered={drillFiltersActive} />
                </ExecutiveSection>
                <ExecutiveSection
                  title="Workforce snapshot"
                  description="Current period headcount composition"
                  refetching={refetching}
                  action={
                    <Button asChild variant="outline" size="sm">
                      <Link to="/workforce-intelligence/dashboard">Workforce module</Link>
                    </Button>
                  }
                >
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Total employees</p>
                      <p className="text-2xl font-bold">{strategic?.employee_count ?? 0}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-500">Exited (stock)</p>
                      <p className="text-2xl font-bold">{strategic?.attrition_count ?? 0}</p>
                    </div>
                  </div>
                </ExecutiveSection>
              </motion.div>
              <ExecutiveSection
                title="Predictive workforce outlook"
                description="Attrition trend projection and M8 retention risk forecast"
                refetching={refetching}
                skeletonHeight={320}
              >
                <ExecutivePredictivePanel predictive={predictive} refetching={refetching} />
              </ExecutiveSection>
            </TabsContent>

            <TabsContent
              value="skills"
              className="mt-5 focus-visible:outline-none"
              data-testid="executive-section-skills"
            >
              <ExecutiveSection
                title="Skill gaps"
                description="Demand vs supply — click a bar to open Workforce Intelligence"
                refetching={refetching}
                skeletonHeight={280}
              >
                <SkillGapsChart gaps={gaps} analystMode={filters.analystMode} />
              </ExecutiveSection>
            </TabsContent>

            <TabsContent value="people" className="mt-5 space-y-4 focus-visible:outline-none">
              <motion.div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ExecutiveSection
                  title="Engagement sentiment"
                  description={`Pulse responses in ${winDays}-day window`}
                  refetching={refetching}
                >
                  <SentimentDonut counts={strategic?.engagement_sentiment_counts} />
                  <Button asChild variant="link" className="mt-2 px-0 text-indigo-600">
                    <Link to="/employee-satisfaction-engagement/dashboard">Engagement dashboard →</Link>
                  </Button>
                </ExecutiveSection>
                <ExecutiveSection
                  title="Strategic capacity"
                  description="Shortage, bench, and forecast indicators"
                  refetching={refetching}
                >
                  <motion.div className="grid grid-cols-2 gap-3">
                    <MiniStat label="Resource shortage" value={strategic?.resource_total_shortage} />
                    <MiniStat label="Resource bench" value={strategic?.resource_total_bench} />
                    <MiniStat label="Forecast gap" value={strategic?.forecast_gap_total} />
                    <MiniStat label="Avg skills / employee" value={strategic?.avg_skills_per_employee} />
                  </motion.div>
                </ExecutiveSection>
              </motion.div>
              <ExecutiveSection
                title="Top at-risk employees"
                description="Critical skill shortage exposure — click a row for retention module"
                refetching={refetching}
                skeletonHeight={280}
                id="people-risk"
              >
                <RetentionRiskTable
                  employees={strategic?.retention_top_risk_employees || []}
                  analystMode={filters.analystMode}
                />
              </ExecutiveSection>
            </TabsContent>

            <TabsContent value="hiring" className="mt-5 focus-visible:outline-none">
              <motion.div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ExecutiveSection
                  title={`Hiring quality (${winDays}d)`}
                  description="Talent acquisition executive metrics"
                  refetching={refetching}
                >
                  <motion.div className="grid grid-cols-2 gap-4 mb-4">
                    <MiniStat label="Candidates added" value={ta.candidates_created_in_window} />
                    <MiniStat
                      label="Match precision"
                      value={ta.top_match_precision_proxy_pct != null ? `${ta.top_match_precision_proxy_pct}%` : '—'}
                    />
                    <MiniStat label="Dedup events" value={ta.dedup_audit_events_in_window} />
                    <MiniStat
                      label="Source concentration"
                      value={ta.primary_source_concentration_pct != null ? `${ta.primary_source_concentration_pct}%` : '—'}
                    />
                  </motion.div>
                  <Button asChild variant="link" className="px-0 text-indigo-600">
                    <Link to="/candidates">View candidates →</Link>
                  </Button>
                </ExecutiveSection>
                <ExecutiveSection
                  title="Candidate source mix"
                  description="New candidates by channel"
                  refetching={refetching}
                >
                  <SourceMixDonut mix={ta.source_mix_by_channel} />
                </ExecutiveSection>
              </motion.div>
            </TabsContent>

            <TabsContent value="automation" className="mt-5 focus-visible:outline-none">
              <ExecutiveSection
                title={`Automation & savings (${winDays}d)`}
                description="Estimated ROI from workflow automation"
                refetching={refetching}
                action={
                  <Button asChild variant="outline" size="sm">
                    <Link to="/cost-optimization-automation/executive-decision-support">COA executive view</Link>
                  </Button>
                }
              >
                <motion.div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                  <MiniStat label="Runs succeeded" value={m7Ok} />
                  <MiniStat label="Runs failed" value={m7Fail} highlight={m7Fail > 0} />
                  <MiniStat label="Success rate" value={m7SuccessPct != null ? `${m7SuccessPct}%` : '—'} />
                  <MiniStat label="Minutes saved (est.)" value={strategic?.estimated_manual_minutes_saved_30d} />
                  <MiniStat label="USD saved (est.)" value={`$${strategic?.estimated_cost_saved_usd_30d ?? 0}`} />
                </motion.div>
              </ExecutiveSection>
            </TabsContent>

            <TabsContent value="reports" className="mt-5 focus-visible:outline-none" id="reports">
              <LeadershipExportSection
                periodYm={periodYm}
                setPeriodYm={setPeriodYm}
                horizonMonths={filters.horizonMonths}
                windowDays={filters.windowDays}
                snapshots={snapshots}
                onSnapshotsReload={loadSnapshots}
                department={filters.department}
                managerRootId={filters.managerRootId}
                roleContains={debouncedRole}
              />
            </TabsContent>
          </ExecutiveKpiTabs>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

function MiniStat({ label, value, highlight }) {
  return (
    <div className={cn('rounded-lg border p-3', highlight ? 'border-amber-200 bg-amber-50/50' : 'border-slate-100')}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xl font-bold text-slate-900 mt-0.5">{value ?? '—'}</p>
    </div>
  );
}

export default ExecutiveKpiPage;
