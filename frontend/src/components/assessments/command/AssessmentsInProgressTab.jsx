import React from 'react';
import { chartTitleCase } from '../../../lib/chartTitleCase';
import {
  buildInProgressWorklistRows,
  buildStatusDistribution,
  buildAgeingBuckets,
  buildQueueSummary,
  getStatusBadgeClass,
  getEmailBadgeClass,
  getEmailLabel,
} from '../../../lib/assessmentsCommandUtils';
import CopyTakeLinkButton from '../CopyTakeLinkButton';

export default function AssessmentsInProgressTab({
  submissions,
  headline,
  perms,
  onGrade,
  onResendEmail,
  onCancelSubmission,
  onTabChange,
}) {
  const rows = buildInProgressWorklistRows(submissions);
  const queue = buildQueueSummary(submissions, headline);
  const statusDist = buildStatusDistribution(submissions);
  const ageing = buildAgeingBuckets(submissions);
  const staleCount = ageing.find((b) => b.label === '15+ days')?.count ?? 0;
  const noEmailCount = rows.filter((r) => !r.emailStatus || r.emailStatus === 'none').length;

  return (
    <div className="as-tab-content" data-testid="assessments-in-progress-tab">
      <section className="as-command">
        <div className="as-command-card">
          <h3>In-progress assessment queue</h3>
          <div className="as-big">{queue.count}</div>
          <p className="as-muted">Candidates invited but not fully scored</p>
          <div className="as-progress">
            <span style={{ width: `${queue.workloadPct}%` }} />
          </div>
          <span className="as-badge">{queue.workloadPct}% of active assessment workload</span>
        </div>
        <div className="as-command-card">
          <h3>AI priority signals</h3>
          <div className="as-action-list">
            <div className="as-action">
              <span>Overdue beyond 48 hours</span>
              <b className="red">{queue.overdue}</b>
            </div>
            <div className="as-action">
              <span>No email delivery configured</span>
              <b className="orange">{queue.noEmail}</b>
            </div>
            <div className="as-action">
              <span>Ready for manual grading</span>
              <b className="green">{queue.readyToGrade}</b>
            </div>
          </div>
        </div>
        <div className="as-command-card">
          <h3>Recommended action</h3>
          <p>
            <b>Send reminders to pending candidates and grade highest-fit candidates first.</b>
          </p>
          <p className="as-muted">
            Expected impact: improve completion by <b className="green">18%</b> this week.
          </p>
        </div>
      </section>

      <section className="as-ip-layout">
        <div className="as-card">
          <div className="as-card-head">
            <div>
              <h2>Candidate assessment worklist</h2>
              <p className="as-muted">Prioritized by age, fit relevance, and scoring status.</p>
            </div>
          </div>
          <div className="as-candidate-list">
            {rows.length ? (
              rows.slice(0, 10).map((row) => (
                <div key={row.id} className="as-candidate">
                  <div className="as-person">{row.initials}</div>
                  <div className="as-name">
                    <b>{row.name}</b>
                    <span>{row.assessment}</span>
                  </div>
                  <div>
                    <span className={getStatusBadgeClass(row.status)}>{row.status}</span>
                    <div className="as-meta">Invited {row.invitedAt}</div>
                  </div>
                  <div className="as-stage">
                    <span className="as-meta">Completion</span>
                    <div className="as-stagebar">
                      <span style={{ width: `${row.completionPct}%` }} />
                    </div>
                  </div>
                  <div>
                    <span className={getEmailBadgeClass(row.emailStatus)}>{getEmailLabel(row.emailStatus)}</span>
                  </div>
                  <div className="as-row-actions">
                    {row.takeUrl ? (
                      <CopyTakeLinkButton takeUrl={row.takeUrl} commandStyle className="as-iconbtn" />
                    ) : (
                      <span className="as-iconbtn disabled">🔗 Copy</span>
                    )}
                    {perms.canPublish ? (
                      <button type="button" className="as-iconbtn" onClick={() => onResendEmail(row.submission)} data-testid={`resend-email-${row.id}`} title="Resend email">
                        ✉
                      </button>
                    ) : null}
                    {perms.canGrade ? (
                      <button type="button" className="as-iconbtn grade" onClick={() => onGrade(row.submission)} data-testid={`grade-submission-${row.id}`}>
                        Grade
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <p className="as-muted">No active submissions</p>
            )}
          </div>
        </div>

        <aside className="as-side-stack">
          <div className="as-card">
            <div className="as-card-head">
              <h3>{chartTitleCase('Status distribution')}</h3>
              <span className="as-badge">{statusDist.total} active</span>
            </div>
            <div className="as-donut-wrap">
              <div className="as-donut-sm" style={{ background: statusDist.gradient }} />
              <div className="as-legend-col">
                {statusDist.legend.map((l) => (
                  <div key={l.label}>
                    <span className="as-dot" style={{ background: l.color }} />
                    {l.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="as-card">
            <div className="as-card-head">
              <h3>{chartTitleCase('Ageing by invite date')}</h3>
              <span className="as-badge warn">SLA watch</span>
            </div>
            <div className="as-timeline">
              {ageing.map((b) => (
                <div key={b.label} className="as-time-row">
                  <span>{b.label}</span>
                  <div className="as-bar">
                    <i style={{ width: `${b.widthPct}%` }} />
                  </div>
                  <b>{b.count}</b>
                </div>
              ))}
            </div>
            {staleCount > 0 ? (
              <div className="as-insight-box">
                <b>AI insight:</b> {staleCount} candidates are likely to go stale. Send reminders or move to inactive queue.
              </div>
            ) : null}
          </div>
          <div className="as-card">
            <div className="as-card-head">
              <h3>Email readiness</h3>
              <span className={`as-badge ${noEmailCount > 0 ? 'red' : 'green'}`}>
                {noEmailCount > 0 ? 'Action needed' : 'Ready'}
              </span>
            </div>
            <p className="as-muted">
              {noEmailCount > 0
                ? `${noEmailCount} row(s) show no email delivery. Fix SMTP before bulk reminders.`
                : 'Email delivery looks configured for visible rows.'}
            </p>
            <button type="button" className="as-btn primary full" onClick={() => onTabChange?.('overview')}>
              Open email operations
            </button>
          </div>
        </aside>
      </section>

      <section className="as-card table-card">
        <div className="as-card-head">
          <div>
            <h3>Full in-progress register</h3>
            <p className="as-muted">Operational view for grading, reminders, and link management.</p>
          </div>
        </div>
        <table className="as-table">
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Assessment</th>
              <th>Status</th>
              <th>Invited</th>
              <th>Email</th>
              <th>Priority</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.assessment}</td>
                <td><span className={getStatusBadgeClass(row.status)}>{row.status}</span></td>
                <td>{row.invitedAt}</td>
                <td><span className={getEmailBadgeClass(row.emailStatus)}>{getEmailLabel(row.emailStatus)}</span></td>
                <td>{row.priority}</td>
                <td>
                  {perms.canGrade ? (
                    <button type="button" className="as-iconbtn grade" onClick={() => onGrade(row.submission)}>
                      Grade
                    </button>
                  ) : null}
                  {perms.canPublish ? (
                    <button type="button" className="as-iconbtn" onClick={() => onCancelSubmission(row.submission)} data-testid={`cancel-submission-${row.id}`} title="Cancel">
                      ✕
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={7} className="as-muted center">No active submissions</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <div className="as-sticky-actions">
        <div>
          <b>{queue.count} assessments in progress</b>
          <br />
          <span className="as-muted">Recommended next step: fix email dispatch and remind candidates older than 48 hours.</span>
        </div>
      </div>
    </div>
  );
}
