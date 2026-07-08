import React, { useState } from 'react';
import { chartTitleCase } from '../../../lib/chartTitleCase';
import {
  buildResultsSummary,
  buildResultsLeaderboardRows,
  buildResultInsights,
  formatResultsDistribution,
  formatCompletionTimeline,
} from '../../../lib/assessmentsCommandUtils';

export default function AssessmentsResultsTab({
  results,
  headline,
  scoreBuckets,
  trends,
  ws,
  onExportCsv,
  onClearScoreFilter,
}) {
  const [search, setSearch] = useState('');
  const summary = buildResultsSummary(results, headline?.headline || headline);
  const leaderboard = buildResultsLeaderboardRows(results);
  const insights = buildResultInsights(results, headline?.headline || headline);
  const distribution = formatResultsDistribution(scoreBuckets);
  const timeline = formatCompletionTimeline(trends);

  const filtered = leaderboard.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.assessment.toLowerCase().includes(q);
  });

  return (
    <div className="as-tab-content" data-testid="assessments-results-tab">
      <section className="as-result-hero">
        <div className="as-metric">
          <span>Average score</span>
          <b>{summary.avgScore}</b>
          <div className="as-progress">
            <i style={{ width: `${summary.avgScorePct}%` }} />
          </div>
        </div>
        <div className="as-metric">
          <span>Pass rate</span>
          <b>{summary.passRate}</b>
          <div className="as-progress green">
            <i style={{ width: `${summary.passRatePct}%` }} />
          </div>
        </div>
        <div className="as-metric">
          <span>Completed submissions</span>
          <b>{summary.completed}</b>
          <div className="as-progress">
            <i style={{ width: `${summary.completedPct}%` }} />
          </div>
        </div>
        <div className="as-metric">
          <span>High potential candidates</span>
          <b>{summary.highPotential}</b>
          <div className="as-progress orange">
            <i style={{ width: `${summary.highPotentialPct}%` }} />
          </div>
        </div>
      </section>

      {(ws.scoreMin || ws.scoreMax) ? (
        <div className="as-filter-badge-row">
          <span className="as-badge" data-testid="results-score-filter-badge">
            Score {ws.scoreMin || '0'}–{ws.scoreMax || '100'}%
            {ws.scoreBucket ? ` (${ws.scoreBucket})` : ''}
          </span>
          <button type="button" className="as-btn ghost" onClick={onClearScoreFilter} data-testid="results-clear-score-filter">
            Clear filter
          </button>
        </div>
      ) : null}

      <section className="as-results-grid">
        <div className="as-card">
          <div className="as-card-head">
            <div>
              <h3>Results leaderboard</h3>
              <p className="as-muted">Scored assessment submissions ranked by fit, score, and recency</p>
            </div>
            <button type="button" className="as-btn" onClick={onExportCsv} disabled={!results.length} data-testid="export-results-csv">
              ⇩ Export CSV
            </button>
          </div>
          <div className="as-searchbar">
            <input placeholder="Search candidate or assessment..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="as-table-wrap">
            <table className="as-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Candidate</th>
                  <th>Assessment</th>
                  <th>Score</th>
                  <th>Score health</th>
                  <th>Pass</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.submission.id} data-testid={`result-row-${row.submission.id}`}>
                    <td className="as-rank">#{row.rank}</td>
                    <td>
                      <div className="as-candidate-cell">
                        <div className="as-avatar2">{row.initials}</div>
                        <div>
                          <b>{row.name}</b>
                          {row.jobTitle ? <span className="as-muted">{row.jobTitle}</span> : null}
                        </div>
                      </div>
                    </td>
                    <td>{row.assessment}</td>
                    <td><span className="as-score-pill">{row.score}</span></td>
                    <td className="as-bar-cell">
                      <div className="as-bar-small">
                        <i style={{ width: `${row.scorePct}%` }} />
                      </div>
                    </td>
                    <td><span className={row.passed ? 'as-pass' : 'as-fail'}>{row.passed ? 'Pass' : 'Fail'}</span></td>
                    <td>{row.completedAt}</td>
                  </tr>
                ))}
                {!filtered.length ? (
                  <tr>
                    <td colSpan={7} className="as-muted center">No scored results yet</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="as-card">
          <h3>AI result insights</h3>
          <p className="as-muted">What the scoring pattern suggests</p>
          <div className="as-insight-list">
            {insights.map((ins) => (
              <div key={ins.title} className={`as-insight-item ${ins.type === 'warn' ? 'warn' : ''}`}>
                <div className="as-insight-dot">{ins.type === 'warn' ? '!' : '✓'}</div>
                <div>
                  <b>{ins.title}</b>
                  <span className="as-muted">{ins.text}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="as-bottom-grid">
        <div className="as-card">
          <h3>{chartTitleCase('Score distribution')}</h3>
          <p className="as-muted">Submission count by score range</p>
          <div className="as-dist">
            {distribution.length ? (
              distribution.map((d) => (
                <div key={d.label} className="as-dist-col" style={{ height: `${d.heightPct}%` }}>
                  <span>{d.label}</span>
                </div>
              ))
            ) : (
              <p className="as-muted">No scores yet</p>
            )}
          </div>
        </div>
        <div className="as-card">
          <h3>{chartTitleCase('Assessment completion timeline')}</h3>
          <p className="as-muted">Velocity of completed assessments by week</p>
          <div className="as-timeline">
            {timeline.map((t) => (
              <div key={t.label} className="as-time-row">
                <span>{t.label}</span>
                <div className="as-bar green-bar">
                  <i style={{ width: `${t.widthPct}%` }} />
                </div>
                <b>{t.count}</b>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
