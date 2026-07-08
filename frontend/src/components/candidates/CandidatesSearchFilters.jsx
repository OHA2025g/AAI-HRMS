import React from 'react';
import {
  FIT_SCORE_FILTER_OPTIONS,
  SOURCE_FILTER_OPTIONS,
} from '../../lib/candidatesCommandUtils';

export default function CandidatesSearchFilters({
  searchQuery,
  onSearchChange,
  sourceFilter,
  onSourceChange,
  skillFilter,
  onSkillChange,
  skillOptions,
  fitFilter,
  onFitChange,
  onClear,
}) {
  return (
    <section className="cand-filters" data-testid="candidates-search-filters">
      <input
        className="cand-input"
        type="search"
        placeholder="Search candidates, skills, email or role..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        data-testid="search-candidates-input"
        aria-label="Search candidates"
      />
      <select
        className="cand-select"
        value={sourceFilter}
        onChange={(e) => onSourceChange(e.target.value)}
        data-testid="source-filter"
        aria-label="Filter by source"
      >
        {SOURCE_FILTER_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <select
        className="cand-select"
        value={skillFilter}
        onChange={(e) => onSkillChange(e.target.value)}
        aria-label="Filter by skill"
      >
        {skillOptions.map((skill) => (
          <option key={skill} value={skill === 'All Skills' ? 'all' : skill}>
            {skill}
          </option>
        ))}
      </select>
      <select
        className="cand-select"
        value={fitFilter}
        onChange={(e) => onFitChange(e.target.value)}
        aria-label="Filter by fit score"
      >
        {FIT_SCORE_FILTER_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <button type="button" className="btn" onClick={onClear}>
        Clear filters
      </button>
    </section>
  );
}
