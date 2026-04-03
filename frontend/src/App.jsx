import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PlacementFiltersProvider } from './context/PlacementFiltersContext';
import { Toaster } from './components/ui/sonner';
import Layout from './components/Layout';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import JobsPage from './pages/JobsPage';
import CreateJobPage from './pages/CreateJobPage';
import JobDetailPage from './pages/JobDetailPage';
import CandidatesPage from './pages/CandidatesPage';
import CandidateProfilePage from './pages/CandidateProfilePage';
import PipelinePage from './pages/PipelinePage';
import ReferralsPage from './pages/ReferralsPage';
import AssessmentsPage from './pages/AssessmentsPage';
import InterviewsPage from './pages/InterviewsPage';
import AdminIntegrationsPage from './pages/AdminIntegrationsPage';
import AdminRoleManagementPage from './pages/AdminRoleManagementPage';
import AdminWorkflowAutomationPage from './pages/AdminWorkflowAutomationPage';
import WorkflowDesignerPage from './pages/WorkflowDesignerPage';
import HrCopilotPage from './pages/HrCopilotPage';
import TransformationPage from './pages/TransformationPage';
import EmployeesPage from './pages/EmployeesPage';
import WorkforceInventoryPage from './pages/WorkforceInventoryPage';
import ExecutiveKpiPage from './pages/ExecutiveKpiPage';
import EmployeeLifecyclePage from './pages/EmployeeLifecyclePage';
import WorkforceIntelligencePage from './pages/WorkforceIntelligencePage';
import WorkforceResourceOptimizationPage from './pages/WorkforceResourceOptimizationPage';
import WorkforceTrainingRecommendationsPage from './pages/WorkforceTrainingRecommendationsPage';
import EmployeeEngagementPage from './pages/EmployeeEngagementPage';
import EmployeeRetentionPage from './pages/EmployeeRetentionPage';
import ProjectDemandsPage from './pages/ProjectDemandsPage';
import ProjectAllocationsPage from './pages/ProjectAllocationsPage';

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

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      } />
      
      {/* Protected Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardPage />
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
      
      <Route path="/assessments" element={
        <ProtectedRoute>
          <AssessmentsPage />
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

      <Route path="/workforce-intelligence" element={
        <ProtectedRoute>
          <WorkforceIntelligencePage />
        </ProtectedRoute>
      } />

      <Route path="/resource-optimization" element={
        <ProtectedRoute>
          <WorkforceResourceOptimizationPage />
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

      <Route path="/training-recommendations" element={
        <ProtectedRoute>
          <WorkforceTrainingRecommendationsPage />
        </ProtectedRoute>
      } />

      <Route path="/employee-engagement" element={
        <ProtectedRoute>
          <EmployeeEngagementPage />
        </ProtectedRoute>
      } />

      <Route path="/employee-retention" element={
        <ProtectedRoute>
          <EmployeeRetentionPage />
        </ProtectedRoute>
      } />

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

      <Route path="/admin/workflow-automation/designer" element={
        <AdminProtectedRoute>
          <WorkflowDesignerPage />
        </AdminProtectedRoute>
      } />
      
      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
