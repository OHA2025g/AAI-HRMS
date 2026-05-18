import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { projectSectionApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../components/ui/breadcrumb';
import ProjectSectionPlanningPage from './ProjectSectionPlanningPage';
import ProjectSectionDemandSkillsPage from './ProjectSectionDemandSkillsPage';
import ProjectSectionFinancePage from './ProjectSectionFinancePage';
import ProjectSectionExecutionPage from './ProjectSectionExecutionPage';
import ProjectSectionRiskIssuesPage from './ProjectSectionRiskIssuesPage';
import ProjectSectionDocumentsPage from './ProjectSectionDocumentsPage';
import ProjectSectionCommunicationPage from './ProjectSectionCommunicationPage';
import ProjectSectionAllocationIntegrationPage from './ProjectSectionAllocationIntegrationPage';
import ProjectSectionKpiPage from './ProjectSectionKpiPage';
import ProjectSectionApprovalsPage from './ProjectSectionApprovalsPage';
import ProjectSectionClosurePage from './ProjectSectionClosurePage';
import ProjectSectionAIRecommendationsPage from './ProjectSectionAIRecommendationsPage';

const ProjectSectionMasterDetailPage = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [p, setP] = useState(null);
  const [allocSummary, setAllocSummary] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [projRes, allocRes] = await Promise.all([
        projectSectionApi.getProject(id),
        projectSectionApi.allocationSummary(id).catch(() => ({ data: null })),
      ]);
      setP(projRes.data || null);
      setAllocSummary(allocRes?.data || null);
    } catch (e) {
      toast.error('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!p) return <div className="text-slate-600">Project not found.</div>;

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/resource-project-optimization/projects/dashboard">Project Section</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/resource-project-optimization/projects/master">Project Master</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{p.project_code}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
            {p.project_name}
          </h1>
          <p className="text-slate-600">
            <span className="font-medium">{p.project_code}</span>
            {p.client_name ? ` • ${p.client_name}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to={`/resource-project-optimization/projects/master/${encodeURIComponent(p.id)}/edit`}>Edit master</Link>
          </Button>
          <Button variant="outline" onClick={load}>
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex h-auto max-w-full flex-wrap justify-start gap-1 mb-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="planning">Planning</TabsTrigger>
          <TabsTrigger value="demand">Demand</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="execution">Execution</TabsTrigger>
          <TabsTrigger value="risks">Risks</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="comms">Comms</TabsTrigger>
          <TabsTrigger value="allocations">Allocations</TabsTrigger>
          <TabsTrigger value="kpis">KPIs</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="closure">Closure</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Overview</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500">Status</p>
                  <Badge variant="secondary">{p.project_status}</Badge>
                </div>
                <div>
                  <p className="text-slate-500">Priority</p>
                  <p className="font-medium">{p.project_priority}</p>
                </div>
                <div>
                  <p className="text-slate-500">Health</p>
                  <p className="font-medium">{p.project_health}</p>
                </div>
                <div>
                  <p className="text-slate-500">Type</p>
                  <p className="font-medium">{p.project_type}</p>
                </div>
                <div>
                  <p className="text-slate-500">Dates</p>
                  <p className="font-medium">
                    {(p.start_date || '-') + ' → ' + (p.end_date || '-')}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Planned duration</p>
                  <p className="font-medium">{p.planned_duration_days ?? '-'} days</p>
                </div>
                <div>
                  <p className="text-slate-500">Business unit</p>
                  <p className="font-medium">{p.business_unit || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Department</p>
                  <p className="font-medium">{p.department || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Budget</p>
                  <p className="font-medium">{p.project_budget ? p.project_budget.toLocaleString() : '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Expected revenue</p>
                  <p className="font-medium">{p.expected_revenue ? p.expected_revenue.toLocaleString() : '-'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Allocation snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total allocations</span>
                  <span className="font-medium">{allocSummary?.total_allocations ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Active</span>
                  <span className="font-medium">{allocSummary?.active_allocations ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pending</span>
                  <span className="font-medium">{allocSummary?.pending_allocations ?? 0}</span>
                </div>
                <Button asChild variant="outline" className="w-full mt-2">
                  <Link to="/resource-project-optimization/projects/allocation">Open allocation hub</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
          <p className="text-sm text-slate-500">
            Use the tabs above for planning (WBS + dependencies), execution alerts, financials, and governance. Sub-modules are also available from the left sidebar.
          </p>
        </TabsContent>

        <TabsContent value="planning">
          <ProjectSectionPlanningPage embedProjectId={p.id} />
        </TabsContent>
        <TabsContent value="demand">
          <ProjectSectionDemandSkillsPage embedProjectId={p.id} />
        </TabsContent>
        <TabsContent value="finance">
          <ProjectSectionFinancePage embedProjectId={p.id} />
        </TabsContent>
        <TabsContent value="execution">
          <ProjectSectionExecutionPage embedProjectId={p.id} />
        </TabsContent>
        <TabsContent value="risks">
          <ProjectSectionRiskIssuesPage embedProjectId={p.id} />
        </TabsContent>
        <TabsContent value="documents">
          <ProjectSectionDocumentsPage embedProjectId={p.id} />
        </TabsContent>
        <TabsContent value="comms">
          <ProjectSectionCommunicationPage embedProjectId={p.id} />
        </TabsContent>
        <TabsContent value="allocations">
          <ProjectSectionAllocationIntegrationPage embedProjectId={p.id} />
        </TabsContent>
        <TabsContent value="kpis">
          <ProjectSectionKpiPage embedProjectId={p.id} />
        </TabsContent>
        <TabsContent value="approvals">
          <ProjectSectionApprovalsPage embedProjectId={p.id} />
        </TabsContent>
        <TabsContent value="closure">
          <ProjectSectionClosurePage embedProjectId={p.id} />
        </TabsContent>
        <TabsContent value="ai">
          <ProjectSectionAIRecommendationsPage embedProjectId={p.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectSectionMasterDetailPage;
