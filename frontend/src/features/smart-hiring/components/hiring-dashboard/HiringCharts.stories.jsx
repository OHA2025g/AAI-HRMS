import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import PipelineFunnelChart from './PipelineFunnelChart';
import SourceMixChart from './SourceMixChart';
import TrendsChart from './TrendsChart';
import FitScoreHistogram from './FitScoreHistogram';
import ReqAgingChart from './ReqAgingChart';
import QualityBySourceChart from './QualityBySourceChart';
import MiniKpiTile from './MiniKpiTile';
import StageAgingHeatmap from './StageAgingHeatmap';
import TopJobsTable from './TopJobsTable';
import AlertsPanel from './AlertsPanel';
import DashboardHeroHealth from './DashboardHeroHealth';
import DashboardOrgFilterBar from './DashboardOrgFilterBar';
import HiringVelocityChart from './HiringVelocityChart';
import TimeToFillTrendChart from './TimeToFillTrendChart';
import OverviewTabContent from './tabs/OverviewTabContent';
import PipelineTabContent from './tabs/PipelineTabContent';
import OffersTabContent from './tabs/OffersTabContent';
import InterviewsTabContent from './tabs/InterviewsTabContent';
import SignalsTabContent from './tabs/SignalsTabContent';
import AnalyticsTabContent from './tabs/AnalyticsTabContent';
import { Sparkles } from 'lucide-react';
import { mockHiringPack, mockTrendPoints } from './fixtures/hiringPackFixture';

export default {
  title: 'Hiring Dashboard/Charts',
};

const withRouter = (Story) => (
  <MemoryRouter>
    <div className="max-w-xl p-4">
      <Story />
    </div>
  </MemoryRouter>
);

export const PipelineFunnel = {
  decorators: [withRouter],
  render: () => (
    <PipelineFunnelChart
      funnel={[
        { stage: 'SOURCED', label: 'Sourced', count: 120, conversion_from_prev_pct: 100 },
        { stage: 'SCREENING', label: 'Screening', count: 80, conversion_from_prev_pct: 67 },
        { stage: 'INTERVIEW_1', label: 'Interview 1', count: 40, conversion_from_prev_pct: 50 },
      ]}
    />
  ),
};

export const SourceMix = {
  decorators: [withRouter],
  render: () => (
    <SourceMixChart
      sourceMix={[
        { channel: 'LinkedIn', count: 45, pct: 45 },
        { channel: 'Referral', count: 30, pct: 30 },
        { channel: 'Job board', count: 25, pct: 25 },
      ]}
    />
  ),
};

export const Trends = {
  render: () => (
    <TrendsChart
      dataSource="synthetic"
      points={[
        { label: 'Jan', new_applications: 40, hires: 5, open_jobs: 12, hire_target: 10 },
        { label: 'Feb', new_applications: 55, hires: 8, open_jobs: 14, hire_target: 10 },
        { label: 'Mar', new_applications: 48, hires: 6, open_jobs: 11, hire_target: 10 },
      ]}
    />
  ),
};

export const FitHistogram = {
  decorators: [withRouter],
  render: () => (
    <FitScoreHistogram
      fitDistribution={[
        { bucket: '<50', count: 10 },
        { bucket: '50-70', count: 25 },
        { bucket: '70-90', count: 40 },
        { bucket: '90+', count: 15 },
      ]}
    />
  ),
};

export const ReqAging = {
  decorators: [withRouter],
  render: () => (
    <ReqAgingChart
      reqAging={[
        { label: '0-30d', count: 8 },
        { label: '31-60d', count: 4 },
        { label: '61-90d', count: 2 },
        { label: '90+d', count: 1 },
      ]}
    />
  ),
};

export const QualityBySource = {
  decorators: [withRouter],
  render: () => (
    <QualityBySourceChart
      qualityBySource={[
        { channel: 'Referral', avg_fit: 82, count: 20 },
        { channel: 'LinkedIn', avg_fit: 71, count: 45 },
      ]}
    />
  ),
};

export const MiniKpiAiAdoption = {
  decorators: [withRouter],
  render: () => (
    <MiniKpiTile
      label="AI Matches adoption"
      value="78%"
      subtitle="14 of 18 open roles"
      icon={Sparkles}
      iconClassName="bg-violet-100 text-violet-600"
      href="/jobs?status=OPEN"
    />
  ),
};

export const StageAgingHeatmapStory = {
  decorators: [withRouter],
  render: () => (
    <StageAgingHeatmap
      stageAging={[
        { stage: 'SCREENING', bucket: '0-7d', count: 5 },
        { stage: 'SCREENING', bucket: '8-14d', count: 2 },
        { stage: 'INTERVIEW_1', bucket: '0-7d', count: 3 },
      ]}
      stageAgingSummary={[
        { stage: 'SCREENING', label: 'Screening', avg_days: 12, count: 7 },
        { stage: 'INTERVIEW_1', label: 'Interview 1', avg_days: 8, count: 3 },
      ]}
    />
  ),
};

export const TopJobsTableStory = {
  decorators: [withRouter],
  render: () => (
    <TopJobsTable
      topJobs={[
        { job_id: 'j1', title: 'Senior Engineer', pipeline_count: 12, open_days: 45, avg_fit_score: 78 },
        { job_id: 'j2', title: 'Product Manager', pipeline_count: 8, open_days: 30, avg_fit_score: 82 },
      ]}
    />
  ),
};

export const AlertsPanelStory = {
  decorators: [withRouter],
  render: () => (
    <AlertsPanel
      alerts={[
        {
          id: 'stuck-screening',
          severity: 'warning',
          title: '8 candidates stuck in Screening',
          message: 'Exceeds SLA',
          action_path: '/pipeline?stage=SCREENING',
        },
      ]}
      dismissedIds={[]}
      onDismiss={() => {}}
    />
  ),
};

export const HeroHealth = {
  decorators: [withRouter],
  render: () => (
    <DashboardHeroHealth
      score={57}
      status="watch"
      asOf="2026-06-12T12:30:00Z"
      heroRisk={{ reqs_at_risk: 12, jobs_miss_sla: 4, high_fit_awaiting_review: 78 }}
      aiRecommendation={{
        title: 'Increase recruiter capacity',
        message: 'Engineering bottleneck detected',
        impact_days: 14,
        action_path: '/pipeline',
      }}
    />
  ),
};

export const OrgFilterBar = {
  render: () => (
    <DashboardOrgFilterBar
      filterOptions={{
        pillars: ['Engineering'],
        departments: ['Technology'],
        sub_departments: ['Backend'],
        project_ids: ['PRJ-001'],
      }}
      pillar=""
      department=""
      subDepartment=""
      projectId=""
      onPillarChange={() => {}}
      onDepartmentChange={() => {}}
      onSubDepartmentChange={() => {}}
      onProjectIdChange={() => {}}
      onClear={() => {}}
    />
  ),
};

export const HiringVelocity = {
  render: () => (
    <HiringVelocityChart
      points={mockTrendPoints}
      headline={mockHiringPack.headline}
      pipelineByStage={mockHiringPack.pipeline_by_stage}
    />
  ),
};

export const TimeToFillTrend = {
  render: () => (
    <TimeToFillTrendChart points={mockTrendPoints} avgDays={42} />
  ),
};

export const OverviewTab = {
  decorators: [withRouter],
  render: () => (
    <div className="max-w-6xl">
      <OverviewTabContent pack={mockHiringPack} trends={{ points: mockTrendPoints }} />
    </div>
  ),
};

export const PipelineTab = {
  decorators: [withRouter],
  render: () => (
    <div className="max-w-6xl">
      <PipelineTabContent pack={mockHiringPack} alerts={mockHiringPack.alerts} dismissed={[]} onDismiss={() => {}} />
    </div>
  ),
};

export const OffersTab = {
  decorators: [withRouter],
  render: () => (
    <div className="max-w-6xl">
      <OffersTabContent pack={mockHiringPack} />
    </div>
  ),
};

export const InterviewsTab = {
  decorators: [withRouter],
  render: () => (
    <div className="max-w-6xl">
      <InterviewsTabContent pack={mockHiringPack} />
    </div>
  ),
};

export const SignalsTab = {
  decorators: [withRouter],
  render: () => (
    <div className="max-w-6xl">
      <SignalsTabContent pack={mockHiringPack} />
    </div>
  ),
};

export const AnalyticsTab = {
  decorators: [withRouter],
  render: () => (
    <div className="max-w-6xl">
      <AnalyticsTabContent
        pack={mockHiringPack}
        trends={{ points: mockTrendPoints, data_source: 'synthetic' }}
        trendsHealth={null}
      />
    </div>
  ),
};
