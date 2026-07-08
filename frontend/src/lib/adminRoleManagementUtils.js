export const ROLE_MATRIX = [
  {
    key: 'admin',
    name: 'Admin',
    tag: 'Full access',
    tagClass: 'purple',
    perms: [
      { label: 'Config', on: true },
      { label: 'Roles', on: true },
      { label: 'Connectors', on: true },
      { label: 'Reports', on: true },
    ],
  },
  {
    key: 'hiring_manager',
    name: 'Hiring Manager',
    tag: 'Hiring flow',
    tagClass: 'blue',
    perms: [
      { label: 'Jobs', on: true },
      { label: 'Pipeline', on: true },
      { label: 'Interviews', on: true },
      { label: 'Admin', on: false },
    ],
  },
  {
    key: 'technical_manager',
    name: 'Technical Manager',
    tag: 'Assessment',
    tagClass: 'green',
    perms: [
      { label: 'Assessments', on: true },
      { label: 'Feedback', on: true },
      { label: 'Skills', on: true },
      { label: 'Config', on: false },
    ],
  },
  {
    key: 'project_manager',
    name: 'Project Manager',
    tag: 'Project view',
    tagClass: 'orange',
    perms: [
      { label: 'Project KPIs', on: true },
      { label: 'Candidates', on: true },
      { label: 'Connectors', on: false },
      { label: 'Roles', on: false },
    ],
  },
];

export const GOVERNANCE_TIPS = [
  {
    tone: 'green',
    title: 'Least privilege is healthy',
    description: 'No non-admin user currently has connector or config access.',
  },
  {
    tone: 'blue',
    title: 'Suggested review cycle',
    description: 'Run access certification every 30 days for hiring and assessment roles.',
  },
  {
    tone: 'orange',
    title: 'Protect admin role',
    description: 'Keep admin non-editable and require approval for elevation requests.',
  },
];

export const AUDIT_EVENTS = [
  {
    title: 'System scan completed',
    detail: 'no role conflicts found.',
    when: 'Today, 10:42 AM',
  },
  {
    title: 'QA Admin reviewed role catalog',
    detail: 'for Admin module.',
    when: 'Yesterday, 05:18 PM',
  },
  {
    title: 'Project Manager role validated',
    detail: 'against candidate and project-level access.',
    when: '25 May 2026, 04:12 PM',
  },
];

export function rolePillClass(role) {
  if (role === 'admin') return 'admin';
  if (role === 'hiring_manager') return 'hm';
  if (role === 'technical_manager') return 'tm';
  if (role === 'project_manager') return 'pm';
  return 'default';
}

export function userInitials(name, email) {
  const source = String(name || email || '?').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function isRoleEditable(user, selfUserId) {
  if (!user) return false;
  if (user.id === selfUserId) return false;
  if (user.role === 'admin') return false;
  return true;
}

export function computeGovernanceStats(users, draftRoles = {}) {
  const total = users.length;
  const adminUsers = users.filter((u) => u.role === 'admin').length;
  const editableRoles = users.filter((u) => u.role !== 'admin').length;
  const orphans = users.filter((u) => !u.role).length;
  const pendingChanges = Object.keys(draftRoles).length;
  const reviewNeeded = orphans + (pendingChanges > 3 ? 1 : 0);

  let score = 100;
  if (orphans > 0) score -= orphans * 8;
  if (adminUsers === 0) score -= 15;
  if (pendingChanges > 0) score -= Math.min(8, pendingChanges * 2);
  score = Math.max(0, Math.min(100, score));

  const usersWithRole = users.filter((u) => !!u.role).length;
  const mappedPct = total ? Math.round((usersWithRole / total) * 100) : 100;

  return {
    score,
    total,
    adminUsers,
    editableRoles,
    reviewNeeded,
    orphans,
    mappedPct,
    conflicts: 0,
    pendingChanges,
  };
}

export function exportUsersCsv(users) {
  const header = ['id', 'full_name', 'email', 'role'];
  const rows = users.map((u) => [u.id, u.full_name, u.email, u.role].map(csvEscape));
  const blob = new Blob([[header.join(','), ...rows.map((r) => r.join(','))].join('\n')], {
    type: 'text/csv;charset=utf-8',
  });
  return blob;
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}
