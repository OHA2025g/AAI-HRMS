import React, { useMemo, useState } from 'react';
import { Target } from 'lucide-react';
import { Button } from '../ui/button';
import JobDetailCandidateCard from './JobDetailCandidateCard';
import {
  collectSourceOptions,
  computeCandidatesSummary,
  filterAndSortApplications,
  FIT_FILTER_OPTIONS,
  SORT_OPTIONS,
} from '../../lib/jobDetailCandidatesUtils';

export default function JobDetailCandidatesTab({
  applications,
  jobId,
  trajSummaries,
  trajLoading,
  reloadTrajSummaries,
  perms,
  stageUpdatingId,
  advanceApplicationStage,
  canAdvanceApplicationStage,
  nextPipelineStep,
  onFindMatches,
}) {
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [fitFilter, setFitFilter] = useState('all');
  const [sort, setSort] = useState('best_fit');

  const summary = useMemo(() => computeCandidatesSummary(applications), [applications]);
  const sourceOptions = useMemo(() => collectSourceOptions(applications), [applications]);

  const filteredApps = useMemo(
    () =>
      filterAndSortApplications(applications, {
        search: search.trim(),
        sourceFilter,
        fitFilter,
        sort,
      }),
    [applications, search, sourceFilter, fitFilter, sort]
  );

  const fitFilterLabel =
    FIT_FILTER_OPTIONS.find((o) => o.value === fitFilter)?.label || 'All';
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label || 'Best fit';

  if (applications.length === 0) {
    return (
      <div className="jd-cand-empty">
        <div className="jd-cand-empty-icon" aria-hidden>
          ♙
        </div>
        <h3>No candidates yet</h3>
        <p>Find matching candidates or add referrals</p>
        <Button type="button" onClick={onFindMatches} className="jd-cand-empty-btn">
          <Target className="jd-cand-empty-btn-icon" aria-hidden />
          Find Matches
        </Button>
      </div>
    );
  }

  return (
    <>
      <section className="jd-cand-summary" data-testid="candidates-summary">
        <div className="jd-cand-summary-card">
          <small>Total Candidates</small>
          <b>{summary.total}</b>
          <div className="jd-cand-up">↑ active pipeline</div>
        </div>
        <div className="jd-cand-summary-card">
          <small>Excellent Match</small>
          <b>{summary.excellent}</b>
          <div className="jd-cand-up">80%+ fit score</div>
        </div>
        <div className="jd-cand-summary-card">
          <small>Good Match</small>
          <b>{summary.good}</b>
          <div className="jd-cand-warn">70–80% fit score</div>
        </div>
        <div className="jd-cand-summary-card">
          <small>Ready for Next Round</small>
          <b>{summary.readyForNext}</b>
          <div className="jd-cand-up">recommended by AI</div>
        </div>
        <div className="jd-cand-summary-card">
          <small>Avg Fit Score</small>
          <b>{summary.avgFit != null ? `${summary.avgFit}%` : '—'}</b>
          <div className="jd-cand-up">↑ strong candidate pool</div>
        </div>
      </section>

      <div className="jd-cand-toolbar">
        <label className="jd-cand-search">
          <span className="jd-cand-search-icon" aria-hidden>
            ⌕
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidates by name, skill, source, or fit score..."
            aria-label="Search candidates"
          />
        </label>
        <div className="jd-cand-chips">
          <label className="jd-cand-chip">
            <span>Source: {sourceFilter === 'All' ? 'All' : sourceFilter}</span>
            <span className="jd-cand-chip-caret" aria-hidden>
              ⌄
            </span>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              aria-label="Filter by source"
            >
              {sourceOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
          <label className="jd-cand-chip">
            <span>Fit: {fitFilterLabel}</span>
            <span className="jd-cand-chip-caret" aria-hidden>
              ⌄
            </span>
            <select
              value={fitFilter}
              onChange={(e) => setFitFilter(e.target.value)}
              aria-label="Filter by fit"
            >
              {FIT_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="jd-cand-chip">
            <span>Sort: {sortLabel}</span>
            <span className="jd-cand-chip-caret" aria-hidden>
              ⌄
            </span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort candidates"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {filteredApps.length > 0 ? (
        <section className="jd-cand-grid" data-testid="candidates-grid">
          {filteredApps.map((app) => (
            <JobDetailCandidateCard
              key={app.id}
              app={app}
              jobId={jobId}
              trajSummary={trajSummaries?.[app.candidate_id]}
              trajLoading={trajLoading}
              onTrajRefresh={reloadTrajSummaries}
              pipelineStep={nextPipelineStep[app.stage]}
              canAdvance={canAdvanceApplicationStage(app, perms)}
              stageUpdatingId={stageUpdatingId}
              onAdvanceStage={advanceApplicationStage}
            />
          ))}
        </section>
      ) : (
        <div className="jd-cand-no-results">
          <p>No candidates match your search or filters.</p>
          <button
            type="button"
            className="jd-cand-link-btn"
            onClick={() => {
              setSearch('');
              setSourceFilter('All');
              setFitFilter('all');
            }}
          >
            Clear filters
          </button>
        </div>
      )}
    </>
  );
}
