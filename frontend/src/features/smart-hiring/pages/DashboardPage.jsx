import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/card';
import { cn } from '@/shared/lib/utils';
import { useHiringDashboard } from '@/shared/hooks/useHiringDashboard';
import { useHiringAlertDismissals } from '@/shared/hooks/useHiringAlertDismissals';
import PeriodToggle from '@/features/smart-hiring/components/hiring-dashboard/PeriodToggle';
import HiringDashboardSkeleton from '@/features/smart-hiring/components/hiring-dashboard/HiringDashboardSkeleton';
import DashboardHeroHealth from '@/features/smart-hiring/components/hiring-dashboard/DashboardHeroHealth';
import DashboardOrgFilterBar from '@/features/smart-hiring/components/hiring-dashboard/DashboardOrgFilterBar';
import DashboardSectionNav, { DASHBOARD_TABS } from '@/features/smart-hiring/components/hiring-dashboard/DashboardSectionNav';
import OverviewTabContent from '@/features/smart-hiring/components/hiring-dashboard/tabs/OverviewTabContent';
import PipelineTabContent from '@/features/smart-hiring/components/hiring-dashboard/tabs/PipelineTabContent';
import OffersTabContent from '@/features/smart-hiring/components/hiring-dashboard/tabs/OffersTabContent';
import InterviewsTabContent from '@/features/smart-hiring/components/hiring-dashboard/tabs/InterviewsTabContent';
import SignalsTabContent from '@/features/smart-hiring/components/hiring-dashboard/tabs/SignalsTabContent';
import AnalyticsTabContent from '@/features/smart-hiring/components/hiring-dashboard/tabs/AnalyticsTabContent';
import { useAuth } from '@/shared/context/AuthContext';

const DEFAULT_DASHBOARD_TAB = 'overview';
const DASHBOARD_TAB_VALUES = new Set(DASHBOARD_TABS.map((t) => t.value));

const DashboardPage = () => {
  const filterBarRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || DEFAULT_DASHBOARD_TAB;
  const activeTab = DASHBOARD_TAB_VALUES.has(tabParam) ? tabParam : DEFAULT_DASHBOARD_TAB;
  const [presentationMode, setPresentationMode] = useState(false);
  const { user } = useAuth();
  const {
    pack,
    trends,
    trendsHealth,
    filterOptions,
    loading,
    refetching,
    error,
    windowDays,
    department,
    pillar,
    subDepartment,
    projectId,
    setWindowDays,
    setDepartment,
    setPillar,
    setSubDepartment,
    setProjectId,
    clearOrgFilters,
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

  if (loading) {
    return <HiringDashboardSkeleton />;
  }

  const isOverview = activeTab === 'overview';
  const firstName = user?.full_name?.split(' ')[0];
  const greeting = firstName ? `Welcome back, ${firstName} 👋` : 'Welcome back 👋';
  const pageTitle = isOverview ? greeting : 'Smart Hiring Dashboard';
  const pageDescription = isOverview
    ? "Here's what's happening with your hiring today."
    : 'Operational view of reqs, pipeline quality, and hiring velocity.';

  const scrollToFilters = () => {
    filterBarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      className={cn(
        'hiring-dashboard-root min-h-full',
        !isOverview && 'top-operational',
        presentationMode && 'hiring-presentation p-3 sm:p-6 md:p-8 rounded-xl'
      )}
      data-testid="hiring-dashboard-root"
    >
      <header className="top">
        <div>
          <h1 data-testid="dashboard-heading">{pageTitle}</h1>
          {!presentationMode && pageDescription ? <p>{pageDescription}</p> : null}
        </div>
        <div className="actions">
          {!presentationMode ? (
            <>
              <PeriodToggle
                value={windowDays}
                onChange={setWindowDays}
                disabled={refetching}
                variant="overview-mock"
              />
              <button type="button" className="btn" onClick={scrollToFilters} data-testid="dashboard-filters-btn">
                ⚗ Filters
              </button>
              <button type="button" className="btn" aria-label="Notifications" data-testid="dashboard-notifications-btn">
                🔔
              </button>
            </>
          ) : null}
        </div>
      </header>

      {!presentationMode ? (
        <div ref={filterBarRef} id="hd-filterbar">
          <DashboardOrgFilterBar
            filterOptions={filterOptions}
            pillar={pillar}
            department={department}
            subDepartment={subDepartment}
            projectId={projectId}
            onPillarChange={setPillar}
            onDepartmentChange={setDepartment}
            onSubDepartmentChange={setSubDepartment}
            onProjectIdChange={setProjectId}
            onClear={clearOrgFilters}
            disabled={refetching}
          />
        </div>
      ) : null}

      {error ? (
        <Card className="border-red-200 bg-red-50 mb-3">
          <CardContent className="p-3 flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </CardContent>
          </Card>
      ) : null}

      <DashboardHeroHealth
          score={pack?.health_score ?? 0}
          status={pack?.health_status || 'watch'}
          asOf={pack?.as_of}
          heroRisk={pack?.hero_risk_metrics}
          aiRecommendation={pack?.ai_recommendation}
          presentationMode={presentationMode}
      />

      <DashboardSectionNav activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'overview' ? (
        <OverviewTabContent pack={pack} trends={trends} windowDays={windowDays} />
      ) : null}

      {activeTab === 'pipeline' ? (
        <PipelineTabContent pack={pack} alerts={allAlerts} dismissed={dismissed} onDismiss={dismiss} />
      ) : null}

      {activeTab === 'offers' ? (
        <OffersTabContent pack={pack} />
      ) : null}

      {activeTab === 'interviews' ? (
        <InterviewsTabContent pack={pack} />
      ) : null}

      {activeTab === 'signals' ? (
        <SignalsTabContent pack={pack} />
      ) : null}

      {activeTab === 'analytics' ? (
        <AnalyticsTabContent pack={pack} trends={trends} trendsHealth={trendsHealth} />
      ) : null}
    </div>
  );
};

export default DashboardPage;
