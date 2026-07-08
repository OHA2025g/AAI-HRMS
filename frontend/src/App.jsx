import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import {
  SMART_HIRING_ONLY,
  isRouteAllowedInSmartHiringOnly,
} from './config/appModules';
import { TRAINING_DEV_EXTRA_ROUTES } from './training-development/routeTable';
import TrainingDevelopmentLayout from './training-development/TrainingDevelopmentLayout';
import TrainingDevelopmentSectionLanding from './training-development/TrainingDevelopmentSectionLanding';
import TdDashboardPage from './training-development/TdDashboardPage';
import TdTrainingMasterListPage from './training-development/TdTrainingMasterListPage';
import TdTrainingMasterFormPage from './training-development/TdTrainingMasterFormPage';
import TdTrainingMasterDetailPage from './training-development/TdTrainingMasterDetailPage';
import TdWorkspacePage from './training-development/TdWorkspacePage';
import { HSR_EXTRA_ROUTES } from './high-skill-talent-retention/routeTable';
import HighSkillRetentionLayout from './high-skill-talent-retention/HighSkillRetentionLayout';
import HighSkillRetentionSectionLanding from './high-skill-talent-retention/HighSkillRetentionSectionLanding';
import HsrDashboardPage from './high-skill-talent-retention/HsrDashboardPage';
import HsrTalentMasterListPage from './high-skill-talent-retention/HsrTalentMasterListPage';
import HsrTalentMasterFormPage from './high-skill-talent-retention/HsrTalentMasterFormPage';
import HsrTalentDetailPage from './high-skill-talent-retention/HsrTalentDetailPage';
import HsrWorkspacePage from './high-skill-talent-retention/HsrWorkspacePage';
import EmployeeLifecycleManagementLayout from './employee-lifecycle-management/EmployeeLifecycleManagementLayout';
import ElmDashboardPage from './employee-lifecycle-management/ElmDashboardPage';
import ElmEmployeeMasterListPage from './employee-lifecycle-management/ElmEmployeeMasterListPage';
import ElmEmployeeMasterFormPage from './employee-lifecycle-management/ElmEmployeeMasterFormPage';
import ElmEmployeeMasterDetailPage from './employee-lifecycle-management/ElmEmployeeMasterDetailPage';
import ElmWorkspacePage from './employee-lifecycle-management/ElmWorkspacePage';
import { ELM_ROUTES } from './employee-lifecycle-management/routeTable';
import WorkforceIntelligenceLayout from './workforce-intelligence/WorkforceIntelligenceLayout';
import WfiDashboardPage from './workforce-intelligence/WfiDashboardPage';
import WfiWorkspacePage from './workforce-intelligence/WfiWorkspacePage';
import WfiCopilotPage from './workforce-intelligence/WfiCopilotPage';
import { WFI_ROUTES } from './workforce-intelligence/routeTable';
import CostOptimizationLayout from './cost-optimization-automation/CostOptimizationLayout';
import CoaDashboardPage from './cost-optimization-automation/CoaDashboardPage';
import CoaWorkspacePage from './cost-optimization-automation/CoaWorkspacePage';
import CoaCopilotPage from './cost-optimization-automation/CoaCopilotPage';
import { LIST_SEGMENTS as COA_LIST_SEGMENTS } from './cost-optimization-automation/routeTable';
import EmployeeSatisfactionEngagementLayout from './employee-satisfaction-engagement/EmployeeSatisfactionEngagementLayout';
import EseDashboardPage from './employee-satisfaction-engagement/EseDashboardPage';
import EseWorkspacePage from './employee-satisfaction-engagement/EseWorkspacePage';
import EseCopilotPage from './employee-satisfaction-engagement/EseCopilotPage';
import { ESE_ROUTES } from './employee-satisfaction-engagement/routeTable';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PlacementFiltersProvider } from './context/PlacementFiltersContext';
import { Toaster } from './components/ui/sonner';
import Layout from './components/Layout';

// Pages
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import LegacyHiringDashboardPage from './pages/LegacyHiringDashboardPage';
import JobsPage from './pages/JobsPage';
import CreateJobPage from './pages/CreateJobPage';
import JobDetailPage from './pages/JobDetailPage';
import CandidatesPage from './pages/CandidatesPage';
import CandidateImportPage from './pages/CandidateImportPage';
import CareerTrajectoryPage from './pages/CareerTrajectoryPage';
import CareerTrajectoryComparePage from './pages/CareerTrajectoryComparePage';
import Phase2FitSimulationPage from './pages/Phase2FitSimulationPage';
import CandidateProfilePage from './pages/CandidateProfilePage';
import PipelinePage from './pages/PipelinePage';
import ReferralsPage from './pages/ReferralsPage';
import AssessmentsPage from './pages/AssessmentsPage';
import AssessmentCommandCenterGate from './components/assessments/AssessmentCommandCenterGate';
import AssessmentTakePage from './pages/AssessmentTakePage';

function TakeAssessmentRedirect() {
  const { token } = useParams();
  return <Navigate to={`/assessment/take/${token}`} replace />;
}
import InterviewsPage from './pages/InterviewsPage';
import AdminIntegrationsPage from './pages/AdminIntegrationsPage';
import AdminRoleManagementPage from './pages/AdminRoleManagementPage';
import AdminWorkflowAutomationPage from './pages/AdminWorkflowAutomationPage';
import AdminExecutiveKpiPage from './pages/AdminExecutiveKpiPage';
import AdminCareerTrajectoryConfigPage from './pages/AdminCareerTrajectoryConfigPage';
import AdminHiringDashboardConfigPage from './pages/AdminHiringDashboardConfigPage';
import AdminDatabasePage from './pages/AdminDatabasePage';
import WorkflowDesignerPage from './pages/WorkflowDesignerPage';
import HrCopilotPage from './pages/HrCopilotPage';
import TransformationPage from './pages/TransformationPage';
import EmployeesPage from './pages/EmployeesPage';
import WorkforceInventoryPage from './pages/WorkforceInventoryPage';
import ExecutiveKpiPage from './pages/ExecutiveKpiPage';
import EmployeeLifecyclePage from './pages/EmployeeLifecyclePage';
import WorkforceIntelligencePage from './pages/WorkforceIntelligencePage';
import WorkforceResourceOptimizationPage from './pages/WorkforceResourceOptimizationPage';
import ResourceOptimizationProjectsPage from './pages/ResourceOptimizationProjectsPage';
import ResourceOptimizationResourcesPage from './pages/ResourceOptimizationResourcesPage';
import ResourceOptimizationAllocationsPage from './pages/ResourceOptimizationAllocationsPage';
import ProjectSectionDashboardPage from './pages/ProjectSectionDashboardPage';
import ProjectSectionMasterListPage from './pages/ProjectSectionMasterListPage';
import ProjectSectionMasterFormPage from './pages/ProjectSectionMasterFormPage';
import ProjectSectionMasterDetailPage from './pages/ProjectSectionMasterDetailPage';
import ProjectSectionDemandSkillsPage from './pages/ProjectSectionDemandSkillsPage';
import ProjectSectionRiskIssuesPage from './pages/ProjectSectionRiskIssuesPage';
import ProjectSectionDocumentsPage from './pages/ProjectSectionDocumentsPage';
import ProjectSectionCommunicationPage from './pages/ProjectSectionCommunicationPage';
import ProjectSectionAllocationIntegrationPage from './pages/ProjectSectionAllocationIntegrationPage';
import ProjectSectionKpiPage from './pages/ProjectSectionKpiPage';
import ProjectSectionAnalyticsPage from './pages/ProjectSectionAnalyticsPage';
import ProjectSectionApprovalsPage from './pages/ProjectSectionApprovalsPage';
import ProjectSectionClosurePage from './pages/ProjectSectionClosurePage';
import ProjectSectionAIRecommendationsPage from './pages/ProjectSectionAIRecommendationsPage';
import ProjectSectionPlanningPage from './pages/ProjectSectionPlanningPage';
import ProjectSectionLifecyclePage from './pages/ProjectSectionLifecyclePage';
import ProjectSectionFinancePage from './pages/ProjectSectionFinancePage';
import ProjectSectionExecutionPage from './pages/ProjectSectionExecutionPage';
import WorkforceTrainingRecommendationsPage from './pages/WorkforceTrainingRecommendationsPage';
import EmployeeEngagementPage from './pages/EmployeeEngagementPage';
import ResourceStaffingHubPage from './pages/ResourceStaffingHubPage';
import ProjectDemandsPage from './pages/ProjectDemandsPage';
import ProjectAllocationsPage from './pages/ProjectAllocationsPage';
import AllocationDashboardPage from './pages/allocation-section/AllocationDashboardPage';
import AllocationMasterListPage from './pages/allocation-section/AllocationMasterListPage';
import AllocationMasterFormPage from './pages/allocation-section/AllocationMasterFormPage';
import AllocationMasterDetailPage from './pages/allocation-section/AllocationMasterDetailPage';
import AllocationRequestsPage from './pages/allocation-section/AllocationRequestsPage';
import AllocationWorkspacePage from './pages/allocation-section/AllocationWorkspacePage';
import ResourceDashboardPage from './pages/resource-section/ResourceDashboardPage';
import ResourceMasterListPage from './pages/resource-section/ResourceMasterListPage';
import ResourceMasterFormPage from './pages/resource-section/ResourceMasterFormPage';
import ResourceMasterDetailPage from './pages/resource-section/ResourceMasterDetailPage';
import ResourceModulePage from './pages/resource-section/ResourceModulePage';

import './App.css';

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <Layout>{children}</Layout>;
};

const AdminProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
};

const CANDIDATE_IMPORT_ROLES = new Set(['admin', 'hr_admin', 'recruiter']);

const CandidateImportProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!CANDIDATE_IMPORT_ROLES.has(String(user?.role || ''))) {
    return <Navigate to="/candidates" replace />;
  }

  return <Layout>{children}</Layout>;
};

// Public Route wrapper (redirects to dashboard if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

const hiringDashboardV2 = process.env.REACT_APP_HIRING_DASHBOARD_V2 !== '0';

function AppRoutes() {
  const location = useLocation();

  if (SMART_HIRING_ONLY && !isRouteAllowedInSmartHiringOnly(location.pathname)) {
    return (
      <Routes>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      {/* Public Routes */}
      <Route path="/login" element={
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      } />
      
      {/* Protected Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          {hiringDashboardV2 ? <DashboardPage /> : <LegacyHiringDashboardPage />}
        </ProtectedRoute>
      } />

      <Route path="/dashboard/legacy" element={
        <ProtectedRoute>
          <LegacyHiringDashboardPage />
        </ProtectedRoute>
      } />
      
      <Route path="/jobs" element={
        <ProtectedRoute>
          <JobsPage />
        </ProtectedRoute>
      } />
      
      <Route path="/jobs/new" element={
        <ProtectedRoute>
          <CreateJobPage />
        </ProtectedRoute>
      } />

      <Route path="/jobs/:jobId/edit" element={
        <ProtectedRoute>
          <CreateJobPage />
        </ProtectedRoute>
      } />
      
      <Route path="/jobs/:jobId" element={
        <ProtectedRoute>
          <JobDetailPage />
        </ProtectedRoute>
      } />
      
      <Route path="/candidates/import" element={
        <CandidateImportProtectedRoute>
          <CandidateImportPage />
        </CandidateImportProtectedRoute>
      } />

      <Route path="/candidates" element={
        <ProtectedRoute>
          <CandidatesPage />
        </ProtectedRoute>
      } />
      
      <Route path="/candidates/:candidateId" element={
        <ProtectedRoute>
          <CandidateProfilePage />
        </ProtectedRoute>
      } />

      <Route path="/ai-hiring/candidate-fit/career-trajectory" element={
        <ProtectedRoute>
          <CareerTrajectoryPage />
        </ProtectedRoute>
      } />
      <Route path="/ai-hiring/candidate-fit/career-trajectory/compare" element={
        <ProtectedRoute>
          <CareerTrajectoryComparePage />
        </ProtectedRoute>
      } />
      <Route path="/ai-hiring/candidate-fit/phase2" element={
        <ProtectedRoute>
          <Phase2FitSimulationPage />
        </ProtectedRoute>
      } />

      <Route path="/pipeline" element={
        <ProtectedRoute>
          <PipelinePage />
        </ProtectedRoute>
      } />
      
      <Route path="/referrals" element={
        <ProtectedRoute>
          <ReferralsPage />
        </ProtectedRoute>
      } />
      
      <Route path="/assessment/take/:token" element={<AssessmentTakePage />} />
      <Route path="/take/:token" element={<TakeAssessmentRedirect />} />

      <Route path="/assessments" element={
        <ProtectedRoute>
          <AssessmentCommandCenterGate>
            <AssessmentsPage />
          </AssessmentCommandCenterGate>
        </ProtectedRoute>
      } />
      
      <Route path="/interviews" element={
        <ProtectedRoute>
          <InterviewsPage />
        </ProtectedRoute>
      } />

      <Route path="/transformation" element={
        <ProtectedRoute>
          <TransformationPage />
        </ProtectedRoute>
      } />

      <Route path="/employees" element={
        <ProtectedRoute>
          <EmployeesPage />
        </ProtectedRoute>
      } />

      <Route path="/workforce-inventory" element={
        <ProtectedRoute>
          <WorkforceInventoryPage />
        </ProtectedRoute>
      } />

      <Route path="/executive-kpis" element={
        <ProtectedRoute>
          <ExecutiveKpiPage />
        </ProtectedRoute>
      } />

      <Route path="/hr-copilot" element={
        <ProtectedRoute>
          <HrCopilotPage />
        </ProtectedRoute>
      } />

      <Route path="/employee-lifecycle" element={
        <ProtectedRoute>
          <EmployeeLifecyclePage />
        </ProtectedRoute>
      } />

      <Route
        path="/employee-lifecycle-management"
        element={
          <ProtectedRoute>
            <EmployeeLifecycleManagementLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<ElmDashboardPage />} />
        <Route path="employee-master" element={<ElmEmployeeMasterListPage />} />
        <Route path="employee-master/new" element={<ElmEmployeeMasterFormPage />} />
        <Route path="employee-master/:id/edit" element={<ElmEmployeeMasterFormPage />} />
        <Route path="employee-master/:id" element={<ElmEmployeeMasterDetailPage />} />

        {ELM_ROUTES.filter(
          (r) =>
            r.path.startsWith('/employee-lifecycle-management/') &&
            ![
              '/employee-lifecycle-management/dashboard',
              '/employee-lifecycle-management/employee-master',
              '/employee-lifecycle-management/employee-master/new',
            ].includes(r.path) &&
            !r.path.startsWith('/employee-lifecycle-management/employee-master/')
        ).map((r) => (
          <Route
            key={r.path}
            path={r.path.replace('/employee-lifecycle-management/', '')}
            element={<ElmWorkspacePage />}
          />
        ))}
      </Route>

      <Route
        path="/workforce-intelligence"
        element={
          <ProtectedRoute>
            <WorkforceIntelligenceLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<WfiDashboardPage />} />
        <Route path="ai-copilot" element={<WfiCopilotPage />} />
        <Route path="legacy-demand-supply" element={<WorkforceIntelligencePage />} />

        {WFI_ROUTES.filter(
          (r) =>
            r.path.startsWith('/workforce-intelligence/') &&
            !['/workforce-intelligence/dashboard', '/workforce-intelligence/ai-copilot', '/workforce-intelligence/legacy-demand-supply'].includes(r.path)
        ).map((r) => (
          <Route
            key={r.path}
            path={r.path.replace('/workforce-intelligence/', '')}
            element={<WfiWorkspacePage />}
          />
        ))}
      </Route>

      <Route
        path="/cost-optimization-automation"
        element={
          <ProtectedRoute>
            <CostOptimizationLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="section-visibility" element={<Navigate to="/cost-optimization-automation/dashboard" replace />} />
        <Route path="section-automation" element={<Navigate to="/cost-optimization-automation/process-automation" replace />} />
        <Route path="section-predictive" element={<Navigate to="/cost-optimization-automation/cost-forecasting" replace />} />
        <Route path="dashboard" element={<CoaDashboardPage />} />
        <Route path="ai-copilot" element={<CoaCopilotPage />} />
        <Route path="strategic-cost-intelligence" element={<CoaWorkspacePage />} />
        <Route path="executive-decision-support" element={<CoaWorkspacePage />} />
        <Route path="scenario-modeling" element={<CoaWorkspacePage />} />
        {COA_LIST_SEGMENTS.map((seg) => (
          <Route key={seg} path={seg} element={<CoaWorkspacePage />} />
        ))}
      </Route>

      <Route path="/resource-staffing-hub" element={
        <ProtectedRoute>
          <ResourceStaffingHubPage />
        </ProtectedRoute>
      } />

      <Route path="/resource-optimization" element={
        <ProtectedRoute>
          <WorkforceResourceOptimizationPage initialTab="metrics" showTopTabs={false} />
        </ProtectedRoute>
      } />

      <Route path="/resource-optimization/projects" element={
        <ProtectedRoute>
          <ResourceOptimizationProjectsPage />
        </ProtectedRoute>
      } />

      <Route path="/resource-optimization/resources" element={
        <ProtectedRoute>
          <ResourceOptimizationResourcesPage />
        </ProtectedRoute>
      } />

      <Route path="/resource-optimization/allocations" element={
        <ProtectedRoute>
          <ResourceOptimizationAllocationsPage />
        </ProtectedRoute>
      } />

      <Route path="/resource-project-optimization/projects/dashboard" element={
        <ProtectedRoute>
          <ProjectSectionDashboardPage />
        </ProtectedRoute>
      } />

      <Route path="/resource-project-optimization/projects/master" element={
        <ProtectedRoute>
          <ProjectSectionMasterListPage />
        </ProtectedRoute>
      } />

      <Route path="/resource-project-optimization/projects/master/new" element={
        <ProtectedRoute>
          <ProjectSectionMasterFormPage mode="new" />
        </ProtectedRoute>
      } />

      <Route path="/resource-project-optimization/projects/master/:id" element={
        <ProtectedRoute>
          <ProjectSectionMasterDetailPage />
        </ProtectedRoute>
      } />

      <Route path="/resource-project-optimization/projects/master/:id/edit" element={
        <ProtectedRoute>
          <ProjectSectionMasterFormPage mode="edit" />
        </ProtectedRoute>
      } />

      <Route path="/resource-project-optimization/projects/planning" element={
        <ProtectedRoute>
          <ProjectSectionPlanningPage />
        </ProtectedRoute>
      } />

      <Route path="/resource-project-optimization/projects/lifecycle" element={
        <ProtectedRoute>
          <ProjectSectionLifecyclePage />
        </ProtectedRoute>
      } />

      <Route path="/resource-project-optimization/projects/demand-skills" element={
        <ProtectedRoute>
          <ProjectSectionDemandSkillsPage />
        </ProtectedRoute>
      } />

      <Route path="/resource-project-optimization/projects/finance" element={
        <ProtectedRoute>
          <ProjectSectionFinancePage />
        </ProtectedRoute>
      } />

      <Route path="/resource-project-optimization/projects/execution" element={
        <ProtectedRoute>
          <ProjectSectionExecutionPage />
        </ProtectedRoute>
      } />

      <Route path="/resource-project-optimization/projects/risk-issues" element={
        <ProtectedRoute>
          <ProjectSectionRiskIssuesPage />
        </ProtectedRoute>
      } />

      <Route path="/resource-project-optimization/projects/documents" element={
        <ProtectedRoute>
          <ProjectSectionDocumentsPage />
        </ProtectedRoute>
      } />

      <Route path="/resource-project-optimization/projects/communication" element={
        <ProtectedRoute>
          <ProjectSectionCommunicationPage />
        </ProtectedRoute>
      } />

      <Route path="/resource-project-optimization/projects/allocation" element={
        <ProtectedRoute>
          <ProjectSectionAllocationIntegrationPage />
        </ProtectedRoute>
      } />

      <Route path="/resource-project-optimization/projects/kpi" element={
        <ProtectedRoute>
          <ProjectSectionKpiPage />
        </ProtectedRoute>
      } />

      <Route path="/resource-project-optimization/projects/analytics" element={
        <ProtectedRoute>
          <ProjectSectionAnalyticsPage />
        </ProtectedRoute>
      } />

      <Route path="/resource-project-optimization/projects/approvals" element={
        <ProtectedRoute>
          <ProjectSectionApprovalsPage />
        </ProtectedRoute>
      } />

      <Route path="/resource-project-optimization/projects/closure" element={
        <ProtectedRoute>
          <ProjectSectionClosurePage />
        </ProtectedRoute>
      } />

      <Route path="/resource-project-optimization/projects/ai-recommendations" element={
        <ProtectedRoute>
          <ProjectSectionAIRecommendationsPage />
        </ProtectedRoute>
      } />

      <Route path="/project-demands" element={
        <ProtectedRoute>
          <ProjectDemandsPage />
        </ProtectedRoute>
      } />

      <Route path="/project-allocations" element={
        <ProtectedRoute>
          <ProjectAllocationsPage />
        </ProtectedRoute>
      } />

      <Route path="/resource-project-optimization/allocation/dashboard" element={
        <ProtectedRoute>
          <AllocationDashboardPage />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/allocation/master" element={
        <ProtectedRoute>
          <AllocationMasterListPage />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/allocation/master/new" element={
        <ProtectedRoute>
          <AllocationMasterFormPage mode="new" />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/allocation/master/:id/edit" element={
        <ProtectedRoute>
          <AllocationMasterFormPage mode="edit" />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/allocation/master/:id" element={
        <ProtectedRoute>
          <AllocationMasterDetailPage />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/allocation/requests" element={
        <ProtectedRoute>
          <AllocationRequestsPage />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/allocation/assignment" element={
        <ProtectedRoute>
          <AllocationWorkspacePage slug="assignment" />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/allocation/scheduling" element={
        <ProtectedRoute>
          <AllocationWorkspacePage slug="scheduling" />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/allocation/capacity-conflicts" element={
        <ProtectedRoute>
          <AllocationWorkspacePage slug="capacity-conflicts" />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/allocation/billability-commercials" element={
        <ProtectedRoute>
          <AllocationWorkspacePage slug="billability-commercials" />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/allocation/rollon-rolloff" element={
        <ProtectedRoute>
          <AllocationWorkspacePage slug="rollon-rolloff" />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/allocation/demand-supply" element={
        <ProtectedRoute>
          <AllocationWorkspacePage slug="demand-supply" />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/allocation/fulfillment-bench" element={
        <ProtectedRoute>
          <AllocationWorkspacePage slug="fulfillment-bench" />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/allocation/replacement-backup" element={
        <ProtectedRoute>
          <AllocationWorkspacePage slug="replacement-backup" />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/allocation/changes-release" element={
        <ProtectedRoute>
          <AllocationWorkspacePage slug="changes-release" />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/allocation/calendar-heatmap" element={
        <ProtectedRoute>
          <AllocationWorkspacePage slug="calendar-heatmap" />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/allocation/approvals" element={
        <ProtectedRoute>
          <AllocationWorkspacePage slug="approvals" />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/allocation/documents-notes" element={
        <ProtectedRoute>
          <AllocationWorkspacePage slug="documents-notes" />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/allocation/alerts-communication" element={
        <ProtectedRoute>
          <AllocationWorkspacePage slug="alerts-communication" />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/allocation/analytics" element={
        <ProtectedRoute>
          <AllocationWorkspacePage slug="analytics" />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/allocation/forecasting" element={
        <ProtectedRoute>
          <AllocationWorkspacePage slug="forecasting" />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/allocation/ai-insights" element={
        <ProtectedRoute>
          <AllocationWorkspacePage slug="ai-insights" />
        </ProtectedRoute>
      } />

      <Route path="/resource-project-optimization/resource/dashboard" element={
        <ProtectedRoute>
          <ResourceDashboardPage />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/resource/master/new" element={
        <ProtectedRoute>
          <ResourceMasterFormPage mode="new" />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/resource/master/:id/edit" element={
        <ProtectedRoute>
          <ResourceMasterFormPage mode="edit" />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/resource/master/:id" element={
        <ProtectedRoute>
          <ResourceMasterDetailPage />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/resource/master" element={
        <ProtectedRoute>
          <ResourceMasterListPage />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/resource/classification" element={
        <ProtectedRoute>
          <ResourceModulePage slug="classification" />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/resource/skills" element={
        <ProtectedRoute>
          <ResourceModulePage slug="skills" />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/resource/availability-utilization" element={
        <ProtectedRoute>
          <ResourceModulePage slug="availability-utilization" />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/resource/bench" element={
        <ProtectedRoute>
          <ResourceModulePage slug="bench" />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/resource/deployment-readiness" element={
        <ProtectedRoute>
          <ResourceModulePage slug="deployment-readiness" />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/resource/demand-matching" element={
        <ProtectedRoute>
          <ResourceModulePage slug="demand-matching" />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/resource/mobility-career" element={
        <ProtectedRoute>
          <ResourceModulePage slug="mobility-career" />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/resource/learning-certifications" element={
        <ProtectedRoute>
          <ResourceModulePage slug="learning-certifications" />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/resource/cost-commercial" element={
        <ProtectedRoute>
          <ResourceModulePage slug="cost-commercial" />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/resource/attendance-leave-impact" element={
        <ProtectedRoute>
          <ResourceModulePage slug="attendance-leave-impact" />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/resource/documents-compliance" element={
        <ProtectedRoute>
          <ResourceModulePage slug="documents-compliance" />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/resource/notes-communication" element={
        <ProtectedRoute>
          <ResourceModulePage slug="notes-communication" />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/resource/analytics" element={
        <ProtectedRoute>
          <ResourceModulePage slug="analytics" />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/resource/forecasting" element={
        <ProtectedRoute>
          <ResourceModulePage slug="forecasting" />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/resource/approvals-governance" element={
        <ProtectedRoute>
          <ResourceModulePage slug="approvals-governance" />
        </ProtectedRoute>
      } />
      <Route path="/resource-project-optimization/resource/ai-insights" element={
        <ProtectedRoute>
          <ResourceModulePage slug="ai-insights" />
        </ProtectedRoute>
      } />

      <Route path="/training-recommendations" element={
        <ProtectedRoute>
          <WorkforceTrainingRecommendationsPage />
        </ProtectedRoute>
      } />

      <Route path="/training-development" element={
        <ProtectedRoute>
          <TrainingDevelopmentLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="learning-ops" element={<TrainingDevelopmentSectionLanding />} />
        <Route path="capability" element={<TrainingDevelopmentSectionLanding />} />
        <Route path="intelligence" element={<TrainingDevelopmentSectionLanding />} />
        <Route path="dashboard" element={<TdDashboardPage />} />
        <Route path="training-master" element={<TdTrainingMasterListPage />} />
        <Route path="training-master/new" element={<TdTrainingMasterFormPage mode="create" />} />
        <Route path="training-master/:id/edit" element={<TdTrainingMasterFormPage mode="edit" />} />
        <Route path="training-master/:id" element={<TdTrainingMasterDetailPage />} />
        {TRAINING_DEV_EXTRA_ROUTES.map((r) => (
          <Route key={r.path} path={r.path} element={<TdWorkspacePage />} />
        ))}
      </Route>

      <Route path="/employee-engagement" element={<Navigate to="/employee-satisfaction-engagement/dashboard" replace />} />

      <Route
        path="/employee-satisfaction-engagement"
        element={
          <ProtectedRoute>
            <EmployeeSatisfactionEngagementLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<EseDashboardPage />} />
        <Route path="copilot" element={<EseCopilotPage />} />
        {ESE_ROUTES.filter(
          (r) =>
            !['/employee-satisfaction-engagement/dashboard', '/employee-satisfaction-engagement/copilot'].includes(r.path),
        ).map((r) => (
          <Route
            key={r.path}
            path={r.path.replace('/employee-satisfaction-engagement/', '')}
            element={<EseWorkspacePage />}
          />
        ))}
      </Route>

      <Route
        path="/employee-engagement/legacy"
        element={
          <ProtectedRoute>
            <EmployeeEngagementPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/employee-retention"
        element={
          <ProtectedRoute>
            <Navigate to="/high-skill-talent-retention/dashboard" replace />
          </ProtectedRoute>
        }
      />

      <Route path="/high-skill-talent-retention" element={
        <ProtectedRoute>
          <HighSkillRetentionLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="identify" element={<HighSkillRetentionSectionLanding />} />
        <Route path="intervention" element={<HighSkillRetentionSectionLanding />} />
        <Route path="intelligence" element={<HighSkillRetentionSectionLanding />} />
        <Route path="dashboard" element={<HsrDashboardPage />} />
        <Route path="critical-talent" element={<HsrTalentMasterListPage />} />
        <Route path="talent-master" element={<HsrTalentMasterListPage />} />
        <Route path="talent-master/new" element={<HsrTalentMasterFormPage mode="create" />} />
        <Route path="talent-master/:id/edit" element={<HsrTalentMasterFormPage mode="edit" />} />
        <Route path="talent-master/:id" element={<HsrTalentDetailPage />} />
        {HSR_EXTRA_ROUTES.map((r) => (
          <Route key={r.path} path={r.path} element={<HsrWorkspacePage />} />
        ))}
      </Route>

      <Route path="/admin/integrations" element={
        <AdminProtectedRoute>
          <AdminIntegrationsPage />
        </AdminProtectedRoute>
      } />

      <Route path="/admin/roles" element={
        <AdminProtectedRoute>
          <AdminRoleManagementPage />
        </AdminProtectedRoute>
      } />

      <Route path="/admin/workflow-automation" element={
        <AdminProtectedRoute>
          <AdminWorkflowAutomationPage />
        </AdminProtectedRoute>
      } />

      <Route path="/admin/executive-kpi" element={
        <AdminProtectedRoute>
          <AdminExecutiveKpiPage />
        </AdminProtectedRoute>
      } />

      <Route path="/admin/career-trajectory-config" element={
        <AdminProtectedRoute>
          <AdminCareerTrajectoryConfigPage />
        </AdminProtectedRoute>
      } />

      <Route path="/admin/hiring-dashboard-config" element={
        <AdminProtectedRoute>
          <AdminHiringDashboardConfigPage />
        </AdminProtectedRoute>
      } />

      <Route path="/admin/database" element={
        <AdminProtectedRoute>
          <AdminDatabasePage />
        </AdminProtectedRoute>
      } />

      <Route path="/admin/workflow-automation/designer" element={
        <AdminProtectedRoute>
          <WorkflowDesignerPage />
        </AdminProtectedRoute>
      } />
      
      {/* Fallback: unknown paths → dashboard (auth gate sends guests to login) */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PlacementFiltersProvider>
          <AppRoutes />
          <Toaster position="top-right" richColors closeButton />
        </PlacementFiltersProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
