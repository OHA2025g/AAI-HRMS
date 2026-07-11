import { describe, expect, it } from 'vitest';
import {
  getSmartHiringSidebarNav,
  isSmartHiringNavItemActive,
  resolveSmartHiringNavVariant,
  SMART_HIRING_OVERVIEW_SIDEBAR_NAV,
  SMART_HIRING_OPERATIONAL_SIDEBAR_NAV,
} from '@/shared/config/smartHiringNav';

describe('smartHiringNav', () => {
  it('overview nav matches mock executive labels', () => {
    const labels = SMART_HIRING_OVERVIEW_SIDEBAR_NAV.map((item) => item.label);
    expect(labels).toContain('Overview');
    expect(labels).toContain('Requisitions');
    expect(labels).toContain('Talent Pipeline');
    expect(labels).toContain('Offers & Joining');
    expect(labels).toContain('AI Insights');
  });

  it('operational nav matches mock recruiter labels', () => {
    const labels = SMART_HIRING_OPERATIONAL_SIDEBAR_NAV.map((item) => item.label);
    expect(labels).toEqual([
      'Dashboard',
      'Jobs',
      'Candidates',
      'Bulk Upload',
      'Pipeline',
      'Interviews',
      'Referrals',
      'Assessments',
      'AI Hiring Intelligence',
      'Admin',
    ]);

    const aiGroup = SMART_HIRING_OPERATIONAL_SIDEBAR_NAV.find((i) => i.label === 'AI Hiring Intelligence');
    expect(aiGroup?.children?.map((c) => c.label)).toEqual([
      'Career Trajectory',
      'Compare Trajectories',
      'Phase 2 Fit Simulation',
    ]);

    const adminGroup = SMART_HIRING_OPERATIONAL_SIDEBAR_NAV.find((i) => i.label === 'Admin');
    expect(adminGroup?.children?.map((c) => c.label)).toEqual([
      'Hiring Dashboard Config',
      'Career Trajectory',
      'Settings & Connectors',
      'Role Management',
      'Database Maintenance',
    ]);
  });

  it('hides admin-only and role-gated items', () => {
    const recruiter = getSmartHiringSidebarNav({ role: 'recruiter' }, 'operational');
    expect(recruiter.some((i) => i.label === 'Bulk Upload')).toBe(true);
    expect(recruiter.some((i) => i.label === 'Admin')).toBe(false);

    const adminOverview = getSmartHiringSidebarNav({ role: 'admin' }, 'overview');
    expect(adminOverview.some((i) => i.label === 'Settings')).toBe(true);
  });

  it('resolves active paths for candidates vs bulk import', () => {
    const candidates = SMART_HIRING_OPERATIONAL_SIDEBAR_NAV.find((i) => i.path === '/candidates');
    const bulk = SMART_HIRING_OPERATIONAL_SIDEBAR_NAV.find((i) => i.path === '/candidates/import');
    expect(isSmartHiringNavItemActive('/candidates', '', candidates)).toBe(true);
    expect(isSmartHiringNavItemActive('/candidates/import', '', candidates)).toBe(false);
    expect(isSmartHiringNavItemActive('/candidates/import', '', bulk)).toBe(true);
  });

  it('highlights overview tab on dashboard root', () => {
    const overview = SMART_HIRING_OVERVIEW_SIDEBAR_NAV.find((i) => i.label === 'Overview');
    const analytics = SMART_HIRING_OVERVIEW_SIDEBAR_NAV.find((i) => i.label === 'Analytics');
    expect(isSmartHiringNavItemActive('/dashboard', '', overview)).toBe(true);
    expect(isSmartHiringNavItemActive('/dashboard', '?tab=analytics', overview)).toBe(false);
    expect(isSmartHiringNavItemActive('/dashboard', '?tab=analytics', analytics)).toBe(true);
  });

  it('uses operational sidebar on dashboard and all other routes', () => {
    expect(resolveSmartHiringNavVariant('/dashboard', '')).toBe('operational');
    expect(resolveSmartHiringNavVariant('/dashboard', '?tab=overview')).toBe('operational');
    expect(resolveSmartHiringNavVariant('/jobs', '')).toBe('operational');
  });

  it('highlights Dashboard nav item on any dashboard tab', () => {
    const dashboard = SMART_HIRING_OPERATIONAL_SIDEBAR_NAV.find((i) => i.path === '/dashboard');
    expect(isSmartHiringNavItemActive('/dashboard', '', dashboard)).toBe(true);
    expect(isSmartHiringNavItemActive('/dashboard', '?tab=analytics', dashboard)).toBe(true);
    expect(isSmartHiringNavItemActive('/dashboard', '?tab=pipeline', dashboard)).toBe(true);
  });

  it('resolves exact ai-hiring child routes without cross-highlighting', () => {
    const aiGroup = SMART_HIRING_OPERATIONAL_SIDEBAR_NAV.find((i) => i.label === 'AI Hiring Intelligence');
    const career = aiGroup.children.find((c) => c.label === 'Career Trajectory');
    const compare = aiGroup.children.find((c) => c.label === 'Compare Trajectories');
    expect(isSmartHiringNavItemActive('/ai-hiring/candidate-fit/career-trajectory', '', career)).toBe(true);
    expect(isSmartHiringNavItemActive('/ai-hiring/candidate-fit/career-trajectory/compare', '', career)).toBe(false);
    expect(isSmartHiringNavItemActive('/ai-hiring/candidate-fit/career-trajectory/compare', '', compare)).toBe(true);
  });

  it('resolves exact smart hiring admin child routes', () => {
    const adminGroup = SMART_HIRING_OPERATIONAL_SIDEBAR_NAV.find((i) => i.label === 'Admin');
    const hiringConfig = adminGroup.children.find((c) => c.label === 'Hiring Dashboard Config');
    const roles = adminGroup.children.find((c) => c.label === 'Role Management');
    expect(isSmartHiringNavItemActive('/admin/hiring-dashboard-config', '', hiringConfig)).toBe(true);
    expect(isSmartHiringNavItemActive('/admin/roles', '', roles)).toBe(true);
    expect(isSmartHiringNavItemActive('/admin/roles', '', hiringConfig)).toBe(false);
  });
});
