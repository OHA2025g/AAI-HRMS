import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePlacementFilters } from '../context/PlacementFiltersContext';
import { notificationsApi } from '../lib/api';
import { jobsApi } from '../lib/api';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  GitBranch,
  UserPlus,
  ClipboardCheck,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X,
  Sparkles,
  Bot,
  Cog,
  ChevronLeft,
  ChevronRight,
  Bell,
  UserCog,
  BarChart3,
  BarChart2,
  TrendingUp,
  FolderKanban,
  GraduationCap,
  Heart,
  Zap,
  Shield,
  Layers,
  ChevronDown,
  Link2,
  Database,
  FileText,
  UserCheck,
  CalendarClock,
  AlertTriangle,
  Percent,
  RefreshCw,
  Scale,
  Columns3,
  History,
  BellRing,
  Telescope,
  Cpu,
  Tags,
  Award,
  Target,
  BookOpen,
  LineChart,
  Armchair,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  BUSINESS_ORG_PILLARS,
  getDepartmentsForPillar,
  getSubDepartmentsForDepartment,
} from '../data/businessOrgHierarchy';
import { getTrainingDevelopmentNavChildren } from '../training-development/navConfig';
import { getHighSkillRetentionNavChildren } from '../high-skill-talent-retention/navConfig';
import { getEmployeeLifecycleNavChildren } from '../employee-lifecycle-management/navConfig';
import { getWorkforceIntelNavChildren } from '../workforce-intelligence/navConfig';
import { getCostOptimizationNavChildren } from '../cost-optimization-automation/navConfig';
import { getEmployeeSatisfactionEngagementNavChildren } from '../employee-satisfaction-engagement/navConfig';

function isPathActive(pathname, itemPath) {
  if (pathname === itemPath) return true;
  if (itemPath === '/dashboard') return pathname === '/dashboard';
  return pathname.startsWith(`${itemPath}/`);
}

function anyChildActive(pathname, item) {
  if (!item) return false;
  if (item.path && isPathActive(pathname, item.path)) return true;
  const kids = item.children || [];
  return kids.some((c) => anyChildActive(pathname, c));
}

function flattenNavItems(groups) {
  const out = [];
  const walk = (node, parentLabels = []) => {
    if (!node) return;
    if (node.path) out.push({ path: node.path, label: node.label, icon: node.icon, parentLabels });
    (node.children || []).forEach((c) => walk(c, node.label ? [...parentLabels, node.label] : parentLabels));
  };
  groups.forEach((g) => (g.children || []).forEach((c) => walk(c, [g.label])));
  return out;
}

function buildNavGroups(user) {
  const role = user?.role;
  const isAdmin = role === 'admin';
  /** Sidebar: show project tooling to all primary app roles (API still enforces write/view). */
  const canSeeResourceProjectNav = ['admin', 'hr_admin', 'recruiter', 'hr_viewer'].includes(String(role || ''));

  /**
   * Nav supports 2-level groups plus optional 3rd-level nesting:
   * group -> children[] -> (optional) children[].
   */
  const groups = [
    {
      id: 'm9',
      label: 'Analytics & Executive Dashboard',
      icon: BarChart2,
      children: [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/executive-kpis', label: 'Executive KPIs', icon: BarChart3 },
      ],
    },
    {
      id: 'm1',
      label: 'Smart Hiring (Talent Acquisition)',
      icon: Briefcase,
      children: [
        { path: '/jobs', label: 'Jobs', icon: Briefcase },
        { path: '/candidates', label: 'Candidates', icon: Users },
        { path: '/pipeline', label: 'Pipeline', icon: GitBranch },
        { path: '/interviews', label: 'Interviews', icon: Calendar },
        { path: '/referrals', label: 'Referrals', icon: UserPlus },
        { path: '/assessments', label: 'Assessments', icon: ClipboardCheck },
      ],
    },
    {
      id: 'm2',
      label: 'Employee Lifecycle Management',
      icon: UserCog,
      children: getEmployeeLifecycleNavChildren(),
    },
    {
      id: 'm3',
      label: 'Workforce Intelligence',
      icon: TrendingUp,
      children: getWorkforceIntelNavChildren(),
    },
    {
      id: 'm4-planning',
      label: 'Resource & demand planning',
      icon: BarChart3,
      children: [
        { path: '/resource-staffing-hub', label: 'Resource & staffing hub', icon: Columns3 },
        { path: '/resource-optimization', label: 'Resource Optimization', icon: BarChart3 },
        ...(canSeeResourceProjectNav
          ? [
              { path: '/project-demands', label: 'Project Demands', icon: BarChart3 },
              { path: '/project-allocations', label: 'Project Allocations', icon: BarChart3 },
            ]
          : []),
      ],
    },
    ...(canSeeResourceProjectNav
      ? [
          {
            id: 'm4',
            label: 'Resource vs Project Optimization',
            icon: FolderKanban,
            children: [
              {
                path: '/resource-project-optimization/projects',
                label: 'Project Section',
                icon: FolderKanban,
                children: [
                  { path: '/resource-project-optimization/projects/dashboard', label: 'Project Dashboard', icon: BarChart3 },
                  { path: '/resource-project-optimization/projects/master', label: 'Project Master', icon: FolderKanban },
                  { path: '/resource-project-optimization/projects/planning', label: 'Planning & Structuring', icon: GitBranch },
                  { path: '/resource-project-optimization/projects/lifecycle', label: 'Project Lifecycle', icon: GitBranch },
                  { path: '/resource-project-optimization/projects/demand-skills', label: 'Resource Demand & Skills', icon: Briefcase },
                  { path: '/resource-project-optimization/projects/finance', label: 'Financial Management', icon: BarChart3 },
                  { path: '/resource-project-optimization/projects/execution', label: 'Execution & Tracking', icon: BarChart3 },
                  { path: '/resource-project-optimization/projects/risk-issues', label: 'Risk / Issue / Compliance', icon: Shield },
                  { path: '/resource-project-optimization/projects/documents', label: 'Documents & Knowledge', icon: ClipboardCheck },
                  { path: '/resource-project-optimization/projects/communication', label: 'Communication & Collaboration', icon: Users },
                  { path: '/resource-project-optimization/projects/allocation', label: 'Allocation Integration', icon: Users },
                  { path: '/resource-project-optimization/projects/kpi', label: 'KPI & Performance', icon: BarChart3 },
                  { path: '/resource-project-optimization/projects/analytics', label: 'Analytics & Insights', icon: TrendingUp },
                  { path: '/resource-project-optimization/projects/approvals', label: 'Governance & Approvals', icon: Settings },
                  { path: '/resource-project-optimization/projects/closure', label: 'Project Closure', icon: Shield },
                  { path: '/resource-project-optimization/projects/ai-recommendations', label: 'AI Recommendations', icon: Bot },
                ],
              },
              {
                path: '/resource-project-optimization/allocation',
                label: 'Allocation Section',
                icon: Link2,
                children: [
                  { path: '/resource-project-optimization/allocation/dashboard', label: 'Allocation Dashboard', icon: LayoutDashboard },
                  { path: '/resource-project-optimization/allocation/master', label: 'Allocation Master', icon: Database },
                  { path: '/resource-project-optimization/allocation/requests', label: 'Allocation Requests', icon: FileText },
                  { path: '/resource-project-optimization/allocation/assignment', label: 'Assignment & Scheduling', icon: UserCheck },
                  { path: '/resource-project-optimization/allocation/scheduling', label: 'Planning & Scheduling', icon: CalendarClock },
                  { path: '/resource-project-optimization/allocation/capacity-conflicts', label: 'Capacity & Conflicts', icon: AlertTriangle },
                  { path: '/resource-project-optimization/allocation/rollon-rolloff', label: 'Roll-On / Roll-Off', icon: RefreshCw },
                  { path: '/resource-project-optimization/allocation/demand-supply', label: 'Demand vs Supply', icon: Scale },
                  { path: '/resource-project-optimization/allocation/billability-commercials', label: 'Billability & Commercials', icon: Percent },
                  { path: '/resource-project-optimization/allocation/changes-release', label: 'Changes & Release', icon: History },
                  { path: '/resource-project-optimization/allocation/fulfillment-bench', label: 'Fulfillment & Bench Conversion', icon: Users },
                  { path: '/resource-project-optimization/allocation/calendar-heatmap', label: 'Calendar / Heatmap', icon: Calendar },
                  { path: '/resource-project-optimization/allocation/approvals', label: 'Approvals', icon: ClipboardCheck },
                  { path: '/resource-project-optimization/allocation/documents-notes', label: 'Documents & Notes', icon: FileText },
                  { path: '/resource-project-optimization/allocation/alerts-communication', label: 'Alerts & Communication', icon: BellRing },
                  { path: '/resource-project-optimization/allocation/analytics', label: 'Analytics', icon: Columns3 },
                  { path: '/resource-project-optimization/allocation/forecasting', label: 'Forecasting', icon: Telescope },
                  { path: '/resource-project-optimization/allocation/replacement-backup', label: 'Replacement & Backup', icon: Shield },
                  { path: '/resource-project-optimization/allocation/ai-insights', label: 'AI Allocation Insights', icon: Cpu },
                ],
              },
              {
                path: '/resource-project-optimization/resource',
                label: 'Resource Section',
                icon: Layers,
                children: [
                  { path: '/resource-project-optimization/resource/dashboard', label: 'Resource Dashboard', icon: LayoutDashboard },
                  { path: '/resource-project-optimization/resource/master', label: 'Resource Master', icon: Database },
                  { path: '/resource-project-optimization/resource/classification', label: 'Classification & Segmentation', icon: Tags },
                  { path: '/resource-project-optimization/resource/skills', label: 'Skills & Competencies', icon: Award },
                  { path: '/resource-project-optimization/resource/availability-utilization', label: 'Availability & Utilization', icon: CalendarClock },
                  { path: '/resource-project-optimization/resource/bench', label: 'Bench Management', icon: Armchair },
                  { path: '/resource-project-optimization/resource/deployment-readiness', label: 'Deployment Readiness', icon: Target },
                  { path: '/resource-project-optimization/resource/demand-matching', label: 'Demand Matching', icon: Scale },
                  { path: '/resource-project-optimization/resource/mobility-career', label: 'Mobility & Career', icon: RefreshCw },
                  { path: '/resource-project-optimization/resource/learning-certifications', label: 'Learning & Certifications', icon: BookOpen },
                  { path: '/resource-project-optimization/resource/cost-commercial', label: 'Cost & Commercial View', icon: Percent },
                  { path: '/resource-project-optimization/resource/attendance-leave-impact', label: 'Attendance & Leave Impact', icon: Calendar },
                  { path: '/resource-project-optimization/resource/documents-compliance', label: 'Documents & Compliance', icon: ClipboardCheck },
                  { path: '/resource-project-optimization/resource/notes-communication', label: 'Notes & Communication', icon: FileText },
                  { path: '/resource-project-optimization/resource/analytics', label: 'Analytics', icon: LineChart },
                  { path: '/resource-project-optimization/resource/forecasting', label: 'Forecasting', icon: Telescope },
                  { path: '/resource-project-optimization/resource/approvals-governance', label: 'Approvals & Governance', icon: ClipboardCheck },
                  { path: '/resource-project-optimization/resource/ai-insights', label: 'AI Resource Insights', icon: Cpu },
                ],
              },
            ],
          },
        ]
      : []),
    {
      id: 'm5',
      label: 'Training & Skill Development',
      icon: GraduationCap,
      children: getTrainingDevelopmentNavChildren(),
    },
    {
      id: 'm6',
      label: 'Employee Satisfaction & Engagement',
      icon: Heart,
      children: getEmployeeSatisfactionEngagementNavChildren(),
    },
    {
      id: 'm7',
      label: 'Cost Optimization & Automation',
      icon: Zap,
      children: [
        ...getCostOptimizationNavChildren(),
        ...(isAdmin
          ? [
              { path: '/admin/workflow-automation', label: 'Workflow Automation', icon: Cog },
              { path: '/admin/workflow-automation/designer', label: 'Workflow Designer', icon: Cog },
            ]
          : []),
      ],
    },
    {
      id: 'm8',
      label: 'High-Skill Talent Retention',
      icon: Shield,
      children: getHighSkillRetentionNavChildren(),
    },
  ];

  if (isAdmin) {
    groups.push({
      id: 'm10',
      label: 'Architecture & Scalability',
      icon: Layers,
      children: [
        { path: '/admin/integrations', label: 'Admin Settings & Connectors', icon: Settings },
        { path: '/admin/roles', label: 'Role Management', icon: UserCog },
      ],
    });
  }

  return groups.filter((g) => g.children.length > 0);
}

function resolvePageTitle(pathname, groups) {
  const items = flattenNavItems(groups).sort((a, b) => b.path.length - a.path.length);
  const hit = items.find((item) => isPathActive(pathname, item.path));
  return hit?.label ?? 'Dashboard';
}

function navTestId(label) {
  return `nav-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const placement = usePlacementFilters();

  const navGroups = useMemo(() => buildNavGroups(user), [user]);

  const [openGroups, setOpenGroups] = useState(() => new Set());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      navGroups.forEach((g) => {
        g.children.forEach((c) => {
          if (isPathActive(location.pathname, c.path)) {
            next.add(g.id);
          }
          const grand = c.children || [];
          if (grand.some((gc) => isPathActive(location.pathname, gc.path))) {
            next.add(g.id);
            if (c.path) next.add(`${g.id}::${c.path}`);
          }
        });
      });
      return next;
    });
  }, [location.pathname, navGroups]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const [countRes, notifsRes] = await Promise.all([
        notificationsApi.getUnreadCount(),
        notificationsApi.list(true),
      ]);
      setUnreadCount(countRes.data.unread_count || 0);
      setNotifications(notifsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setUnreadCount(0);
      setNotifications([]);
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const toggleGroup = useCallback((id) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const pageTitle = resolvePageTitle(location.pathname, navGroups);

  const ALL = '__ALL__';
  const isPipeline = location.pathname === '/pipeline';
  const [openJobs, setOpenJobs] = useState([]);

  const pillarId = placement.pillarId || '';
  const departmentId = placement.departmentId || '';
  const subDepartment = placement.subDepartment || '';
  const projectId = placement.projectId || '';
  const jobId = isPipeline ? searchParams.get('job') || '' : '';

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await jobsApi.list('OPEN');
        if (!alive) return;
        setOpenJobs(Array.isArray(res.data) ? res.data : []);
      } catch {
        if (!alive) return;
        setOpenJobs([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const _resolvePillarIdFromLabel = (label) =>
    BUSINESS_ORG_PILLARS.find((p) => p.label === label)?.id || '';

  const _resolveDepartmentIdFromLabel = (pId, deptLabel) => {
    if (!pId || !deptLabel) return '';
    return getDepartmentsForPillar(pId).find((d) => d.label === deptLabel)?.id || '';
  };

  // Pre-select filters when arriving with ?job=... but filters are missing.
  useEffect(() => {
    if (!isPipeline) return;
    if (!jobId) return;
    if (pillarId || departmentId || subDepartment || projectId) return;
    const hit = (openJobs || []).find((j) => j.id === jobId);
    if (!hit) return;

    const nextPillarId = _resolvePillarIdFromLabel(hit.business_pillar || '');
    const nextDepartmentId = _resolveDepartmentIdFromLabel(nextPillarId, hit.business_department || '');
    placement.setAll({
      pillarId: nextPillarId,
      departmentId: nextDepartmentId,
      subDepartment: hit.business_sub_department || '',
      projectId: hit.project_id || '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPipeline, jobId, openJobs]);

  const pipelinePillarLabel = BUSINESS_ORG_PILLARS.find((p) => p.id === pillarId)?.label || '';
  const pipelineDeptLabel =
    pillarId && departmentId
      ? getDepartmentsForPillar(pillarId).find((d) => d.id === departmentId)?.label || ''
      : '';

  const pipelineDepartmentOptions = pillarId ? getDepartmentsForPillar(pillarId) : [];
  const pipelineSubDepartmentOptions =
    pillarId && departmentId ? getSubDepartmentsForDepartment(pillarId, departmentId) : [];

  const pipelineFilteredJobs = (openJobs || []).filter((j) => {
    if (pipelinePillarLabel && (j?.business_pillar || '') !== pipelinePillarLabel) return false;
    if (pipelineDeptLabel && (j?.business_department || '') !== pipelineDeptLabel) return false;
    if (subDepartment && (j?.business_sub_department || '') !== subDepartment) return false;
    if (projectId && (j?.project_id || '') !== projectId) return false;
    return true;
  });

  const pipelineProjectOptions = Array.from(
    new Set(
      (pipelineFilteredJobs.length > 0 ? pipelineFilteredJobs : openJobs)
        .map((j) => (j?.project_id || '').trim())
        .filter((v) => v)
    )
  ).sort((a, b) => a.localeCompare(b));

  const setPipelineParam = (key, value) => {
    if (!isPipeline) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (!value) next.delete(key);
      else next.set(key, value);
      return next;
    });
  };

  const renderNavBody = (opts) => {
    const { forMobile } = opts;
    const closeMobile = forMobile ? () => setMobileMenuOpen(false) : undefined;

    if (sidebarCollapsed && !forMobile) {
      return (
        <div className="flex flex-col gap-1 px-1 py-2">
          {navGroups.map((group) => {
            const GIcon = group.icon;
            const anyActive = group.children.some((c) => anyChildActive(location.pathname, c));
            return (
              <DropdownMenu key={group.id}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    title={group.label}
                    data-testid={navTestId(group.label)}
                    className={`flex items-center justify-center w-full p-2.5 rounded-lg transition-colors ${
                      anyActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <GIcon className="w-5 h-5 flex-shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start" className="min-w-[220px] bg-slate-900 border-slate-700 text-slate-100">
                  <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 border-b border-slate-700 mb-1">
                    {group.label}
                  </div>
                  {group.children.map((child) => {
                    const CIcon = child.icon;
                    const active = isPathActive(location.pathname, child.path);
                    return (
                      <DropdownMenuItem key={child.path} asChild className="focus:bg-slate-800 focus:text-white cursor-pointer">
                        <Link
                          to={child.path}
                          className={`flex items-center gap-2 ${active ? 'text-indigo-300' : ''}`}
                          data-testid={navTestId(child.label)}
                        >
                          <CIcon className="w-4 h-4" />
                          {child.label}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
        </div>
      );
    }

    return (
      <div className="space-y-1 py-2 px-1">
        {navGroups.map((group) => {
          const GIcon = group.icon;
          const expanded = openGroups.has(group.id);
          const groupActive = group.children.some((c) => anyChildActive(location.pathname, c));
          return (
            <div key={group.id} className="mb-2">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                data-testid={navTestId(group.label)}
                className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-sm font-semibold transition-colors ${
                  groupActive ? 'text-white bg-slate-800/80' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                } ${forMobile ? '' : ''}`}
              >
                <GIcon className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1 min-w-0 leading-tight">{group.label}</span>
                <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </button>
              {expanded && (
                <div className="mt-1 ml-1 border-l border-slate-700 pl-2 space-y-0.5">
                  {group.children.map((child) => {
                    const CIcon = child.icon;
                    const hasKids = Array.isArray(child.children) && child.children.length > 0;
                    const active = isPathActive(location.pathname, child.path);
                    const nestedActive = anyChildActive(location.pathname, child) && !active;
                    const nestedExpanded = openGroups.has(`${group.id}::${child.path}`);
                    if (!hasKids) {
                      return (
                        <Link
                          key={child.path}
                          to={child.path}
                          onClick={closeMobile}
                          data-testid={navTestId(child.label)}
                          className={`sidebar-item mb-0.5 text-sm !py-2 ${active ? 'active' : ''}`}
                        >
                          <CIcon className="w-4 h-4 flex-shrink-0" />
                          <span className="font-medium truncate">{child.label}</span>
                        </Link>
                      );
                    }
                    return (
                      <div key={child.path} className="mb-1">
                        <button
                          type="button"
                          onClick={() => toggleGroup(`${group.id}::${child.path}`)}
                          data-testid={navTestId(child.label)}
                          className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-sm font-semibold transition-colors ${
                            nestedActive ? 'text-white bg-slate-800/50' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <CIcon className="w-4 h-4 flex-shrink-0" />
                          <span className="flex-1 min-w-0 leading-tight truncate">{child.label}</span>
                          <ChevronDown
                            className={`w-4 h-4 flex-shrink-0 transition-transform ${nestedExpanded ? 'rotate-180' : ''}`}
                          />
                        </button>
                        {nestedExpanded && (
                          <div className="mt-1 ml-3 border-l border-slate-700 pl-2 space-y-0.5">
                            {child.children.map((grand) => {
                              const GI = grand.icon;
                              const gActive = isPathActive(location.pathname, grand.path);
                              return (
                                <Link
                                  key={grand.path}
                                  to={grand.path}
                                  onClick={closeMobile}
                                  data-testid={navTestId(grand.label)}
                                  className={`sidebar-item mb-0.5 text-sm !py-2 ${gActive ? 'active' : ''}`}
                                >
                                  <GI className="w-4 h-4 flex-shrink-0" />
                                  <span className="font-medium truncate">{grand.label}</span>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-slate-900 text-slate-200 transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-72'
        }`}
      >
        <div
          className={`h-16 flex items-center border-b border-slate-800 ${sidebarCollapsed ? 'justify-center px-2' : 'px-4'}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <span className="font-bold text-lg text-white font-['Outfit'] truncate">AAI-HRMS</span>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto">{renderNavBody({ forMobile: false })}</nav>

        <div className="p-2 border-t border-slate-800">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            data-testid="sidebar-toggle"
          >
            {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            {!sidebarCollapsed && <span className="text-sm">Collapse</span>}
          </button>
        </div>
      </aside>

      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileMenuOpen(false)} />
      )}

      <aside
        className={`lg:hidden fixed inset-y-0 left-0 w-72 bg-slate-900 text-slate-200 z-50 transform transition-transform duration-300 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-white font-['Outfit'] truncate">AAI-HRMS</span>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-white flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="overflow-y-auto max-h-[calc(100vh-4rem)]">{renderNavBody({ forMobile: true })}</nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <button
              className="lg:hidden text-slate-600 hover:text-slate-900 flex-shrink-0"
              onClick={() => setMobileMenuOpen(true)}
              data-testid="mobile-menu-btn"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold text-slate-900 font-['Outfit'] hidden sm:block truncate">
              {pageTitle}
            </h1>

            {/* Placement filters (Pipeline & job-scoped views); Jobs/Candidates lists stay unfiltered */}
            <div className="hidden xl:flex items-center gap-2 min-w-0 ml-2">
                <Select
                  value={pillarId || ALL}
                  onValueChange={(v) => {
                    const next = v === ALL ? '' : v;
                    placement.setPillarId(next);
                    placement.setDepartmentId('');
                    placement.setSubDepartment('');
                    placement.setProjectId('');

                    // Keep pipeline URL in sync when on /pipeline
                    setPipelineParam('pillar', next);
                    setPipelineParam('dept', '');
                    setPipelineParam('sub', '');
                    setPipelineParam('project', '');
                  }}
                >
                  <SelectTrigger className="w-44" data-testid="pipeline-pillar-filter">
                    <SelectValue placeholder="Pillar (All)" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[min(60vh,420px)]">
                    <SelectItem value={ALL}>All</SelectItem>
                    {BUSINESS_ORG_PILLARS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={departmentId || ALL}
                  onValueChange={(v) => {
                    const next = v === ALL ? '' : v;
                    placement.setDepartmentId(next);
                    placement.setSubDepartment('');
                    placement.setProjectId('');

                    setPipelineParam('dept', next);
                    setPipelineParam('sub', '');
                    setPipelineParam('project', '');
                  }}
                  disabled={!pillarId}
                >
                  <SelectTrigger className="w-44" data-testid="pipeline-department-filter">
                    <SelectValue placeholder={pillarId ? 'Department (All)' : 'Dept (select pillar)'} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[min(60vh,420px)]">
                    <SelectItem value={ALL}>All</SelectItem>
                    {pipelineDepartmentOptions.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={subDepartment || ALL}
                  onValueChange={(v) => {
                    const next = v === ALL ? '' : v;
                    placement.setSubDepartment(next);
                    placement.setProjectId('');

                    setPipelineParam('sub', next);
                    setPipelineParam('project', '');
                  }}
                  disabled={!departmentId}
                >
                  <SelectTrigger className="w-52" data-testid="pipeline-subdepartment-filter">
                    <SelectValue placeholder={departmentId ? 'Sub-dept (All)' : 'Sub-dept (select dept)'} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[min(60vh,420px)]">
                    <SelectItem value={ALL}>All</SelectItem>
                    {pipelineSubDepartmentOptions.map((sub) => (
                      <SelectItem key={sub} value={sub}>
                        {sub}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={projectId || ALL}
                  onValueChange={(v) => {
                    const next = v === ALL ? '' : v;
                    placement.setProjectId(next);
                    setPipelineParam('project', next);
                  }}
                  disabled={pipelineProjectOptions.length === 0}
                >
                  <SelectTrigger className="w-36" data-testid="pipeline-projectid-filter">
                    <SelectValue placeholder={pipelineProjectOptions.length > 0 ? 'Project (All)' : 'Project (none)'} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[min(60vh,420px)]">
                    <SelectItem value={ALL}>All</SelectItem>
                    {pipelineProjectOptions.map((pid) => (
                      <SelectItem key={pid} value={pid}>
                        {pid}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  data-testid="clear-placement-filters"
                  onClick={() => {
                    placement.clearAll();
                    setPipelineParam('pillar', '');
                    setPipelineParam('dept', '');
                    setPipelineParam('sub', '');
                    setPipelineParam('project', '');
                  }}
                >
                  Clear filters
                </Button>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="hidden md:inline-flex gap-2" data-testid="ai-assistants-menu">
                  <Bot className="h-4 w-4" />
                  AI assistants
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Cross-app</div>
                <DropdownMenuItem onClick={() => navigate('/hr-copilot')}>HR Copilot (global)</DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Module copilots</div>
                <DropdownMenuItem onClick={() => navigate('/workforce-intelligence/ai-copilot')}>
                  Workforce Intelligence copilot
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/cost-optimization-automation/ai-copilot')}>
                  Cost optimization copilot
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/employee-satisfaction-engagement/copilot')}>
                  Engagement copilot
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" data-testid="notifications-btn">
                  <Bell className="w-5 h-5 text-slate-500" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between px-3 py-2 border-b">
                  <span className="font-semibold text-sm">Notifications</span>
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" className="text-xs text-indigo-600" onClick={handleMarkAllRead}>
                      Mark all read
                    </Button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.slice(0, 5).map((notif) => (
                      <DropdownMenuItem key={notif.id} className="flex flex-col items-start py-3">
                        <span className="font-medium text-sm text-slate-900">{notif.title}</span>
                        <span className="text-xs text-slate-500 mt-1">{notif.message}</span>
                        <span className="text-xs text-slate-400 mt-1">
                          {new Date(notif.created_at).toLocaleString()}
                        </span>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <div className="py-8 text-center text-sm text-slate-500">No new notifications</div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2" data-testid="user-menu-btn">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-indigo-100 text-indigo-700 text-sm font-medium">
                      {getInitials(user?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm font-medium text-slate-700">{user?.full_name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  className="flex items-center gap-2"
                  onClick={() => navigate(user?.role === 'admin' ? '/admin/integrations' : '/dashboard')}
                  data-testid="user-menu-settings"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="flex items-center gap-2 text-red-600"
                  onClick={handleLogout}
                  data-testid="logout-btn"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
