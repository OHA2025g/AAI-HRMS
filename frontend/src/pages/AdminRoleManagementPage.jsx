import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Download, Loader2, Plus, Settings } from 'lucide-react';
import { adminApi, jobsApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import {
  AUDIT_EVENTS,
  GOVERNANCE_TIPS,
  ROLE_MATRIX,
  computeGovernanceStats,
  exportUsersCsv,
  isRoleEditable,
  rolePillClass,
  userInitials,
} from '../lib/adminRoleManagementUtils';
import AdminRoleManagementOrgFilterBar from '../components/admin/role-management/AdminRoleManagementOrgFilterBar';
import { SMART_HIRING_ONLY } from '../config/appModules';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'admin' },
  { value: 'hr_admin', label: 'hr_admin' },
  { value: 'hr_viewer', label: 'hr_viewer' },
  { value: 'recruiter', label: 'recruiter' },
  { value: 'hiring_manager', label: 'hiring_manager' },
  { value: 'technical_manager', label: 'technical_manager' },
  { value: 'project_manager', label: 'project_manager' },
  { value: 'viewer', label: 'viewer' },
];

const AdminRoleManagementPage = () => {
  const { user: selfUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [openJobs, setOpenJobs] = useState([]);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [totalPages, setTotalPages] = useState(1);
  const [qDraft, setQDraft] = useState('');
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [draftRoles, setDraftRoles] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  const roleParam = useMemo(() => (roleFilter === 'all' ? undefined : roleFilter), [roleFilter]);

  const stats = useMemo(() => computeGovernanceStats(users, draftRoles), [users, draftRoles]);

  const pendingChanges = useMemo(
    () =>
      Object.entries(draftRoles)
        .map(([userId, nextRole]) => {
          const user = users.find((u) => u.id === userId);
          if (!user || user.role === nextRole) return null;
          return { userId, nextRole, user };
        })
        .filter(Boolean),
    [draftRoles, users]
  );

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await adminApi.listUsers({
        q: q || undefined,
        role: roleParam,
        page,
        page_size: pageSize,
      });
      const payload = res.data || {};
      setUsers(payload.items || []);
      setTotalPages(payload.total_pages || 1);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, q, roleParam]);

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

  const onSearch = () => {
    setPage(1);
    setQ(qDraft.trim());
  };

  const getEffectiveRole = (u) => {
    if (!u) return '';
    return draftRoles[u.id] ?? u.role;
  };

  const setDraftRole = (user, nextRole) => {
    if (!user || !isRoleEditable(user, selfUser?.id)) return;
    if (nextRole === user.role) {
      setDraftRoles((prev) => {
        const copy = { ...prev };
        delete copy[user.id];
        return copy;
      });
      return;
    }
    setDraftRoles((prev) => ({ ...prev, [user.id]: nextRole }));
  };

  const resetDrafts = () => setDraftRoles({});

  const applySelectedChanges = async () => {
    if (!pendingChanges.length) {
      toast.message('No pending role changes');
      return;
    }
    setSaving(true);
    try {
      for (const change of pendingChanges) {
        await adminApi.updateUserRole(change.userId, { role: change.nextRole });
      }
      toast.success(`Updated ${pendingChanges.length} user role(s)`);
      setDraftRoles({});
      setConfirmOpen(false);
      await fetchUsers();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to update roles');
    } finally {
      setSaving(false);
    }
  };

  const exportUsers = () => {
    const blob = exportUsersCsv(users);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'role-management-users.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAuditLog = () => {
    const blob = new Blob([JSON.stringify(AUDIT_EVENTS, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'role-management-audit.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="hiring-dashboard-root top-operational arm-root" data-testid="admin-role-management-command-root">
      {SMART_HIRING_ONLY ? (
        <header className="arm-topbar" aria-label="Role management filters">
          <div className="arm-topbar-left">
            <div className="arm-page-name">Role Management</div>
            <AdminRoleManagementOrgFilterBar jobs={openJobs} />
          </div>
        </header>
      ) : null}

      <div className="arm-content">
        <div className="arm-hero">
          <div>
            <h1>Role Management</h1>
            <p>
              Assign Phase-1 roles, control access to employee master, workforce skills, executive KPIs, and admin
              operations.
            </p>
          </div>
          <div className="arm-hero-actions">
            <button type="button" className="arm-btn" onClick={exportUsers}>
              <Download className="h-4 w-4" aria-hidden /> Export users
            </button>
            <button type="button" className="arm-btn arm-btn-green" onClick={() => toast.message('Invite user coming soon')}>
              <Plus className="h-4 w-4" aria-hidden /> Invite user
            </button>
            <button
              type="button"
              className="arm-btn arm-btn-primary"
              disabled={saving || !pendingChanges.length}
              onClick={() => setConfirmOpen(true)}
              data-testid="admin-role-save-changes"
            >
              Save role changes
            </button>
          </div>
        </div>

        <section className="arm-summary">
          <div className="arm-score-card">
            <h3>Access governance score</h3>
            <div className="arm-big">
              {stats.score}
              <span>/100</span>
            </div>
            <span className={cn('arm-tag', stats.score >= 85 ? 'green' : 'orange')}>
              {stats.score >= 85 ? '✓ Healthy access posture' : 'Review recommended'}
            </span>
          </div>
          <div className="arm-mini-card">
            <h3>Total users</h3>
            <b>{stats.total}</b>
            <span className="arm-tag gray">Active accounts</span>
          </div>
          <div className="arm-mini-card">
            <h3>Admin users</h3>
            <b>{stats.adminUsers}</b>
            <span className="arm-tag purple">Locked role</span>
          </div>
          <div className="arm-mini-card">
            <h3>Editable roles</h3>
            <b>{stats.editableRoles}</b>
            <span className="arm-tag blue">Dropdown enabled</span>
          </div>
          <div className="arm-mini-card">
            <h3>Review needed</h3>
            <b>{stats.reviewNeeded}</b>
            <span className={cn('arm-tag', stats.reviewNeeded === 0 ? 'green' : 'orange')}>
              {stats.reviewNeeded === 0 ? 'No violations' : 'Pending review'}
            </span>
          </div>
        </section>

        {loading ? (
          <div className="arm-loading">
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
          </div>
        ) : (
          <>
            <section className="arm-grid">
              <div className="arm-card">
                <div className="arm-section-head">
                  <div>
                    <h2>Users & role assignment</h2>
                    <p>Search users and update access levels without leaving the page.</p>
                  </div>
                  <button type="button" className="arm-btn" onClick={() => toast.message('Role catalog is shown in the access matrix')}>
                    <Settings className="h-4 w-4" aria-hidden /> Manage role catalog
                  </button>
                </div>

                <div className="arm-search-row">
                  <input
                    className="arm-input"
                    placeholder="Search by name, email, or ID"
                    value={qDraft}
                    onChange={(e) => setQDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                  />
                  <select className="arm-input" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}>
                    <option value="all">All roles</option>
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="arm-btn arm-btn-primary" onClick={onSearch}>
                    Search
                  </button>
                </div>

                <div className="arm-table-wrap">
                  <table className="arm-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>Current role</th>
                        <th>Update to</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => {
                        const editable = isRoleEditable(u, selfUser?.id);
                        const effectiveRole = getEffectiveRole(u);
                        const hasDraft = draftRoles[u.id] && draftRoles[u.id] !== u.role;
                        return (
                          <tr key={u.id}>
                            <td>
                              <div className="arm-user">
                                <div className="arm-avatar-sm">{userInitials(u.full_name, u.email)}</div>
                                <div>
                                  <b>{u.full_name}</b>
                                  <small>{u.id}</small>
                                </div>
                              </div>
                            </td>
                            <td>{u.email}</td>
                            <td>
                              <span className={cn('arm-role-pill', rolePillClass(u.role))}>{u.role}</span>
                            </td>
                            <td>
                              <select
                                className="arm-role-select"
                                value={effectiveRole}
                                disabled={!editable || saving}
                                onChange={(e) => setDraftRole(u, e.target.value)}
                              >
                                {ROLE_OPTIONS.map((r) => (
                                  <option key={r.value} value={r.value}>
                                    {r.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              {!editable ? (
                                <span className="arm-disabled">Not editable</span>
                              ) : hasDraft ? (
                                <span className="arm-action">Pending save</span>
                              ) : (
                                <span className="arm-action">Change in dropdown</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 ? (
                  <div className="arm-pagination">
                    <button type="button" className="arm-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      Prev
                    </button>
                    <span>
                      Page {page} of {totalPages}
                    </span>
                    <button type="button" className="arm-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                      Next
                    </button>
                  </div>
                ) : null}

                <div className="arm-bottom-actions">
                  <button
                    type="button"
                    className="arm-btn arm-btn-primary"
                    disabled={saving || !pendingChanges.length}
                    onClick={() => setConfirmOpen(true)}
                    data-testid="admin-role-apply-changes"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                    Apply selected changes
                  </button>
                  <button type="button" className="arm-btn" onClick={resetDrafts} disabled={!pendingChanges.length}>
                    Reset unsaved edits
                  </button>
                  <button type="button" className="arm-btn" onClick={downloadAuditLog}>
                    Download audit log
                  </button>
                </div>
              </div>

              <aside className="arm-side">
                <div className="arm-card">
                  <div className="arm-section-head">
                    <div>
                      <h2>Role access matrix</h2>
                      <p>Quick view of what each role can control.</p>
                    </div>
                  </div>
                  <div className="arm-matrix">
                    {ROLE_MATRIX.map((role) => (
                      <div key={role.key} className="arm-role-card">
                        <div className="arm-role-top">
                          <b>{role.name}</b>
                          <span className={cn('arm-tag', role.tagClass)}>{role.tag}</span>
                        </div>
                        <div className="arm-perm-list">
                          {role.perms.map((perm) => (
                            <span key={perm.label} className={cn('arm-perm', perm.on && 'on')}>
                              {perm.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="arm-card arm-audit-card">
                  <div className="arm-section-head">
                    <div>
                      <h2>AI governance tips</h2>
                      <p>Recommended controls for safer access.</p>
                    </div>
                  </div>
                  <div className="arm-tips">
                    {GOVERNANCE_TIPS.map((tip) => (
                      <div key={tip.title} className={cn('arm-tip', tip.tone)}>
                        <b>{tip.title}</b>
                        <p>{tip.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </section>

            <section className="arm-card arm-audit-trail">
              <div className="arm-section-head">
                <div>
                  <h2>Role health & audit trail</h2>
                  <p>Recent access governance activity and permission coverage.</p>
                </div>
                <button type="button" className="arm-btn" onClick={downloadAuditLog}>
                  View full history
                </button>
              </div>
              <div className="arm-access">
                <div className="arm-access-cell">
                  <b>{stats.total}</b>
                  <span>Mapped users</span>
                </div>
                <div className="arm-access-cell">
                  <b>{stats.mappedPct}%</b>
                  <span>Users with role</span>
                </div>
                <div className="arm-access-cell">
                  <b>{stats.orphans}</b>
                  <span>Orphan accounts</span>
                </div>
                <div className="arm-access-cell">
                  <b>{stats.conflicts}</b>
                  <span>Conflicts detected</span>
                </div>
              </div>
              <div className="arm-timeline">
                {AUDIT_EVENTS.map((event) => (
                  <div key={event.title} className="arm-event">
                    <span className="arm-dot" aria-hidden />
                    <div>
                      <p>
                        <b>{event.title}</b> — {event.detail}
                      </p>
                      <small>{event.when}</small>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>

      {confirmOpen ? (
        <div className="arm-dialog-backdrop" role="presentation" onClick={() => !saving && setConfirmOpen(false)}>
          <div
            className="arm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="arm-confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="arm-confirm-title">Confirm role changes</h3>
            <p>
              Apply {pendingChanges.length} pending role change{pendingChanges.length === 1 ? '' : 's'}?
            </p>
            <ul className="arm-confirm-list">
              {pendingChanges.map((change) => (
                <li key={change.userId}>
                  {change.user.email}: {change.user.role} → {change.nextRole}
                </li>
              ))}
            </ul>
            <div className="arm-dialog-actions">
              <button type="button" className="arm-btn" disabled={saving} onClick={() => setConfirmOpen(false)}>
                Cancel
              </button>
              <button type="button" className="arm-btn arm-btn-primary" disabled={saving} onClick={applySelectedChanges}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Apply
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AdminRoleManagementPage;
