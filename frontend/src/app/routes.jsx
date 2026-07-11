import React from 'react';
import { Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import {
  SMART_HIRING_ONLY,
  isRouteAllowedInSmartHiringOnly,
} from '@/shared/config/appModules';
import { TRAINING_DEV_EXTRA_ROUTES } from '@/features/training-development/routeTable';
import TrainingDevelopmentLayout from '@/features/training-development/TrainingDevelopmentLayout';
import TrainingDevelopmentSectionLanding from '@/features/training-development/TrainingDevelopmentSectionLanding';
import TdDashboardPage from '@/features/training-development/TdDashboardPage';
import TdTrainingMasterListPage from '@/features/training-development/TdTrainingMasterListPage';
import TdTrainingMasterFormPage from '@/features/training-development/TdTrainingMasterFormPage';
import TdTrainingMasterDetailPage from '@/features/training-development/TdTrainingMasterDetailPage';
import TdWorkspacePage from '@/features/training-development/TdWorkspacePage';
import { HSR_EXTRA_ROUTES } from '@/features/high-skill-talent-retention/routeTable';
import HighSkillRetentionLayout from '@/features/high-skill-talent-retention/HighSkillRetentionLayout';
import HighSkillRetentionSectionLanding from '@/features/high-skill-talent-retention/HighSkillRetentionSectionLanding';
import HsrDashboardPage from '@/features/high-skill-talent-retention/HsrDashboardPage';
import HsrTalentMasterListPage from '@/features/high-skill-talent-retention/HsrTalentMasterListPage';
import HsrTalentMasterFormPage from '@/features/high-skill-talent-retention/HsrTalentMasterFormPage';
import HsrTalentDetailPage from '@/features/high-skill-talent-retention/HsrTalentDetailPage';
import HsrWorkspacePage from '@/features/high-skill-talent-retention/HsrWorkspacePage';
import EmployeeLifecycleManagementLayout from '@/features/employee-lifecycle-management/EmployeeLifecycleManagementLayout';
import ElmDashboardPage from '@/features/employee-lifecycle-management/ElmDashboardPage';
import ElmEmployeeMasterListPage from '@/features/employee-lifecycle-management/ElmEmployeeMasterListPage';
import ElmEmployeeMasterFormPage from '@/features/employee-lifecycle-management/ElmEmployeeMasterFormPage';
import ElmEmployeeMasterDetailPage from '@/features/employee-lifecycle-management/ElmEmployeeMasterDetailPage';
import ElmWorkspacePage from '@/features/employee-lifecycle-management/ElmWorkspacePage';
import { ELM_ROUTES } from '@/features/employee-lifecycle-management/routeTable';
import WorkforceIntelligenceLayout from '@/features/workforce-intelligence/WorkforceIntelligenceLayout';
import WfiDashboardPage from '@/features/workforce-intelligence/WfiDashboardPage';
import WfiWorkspacePage from '@/features/workforce-intelligence/WfiWorkspacePage';
import WfiCopilotPage from '@/features/workforce-intelligence/WfiCopilotPage';
import { WFI_ROUTES } from '@/features/workforce-intelligence/routeTable';
import CostOptimizationLayout from '@/features/cost-optimization-automation/CostOptimizationLayout';
import CoaDashboardPage from '@/features/cost-optimization-automation/CoaDashboardPage';
import CoaWorkspacePage from '@/features/cost-optimization-automation/CoaWorkspacePage';
import CoaCopilotPage from '@/features/cost-optimization-automation/CoaCopilotPage';
import { LIST_SEGMENTS as COA_LIST_SEGMENTS } from '@/features/cost-optimization-automation/routeTable';
import EmployeeSatisfactionEngagementLayout from '@/features/employee-satisfaction-engagement/EmployeeSatisfactionEngagementLayout';
import EseDashboardPage from '@/features/employee-satisfaction-engagement/EseDashboardPage';
import EseWorkspacePage from '@/features/employee-satisfaction-engagement/EseWorkspacePage';
import EseCopilotPage from '@/features/employee-satisfaction-engagement/EseCopilotPage';
import { ESE_ROUTES } from '@/features/employee-satisfaction-engagement/routeTable';
import { useAuth } from '@/shared/context/AuthContext';
import Layout from '@/shared/components/Layout';

// Pages
import LoginPage from '@/features/smart-hiring/pages/LoginPage';
import LandingPage from '@/features/smart-hiring/pages/LandingPage';
import DashboardPage from '@/features/smart-hiring/pages/DashboardPage';
import LegacyHiringDashboardPage from '@/features/smart-hiring/pages/LegacyHiringDashboardPage';
import JobsPage from '@/features/smart-hiring/pages/JobsPage';
import CreateJobPage from '@/features/smart-hiring/pages/CreateJobPage';
import JobDetailPage from '@/features/smart-hiring/pages/JobDetailPage';
import CandidatesPage from '@/features/smart-hiring/pages/CandidatesPage';
import CandidateImportPage from '@/features/smart-hiring/pages/CandidateImportPage';
import CareerTrajectoryPage from '@/features/smart-hiring/pages/CareerTrajectoryPage';
import CareerTrajectoryComparePage from '@/features/smart-hiring/pages/CareerTrajectoryComparePage';
import Phase2FitSimulationPage from '@/features/smart-hiring/pages/Phase2FitSimulationPage';
import CandidateProfilePage from '@/features/smart-hiring/pages/CandidateProfilePage';
import PipelinePage from '@/features/smart-hiring/pages/PipelinePage';
import ReferralsPage from '@/features/smart-hiring/pages/ReferralsPage';
import AssessmentsPage from '@/features/smart-hiring/pages/AssessmentsPage';
import AssessmentCommandCenterGate from '@/features/smart-hiring/components/assessments/AssessmentCommandCenterGate';
import AssessmentTakePage from '@/features/smart-hiring/pages/AssessmentTakePage';

import InterviewsPage from '@/features/smart-hiring/pages/InterviewsPage';
import AdminIntegrationsPage from '@/features/admin/pages/AdminIntegrationsPage';
import AdminRoleManagementPage from '@/features/admin/pages/AdminRoleManagementPage';
import AdminWorkflowAutomationPage from '@/features/admin/pages/AdminWorkflowAutomationPage';
import AdminExecutiveKpiPage from '@/features/admin/pages/AdminExecutiveKpiPage';
import AdminCareerTrajectoryConfigPage from '@/features/admin/pages/AdminCareerTrajectoryConfigPage';
import AdminHiringDashboardConfigPage from '@/features/admin/pages/AdminHiringDashboardConfigPage';
import AdminDatabasePage from '@/features/admin/pages/AdminDatabasePage';
import WorkflowDesignerPage from '@/features/smart-hiring/pages/WorkflowDesignerPage';
import HrCopilotPage from '@/features/smart-hiring/pages/HrCopilotPage';
import TransformationPage from '@/features/smart-hiring/pages/TransformationPage';
import EmployeesPage from '@/features/smart-hiring/pages/EmployeesPage';
import WorkforceInventoryPage from '@/features/resource-optimization/pages/WorkforceInventoryPage';
import ExecutiveKpiPage from '@/features/smart-hiring/pages/ExecutiveKpiPage';
import EmployeeLifecyclePage from '@/features/employee-lifecycle-management/EmployeeLifecyclePage';
import WorkforceIntelligencePage from '@/features/workforce-intelligence/WorkforceIntelligencePage';
import WorkforceResourceOptimizationPage from '@/features/resource-optimization/pages/WorkforceResourceOptimizationPage';
import ResourceOptimizationProjectsPage from '@/features/resource-optimization/pages/ResourceOptimizationProjectsPage';
import ResourceOptimizationResourcesPage from '@/features/resource-optimization/pages/ResourceOptimizationResourcesPage';
import ResourceOptimizationAllocationsPage from '@/features/resource-optimization/pages/ResourceOptimizationAllocationsPage';
import ProjectSectionDashboardPage from '@/features/resource-optimization/pages/ProjectSectionDashboardPage';
import ProjectSectionMasterListPage from '@/features/resource-optimization/pages/ProjectSectionMasterListPage';
import ProjectSectionMasterFormPage from '@/features/resource-optimization/pages/ProjectSectionMasterFormPage';
import ProjectSectionMasterDetailPage from '@/features/resource-optimization/pages/ProjectSectionMasterDetailPage';
import ProjectSectionDemandSkillsPage from '@/features/resource-optimization/pages/ProjectSectionDemandSkillsPage';
import ProjectSectionRiskIssuesPage from '@/features/resource-optimization/pages/ProjectSectionRiskIssuesPage';
import ProjectSectionDocumentsPage from '@/features/resource-optimization/pages/ProjectSectionDocumentsPage';
import ProjectSectionCommunicationPage from '@/features/resource-optimization/pages/ProjectSectionCommunicationPage';
import ProjectSectionAllocationIntegrationPage from '@/features/resource-optimization/pages/ProjectSectionAllocationIntegrationPage';
import ProjectSectionKpiPage from '@/features/resource-optimization/pages/ProjectSectionKpiPage';
import ProjectSectionAnalyticsPage from '@/features/resource-optimization/pages/ProjectSectionAnalyticsPage';
import ProjectSectionApprovalsPage from '@/features/resource-optimization/pages/ProjectSectionApprovalsPage';
import ProjectSectionClosurePage from '@/features/resource-optimization/pages/ProjectSectionClosurePage';
import ProjectSectionAIRecommendationsPage from '@/features/resource-optimization/pages/ProjectSectionAIRecommendationsPage';
import ProjectSectionPlanningPage from '@/features/resource-optimization/pages/ProjectSectionPlanningPage';
import ProjectSectionLifecyclePage from '@/features/resource-optimization/pages/ProjectSectionLifecyclePage';
import ProjectSectionFinancePage from '@/features/resource-optimization/pages/ProjectSectionFinancePage';
import ProjectSectionExecutionPage from '@/features/resource-optimization/pages/ProjectSectionExecutionPage';
import WorkforceTrainingRecommendationsPage from '@/features/training-development/WorkforceTrainingRecommendationsPage';
import EmployeeEngagementPage from '@/features/employee-satisfaction-engagement/EmployeeEngagementPage';
import ResourceStaffingHubPage from '@/features/resource-optimization/pages/ResourceStaffingHubPage';
import ProjectDemandsPage from '@/features/resource-optimization/pages/ProjectDemandsPage';
import ProjectAllocationsPage from '@/features/resource-optimization/pages/ProjectAllocationsPage';
import AllocationDashboardPage from '@/features/resource-optimization/allocation-section/AllocationDashboardPage';
import AllocationMasterListPage from '@/features/resource-optimization/allocation-section/AllocationMasterListPage';
import AllocationMasterFormPage from '@/features/resource-optimization/allocation-section/AllocationMasterFormPage';
import AllocationMasterDetailPage from '@/features/resource-optimization/allocation-section/AllocationMasterDetailPage';
import AllocationRequestsPage from '@/features/resource-optimization/allocation-section/AllocationRequestsPage';
import AllocationWorkspacePage from '@/features/resource-optimization/allocation-section/AllocationWorkspacePage';
import ResourceDashboardPage from '@/features/resource-optimization/resource-section/ResourceDashboardPage';
import ResourceMasterListPage from '@/features/resource-optimization/resource-section/ResourceMasterListPage';
import ResourceMasterFormPage from '@/features/resource-optimization/resource-section/ResourceMasterFormPage';
import ResourceMasterDetailPage from '@/features/resource-optimization/resource-section/ResourceMasterDetailPage';
import ResourceModulePage from '@/features/resource-optimization/resource-section/ResourceModulePage';

function TakeAssessmentRedirect() {
  const { token } = useParams();
  return <Navigate to={`/assessment/take/${token}`} replace />;
}


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

export function AppRoutes() {
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
