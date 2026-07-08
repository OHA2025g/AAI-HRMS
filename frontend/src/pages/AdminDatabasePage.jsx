import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Database, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { adminApi, jobsApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  collectionBarWidth,
  exportStatsSnapshot,
  filterCollections,
  previewFlushTargets,
  protectedRecordCount,
} from '../lib/adminDatabaseUtils';
import AdminDatabaseOrgFilterBar from '../components/admin/database/AdminDatabaseOrgFilterBar';
import { SMART_HIRING_ONLY } from '../config/appModules';

const AdminDatabasePage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [openJobs, setOpenJobs] = useState([]);
  const [search, setSearch] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [preserveMigrations, setPreserveMigrations] = useState(true);
  const [preserveCurrentUser, setPreserveCurrentUser] = useState(true);
  const [flushing, setFlushing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminApi.getDatabaseStats();
      setStats(res.data || null);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to load database stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

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

  const phrase = stats?.flush_confirm_phrase || 'FLUSH ALL DATA';
  const canFlush = stats?.flush_enabled !== false;
  const confirmOk = confirmText.trim() === phrase;

  const collections = stats?.collections || [];
  const maxCount = useMemo(
    () => Math.max(...collections.map((row) => Number(row.document_count) || 0), 1),
    [collections]
  );
  const filteredCollections = useMemo(
    () => filterCollections(collections, search),
    [collections, search]
  );
  const flushTargets = useMemo(
    () => previewFlushTargets(collections, { preserveMigrations, preserveCurrentUser }),
    [collections, preserveMigrations, preserveCurrentUser]
  );
  const protectedCount = protectedRecordCount({ preserveMigrations, preserveCurrentUser });

  const downloadSnapshot = () => {
    if (!stats) {
      toast.error('No database stats loaded yet');
      return;
    }
    const blob = exportStatsSnapshot(stats);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `database-snapshot-${stats.db_name || 'aai_hrms'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFlush = async () => {
    if (!confirmOk) {
      toast.error(`Type "${phrase}" to confirm`);
      return;
    }
    try {
      setFlushing(true);
      const res = await adminApi.flushDatabase({
        confirm: confirmText.trim(),
        preserve_migration_registry: preserveMigrations,
        preserve_current_user: preserveCurrentUser,
      });
      const dropped = res.data?.dropped_collections?.length ?? 0;
      toast.success(`Database flushed (${dropped} collections dropped)`);
      setConfirmText('');
      setPreviewOpen(false);
      await loadStats();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Database flush failed');
    } finally {
      setFlushing(false);
    }
  };

  const scrollToFlush = () => {
    document.getElementById('dbm-flush-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="hiring-dashboard-root top-operational dbm-root" data-testid="admin-database-command-root">
      {SMART_HIRING_ONLY ? (
        <header className="dbm-topbar" aria-label="Database maintenance filters">
          <div className="dbm-topbar-left">
            <span className="dbm-page-label">Database maintenance</span>
            <AdminDatabaseOrgFilterBar jobs={openJobs} />
          </div>
        </header>
      ) : null}

      <div className="dbm-content">
        <div className="dbm-hero">
          <div className="dbm-title">
            <h1>
              <Database className="h-7 w-7" aria-hidden /> Database Maintenance
            </h1>
            <p>
              Inspect MongoDB usage, monitor data volume, and safely manage destructive database operations.
            </p>
          </div>
          <div className="dbm-hero-actions">
            <button type="button" className="dbm-btn" onClick={loadStats} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
              Refresh
            </button>
            <button type="button" className="dbm-btn dbm-btn-primary" onClick={downloadSnapshot} disabled={!stats}>
              Download snapshot
            </button>
          </div>
        </div>

        <section className="dbm-status-grid">
          <div className="dbm-status-card">
            <h3>Total collections</h3>
            <div className="dbm-num">{stats?.collection_count ?? '—'}</div>
            <small>MongoDB collections</small>
          </div>
          <div className="dbm-status-card">
            <h3>Total documents</h3>
            <div className="dbm-num">{stats?.document_count?.toLocaleString?.() ?? stats?.document_count ?? '—'}</div>
            <small>Application records</small>
          </div>
          <div className="dbm-status-card good">
            <h3>Protected records</h3>
            <div className="dbm-num">{protectedCount}</div>
            <small>Migration registry + admin account</small>
          </div>
          <div className="dbm-status-card warn">
            <h3>Risk level</h3>
            <div className="dbm-num">High</div>
            <small>Flush is irreversible</small>
          </div>
        </section>

        <div className="dbm-alert">
          <div className="dbm-alert-ico" aria-hidden>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <b>Destructive operation zone</b>
            <p>
              Flushing removes jobs, candidates, applications, assessments, employees, and related collections in{' '}
              <strong>{stats?.db_name || 'aai_hrms'}</strong>. Keep the protected checkboxes enabled unless you are
              rebuilding the full environment.
            </p>
          </div>
          <button type="button" className="dbm-btn dbm-btn-ghost-red" onClick={scrollToFlush}>
            Review safeguards
          </button>
        </div>

        {loading ? (
          <div className="dbm-loading">
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
          </div>
        ) : (
          <section className="dbm-grid">
            <div className="dbm-card">
              <div className="dbm-toolbar">
                <div>
                  <h2>Database overview</h2>
                  <p className="dbm-sub">
                    Collections ranked by document count. Use this view to identify heavy tables before cleanup.
                  </p>
                </div>
                <input
                  className="dbm-search"
                  placeholder="Search collection..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="dbm-chip-row">
                <span className="dbm-chip">{stats?.collection_count ?? 0} collections</span>
                <span className="dbm-chip green">{stats?.document_count ?? 0} documents</span>
                <span className="dbm-chip">DB: {stats?.db_name || 'aai_hrms'}</span>
              </div>
              <div className="dbm-table-wrap">
                <table className="dbm-table">
                  <thead>
                    <tr>
                      <th>Collection</th>
                      <th>Usage</th>
                      <th className="dbm-count">Documents</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCollections.map((row) => (
                      <tr key={row.name}>
                        <td className="dbm-mono">{row.name}</td>
                        <td>
                          <div className="dbm-bar">
                            <i style={{ width: collectionBarWidth(row.document_count, maxCount) }} />
                          </div>
                        </td>
                        <td className="dbm-count">{Number(row.document_count || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <aside id="dbm-flush-panel" className="dbm-card dbm-danger-panel">
              <h2>Flush all data</h2>
              <p className="dbm-sub">Drops every collection except protected system records. This cannot be undone.</p>

              <label className="dbm-check">
                <input
                  type="checkbox"
                  checked={preserveMigrations}
                  onChange={(e) => setPreserveMigrations(e.target.checked)}
                />
                <span>
                  <b>Preserve migration registry</b>
                  <span className="dbm-small-note">
                    Keeps <span className="dbm-mono">_schema_migrations</span> so migrations are not re-run from scratch.
                  </span>
                </span>
              </label>

              <label className="dbm-check">
                <input
                  type="checkbox"
                  checked={preserveCurrentUser}
                  onChange={(e) => setPreserveCurrentUser(e.target.checked)}
                />
                <span>
                  <b>Preserve current admin account</b>
                  <span className="dbm-small-note">
                    Keeps <span className="dbm-mono">{user?.email || 'qa_admin@aai-hrms.local'}</span> so you can sign in after flush.
                  </span>
                </span>
              </label>

              <div className="dbm-confirm">
                <label htmlFor="dbm-flush-confirm">Type {phrase} to confirm</label>
                <input
                  id="dbm-flush-confirm"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={phrase}
                  autoComplete="off"
                  data-testid="admin-database-flush-confirm"
                />
              </div>

              <div className="dbm-footer-actions">
                <button
                  type="button"
                  className="dbm-btn dbm-btn-danger"
                  disabled={!canFlush || !confirmOk || flushing}
                  onClick={handleFlush}
                  data-testid="admin-database-flush-btn"
                >
                  {flushing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Trash2 className="h-4 w-4" aria-hidden />}
                  Flush entire database
                </button>
                <button type="button" className="dbm-btn" onClick={() => setPreviewOpen(true)}>
                  Preview affected collections
                </button>
              </div>

              {!canFlush ? (
                <p className="dbm-small-note dbm-disabled-note">Flush is disabled on this server (ALLOW_DB_FLUSH=0).</p>
              ) : null}

              <div className="dbm-mini-cards">
                <div className="dbm-mini-card">
                  <b>Recovery</b>
                  <span>
                    Re-seed with <span className="dbm-mono">seed_qa_baseline.py</span> or restart Docker.
                  </span>
                </div>
                <div className="dbm-mini-card">
                  <b>Recommended</b>
                  <span>Export a snapshot before running destructive cleanup.</span>
                </div>
              </div>
            </aside>
          </section>
        )}
      </div>

      {previewOpen ? (
        <div className="dbm-dialog-backdrop" role="presentation" onClick={() => setPreviewOpen(false)}>
          <div className="dbm-dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3>Preview affected collections</h3>
            <p>
              {flushTargets.length} collection{flushTargets.length === 1 ? '' : 's'} would be dropped with current safeguards.
            </p>
            <div className="dbm-preview-list">
              {flushTargets.slice(0, 40).map((row) => (
                <div key={row.name} className="dbm-preview-row">
                  <span className="dbm-mono">{row.name}</span>
                  <span>{Number(row.document_count || 0).toLocaleString()}</span>
                </div>
              ))}
              {flushTargets.length > 40 ? (
                <p className="dbm-small-note">…and {flushTargets.length - 40} more collections</p>
              ) : null}
            </div>
            <div className="dbm-dialog-actions">
              <button type="button" className="dbm-btn" onClick={() => setPreviewOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AdminDatabasePage;
