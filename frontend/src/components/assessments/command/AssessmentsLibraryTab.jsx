import React from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck } from 'lucide-react';
import { chartTitleCase } from '../../../lib/chartTitleCase';
import {
  buildLibraryCardMeta,
  buildCoverageRows,
  buildLibraryRecommendations,
  getStatusBadgeClass,
  getTypeBadgeClass,
} from '../../../lib/assessmentsCommandUtils';

function LibrarySearchRow({ jobs, ws }) {
  return (
    <section className="as-searchrow">
      <input
        placeholder="Search assessments, roles, skills..."
        value={ws.searchQ}
        onChange={(e) => ws.setFilter('q', e.target.value)}
      />
      <select value={ws.jobFilter || ''} onChange={(e) => ws.setFilter('job_id', e.target.value)}>
        <option value="">All jobs</option>
        {(jobs || []).map((j) => (
          <option key={j.id} value={j.id}>
            {j.title}
          </option>
        ))}
      </select>
      <select value={ws.typeFilter || ''} onChange={(e) => ws.setFilter('type', e.target.value)}>
        <option value="">All types</option>
        <option value="SCREENING">Screening</option>
        <option value="CORE_SKILL">Core Skill</option>
        <option value="WORK_SIMULATION">Work Simulation</option>
        <option value="BEHAVIORAL">Behavioral</option>
      </select>
      <select value={ws.usageFilter || ''} onChange={(e) => ws.setFilter('usage', e.target.value)}>
        <option value="">All status</option>
        <option value="in_use">In use</option>
        <option value="unused">Unused</option>
        <option value="stale">Stale (30d+)</option>
        <option value="missing">Missing for job</option>
      </select>
      <select value={ws.sortFilter || '-created_at'} onChange={(e) => ws.setFilter('sort', e.target.value)} data-testid="assessment-sort-filter">
        <option value="-created_at">Newest first</option>
        <option value="created_at">Oldest first</option>
        <option value="title">Title A–Z</option>
        <option value="-usage">Most invited</option>
        <option value="usage">Least invited</option>
      </select>
    </section>
  );
}

function LibraryCard({ meta, perms, handlers }) {
  const { assessment } = meta;
  return (
    <article className="as-library-card" data-testid={`assessment-card-${meta.id}`}>
      <div className="as-assessment-head">
        <div className="as-assess-icon">▣</div>
        <div className="as-badges">
          <span className={getTypeBadgeClass(meta.type)}>{(meta.type || '').replace(/_/g, ' ')}</span>
          <span className={getStatusBadgeClass(meta.status)}>{meta.status}</span>
          {meta.isPrimary ? <span className="as-badge primary-b">Primary</span> : null}
        </div>
      </div>
      <h3>{meta.title}</h3>
      <div className="as-meta">
        <span>▥ {meta.jobTitle}</span>
        <span>◷ {meta.duration} min · {meta.createdAt}</span>
        <span>❔ {meta.questionCount} questions · {meta.invited} invited · {meta.passed} passed</span>
      </div>
      <div className="as-pipeline">Pipeline: {meta.sent} sent · {meta.cleared} cleared</div>
      <div className="as-scoreline">
        <span className="as-marks">{meta.marks} marks</span>
        <div className="as-actions-row">
          <Link to={`/pipeline?job=${meta.jobId}&stage=ASSESSMENT`} className="as-icon-btn" title="Open pipeline">
            ↗
          </Link>
          {handlers.onDuplicate && perms.canGenerate ? (
            <button type="button" className="as-icon-btn" onClick={() => handlers.onDuplicate(assessment)} data-testid={`duplicate-assessment-${meta.id}`} title="Duplicate">
              ⧉
            </button>
          ) : null}
          {handlers.onPublish && meta.status !== 'ACTIVE' && perms.canPublish ? (
            <button type="button" className="as-icon-btn" onClick={() => handlers.onPublish(assessment)} data-testid={`publish-assessment-${meta.id}`} title="Publish">
              ⇧
            </button>
          ) : null}
          {handlers.onInvite && meta.status === 'ACTIVE' && perms.canPublish ? (
            <button type="button" className="as-icon-btn" onClick={() => handlers.onInvite(assessment)}>
              Invite
            </button>
          ) : null}
          {handlers.onSetPrimary && meta.status === 'ACTIVE' && !meta.isPrimary && perms.canPublish ? (
            <button type="button" className="as-icon-btn" onClick={() => handlers.onSetPrimary(assessment)} data-testid={`set-primary-assessment-${meta.id}`} title="Set primary">
              ☆
            </button>
          ) : null}
          {handlers.onArchive && meta.status !== 'ARCHIVED' && perms.canPublish ? (
            <button type="button" className="as-icon-btn" onClick={() => handlers.onArchive(assessment)} data-testid={`archive-assessment-${meta.id}`} title="Archive">
              ▱
            </button>
          ) : null}
          <button type="button" className="as-icon-btn preview" onClick={() => handlers.onPreview(meta.id)}>
            ◉ Preview
          </button>
        </div>
      </div>
    </article>
  );
}

export default function AssessmentsLibraryTab({
  ws,
  jobs,
  perms,
  handlers,
  onGenerateClick,
  results,
}) {
  const isMissingUsageView = ws.usageFilter === 'missing';
  const missingJobRows = (ws.summary?.by_job || []).filter(
    (row) => !row.has_assessment && (row.sent > 0 || row.cleared > 0)
  );
  const cards = (ws.assessments || []).map((a) => buildLibraryCardMeta(a, jobs));
  const coverageRows = buildCoverageRows(ws.summary?.by_job || []);
  const recommendations = buildLibraryRecommendations(ws.assessments, ws.summary?.by_job, results);

  return (
    <div className="as-tab-content" data-testid="assessments-library-tab">
      <LibrarySearchRow jobs={jobs} ws={ws} />

      {isMissingUsageView ? (
        <section className="as-chart-card wide">
          <h3>Jobs missing assessments</h3>
          <table className="as-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Test status</th>
                <th>Invited</th>
                <th>Completed</th>
                <th>Pass rate</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {missingJobRows.map((row) => (
                <tr key={row.job_id}>
                  <td>{row.title}</td>
                  <td><span className="as-tag warn">Missing</span></td>
                  <td>{row.invited ?? 0}</td>
                  <td>{row.completed ?? 0}</td>
                  <td>—</td>
                  <td>Generate test</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : cards.length > 0 ? (
        <section className="as-library-grid">
          {cards.map((meta) => (
            <LibraryCard key={meta.id} meta={meta} perms={perms} handlers={handlers} />
          ))}
        </section>
      ) : (
        <section className="as-empty-state">
          <ClipboardCheck className="as-empty-icon" aria-hidden />
          <h3>No assessments yet</h3>
          <p>Generate your first AI-powered assessment</p>
          {perms.canGenerate ? (
            <button type="button" className="as-btn primary" onClick={onGenerateClick}>
              ✦ Generate Assessment
            </button>
          ) : null}
        </section>
      )}

      {!isMissingUsageView ? (
        <>
          <section className="as-ai-panel">
            <div>
              <h3>🧠 AI Library Recommendations</h3>
              <p>Suggested actions to improve assessment coverage and candidate movement.</p>
            </div>
            {recommendations.map((r) => (
              <div key={r.label} className="as-ai-card">
                <b>{r.value}</b>
                <small>{r.label}</small>
              </div>
            ))}
          </section>

          <section className="as-chart-card table-card">
            <h3>{chartTitleCase('Assessment coverage by role')}</h3>
            <table className="as-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Test status</th>
                  <th>Invited</th>
                  <th>Completed</th>
                  <th>Pass rate</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {coverageRows.map((row) => (
                  <tr key={row.role}>
                    <td>{row.role}</td>
                    <td><span className={`as-tag ${row.statusClass}`}>{row.status}</span></td>
                    <td>{row.invited}</td>
                    <td>{row.completed}</td>
                    <td>{row.passRate}</td>
                    <td>{row.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      ) : null}
    </div>
  );
}
