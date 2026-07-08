import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { jobsApi } from '../lib/api';
import { orderJobsSeededExcelPattern } from '../lib/jobSource';
import PeriodToggle from '../components/hiring-dashboard/PeriodToggle';
import JobsCommandHero from '../components/jobs/JobsCommandHero';
import JobsCommandKpis from '../components/jobs/JobsCommandKpis';
import JobCommandCard from '../components/jobs/JobCommandCard';
import JobsCommandSidebar from '../components/jobs/JobsCommandSidebar';
import {
  computeCommandMetrics,
  filterJobs,
  fmtOrg,
  sortJobs,
  uniqueFilterValues,
} from '../lib/jobsCommandUtils';

const TABS = [
  { id: 'all', label: 'All Jobs' },
  { id: 'at-risk', label: 'At Risk' },
  { id: 'high-fit', label: 'High Fit' },
  { id: 'aging', label: 'Aging' },
  { id: 'draft', label: 'Draft' },
];

const SORT_OPTIONS = [
  { value: 'priority', label: 'Sort: Priority' },
  { value: 'title', label: 'Sort: Title' },
  { value: 'candidates', label: 'Sort: Candidates' },
  { value: 'risk', label: 'Sort: Risk' },
];

const PAGE_SIZE = 10;

function pageWindow(current, total) {
  if (total <= 7) return { start: 1, end: total };
  let start = Math.max(1, current - 2);
  let end = Math.min(total, start + 4);
  start = Math.max(1, end - 4);
  return { start, end };
}

export default function JobsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [windowDays, setWindowDays] = useState(30);
  const [viewMode, setViewMode] = useState('grid');

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'all');
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || 'all');
  const [aiRiskFilter, setAiRiskFilter] = useState('all');
  const [sortKey, setSortKey] = useState('priority');
  const [department, setDepartment] = useState('all');
  const [location, setLocation] = useState('all');
  const [seniority, setSeniority] = useState('all');
  const [owner, setOwner] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const withoutMatches = searchParams.get('without_matches') === '1';
  const lowFit = searchParams.get('low_fit') === '1';

  const loadData = useCallback(async () => {
    setFetchError(null);
    try {
      const jobParams = {};
      if (statusFilter !== 'all') jobParams.status = statusFilter;
      if (withoutMatches) jobParams.without_fit_scores = true;
      if (lowFit) jobParams.low_fit = true;

      const jobsRes = await jobsApi.list(jobParams);
      setJobs(jobsRes.data || []);
    } catch {
      setFetchError('Failed to load jobs. Check your connection and try again.');
      setJobs([]);
      toast.error('Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, withoutMatches, lowFit, windowDays]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
    const status = searchParams.get('status');
    if (status) setStatusFilter(status);
  }, [searchParams]);

  const handleDelete = async (jobId) => {
    if (!window.confirm('Are you sure you want to delete this job?')) return;
    try {
      await jobsApi.delete(jobId);
      toast.success('Job deleted successfully');
      loadData();
    } catch {
      toast.error('Failed to delete job');
    }
  };

  const metrics = useMemo(() => computeCommandMetrics(jobs, null), [jobs]);

  const filterOptions = useMemo(
    () => ({
      departments: uniqueFilterValues(metrics.enriched, (j) => fmtOrg(j.business_department)),
      locations: uniqueFilterValues(metrics.enriched, (j) => fmtOrg(j.location)),
      seniorities: uniqueFilterValues(metrics.enriched, (j) => fmtOrg(j.seniority)),
      owners: uniqueFilterValues(
        metrics.enriched,
        (j) => j.hiring_team?.recruiter?.full_name || j.hiring_team?.recruiter?.email
      ),
    }),
    [metrics.enriched]
  );

  const visibleJobs = useMemo(() => {
    const filtered = filterJobs(metrics.enriched, {
      searchQuery,
      tab: activeTab,
      statusFilter,
      aiRiskFilter,
      department,
      location,
      seniority,
      owner,
    });
    const sorted = sortJobs(filtered, sortKey);
    return orderJobsSeededExcelPattern(sorted);
  }, [
    metrics.enriched,
    searchQuery,
    activeTab,
    statusFilter,
    aiRiskFilter,
    department,
    location,
    seniority,
    owner,
    sortKey,
  ]);

  const totalJobs = visibleJobs.length;
  const totalPages = Math.max(1, Math.ceil(totalJobs / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab, statusFilter, aiRiskFilter, department, location, seniority, owner, sortKey]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedJobs = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return visibleJobs.slice(start, start + PAGE_SIZE);
  }, [visibleJobs, safePage]);

  const rangeStart = totalJobs === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, totalJobs);
  const pageRange = pageWindow(safePage, totalPages);

  const goToPage = (page) => {
    const next = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(next);
    document.querySelector('[data-testid="jobs-grid"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const clearFilters = () => {
    setDepartment('all');
    setLocation('all');
    setSeniority('all');
    setOwner('all');
    setStatusFilter('all');
    setAiRiskFilter('all');
    setSearchQuery('');
    setActiveTab('all');
    setCurrentPage(1);
    navigate('/jobs', { replace: true });
  };

  return (
    <div className="hiring-dashboard-root top-operational" data-testid="jobs-command-root">
      <header className="top">
        <div>
          <h1 data-testid="jobs-heading">Jobs Command Center</h1>
          <p>Manage requisitions, AI fit quality, aging risk, and hiring velocity.</p>
        </div>
        <div className="actions">
          <PeriodToggle value={windowDays} onChange={setWindowDays} variant="overview-mock" />
          <button type="button" className="btn" aria-label="Notifications">
            🔔
          </button>
          <Link to="/jobs/new" className="primary jobs-create-btn" data-testid="create-job-btn">
            ＋ Create Job
          </Link>
        </div>
      </header>

      <div className="filterbar" id="jobs-filterbar">
        <div className="filter-field">
          <label htmlFor="jobs-dept-filter">Department</label>
          <select id="jobs-dept-filter" value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="all">All</option>
            {filterOptions.departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="jobs-loc-filter">Location</label>
          <select id="jobs-loc-filter" value={location} onChange={(e) => setLocation(e.target.value)}>
            <option value="all">All</option>
            {filterOptions.locations.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="jobs-sen-filter">Seniority</label>
          <select id="jobs-sen-filter" value={seniority} onChange={(e) => setSeniority(e.target.value)}>
            <option value="all">All</option>
            {filterOptions.seniorities.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="jobs-owner-filter">Owner</label>
          <select id="jobs-owner-filter" value={owner} onChange={(e) => setOwner(e.target.value)}>
            <option value="all">All</option>
            {filterOptions.owners.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="clear-filter" onClick={clearFilters}>
          Clear filters
        </button>
      </div>

      <JobsCommandHero pack={null} metrics={metrics} />
      <JobsCommandKpis metrics={metrics} pack={null} />

      <div className="jobs-toolbar">
        <div className="jobs-toolbar-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`jobs-pill-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="jobs-view-toggle">
          <button
            type="button"
            className={viewMode === 'grid' ? 'active' : ''}
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
          >
            ▦
          </button>
          <button
            type="button"
            className={viewMode === 'list' ? 'active' : ''}
            onClick={() => setViewMode('list')}
            aria-label="List view"
          >
            ☰
          </button>
        </div>
      </div>

      <div className="filterbar jobs-list-filterbar">
        <div className="filter-field jobs-search-field">
          <label htmlFor="jobs-search">Search</label>
          <div className="jobs-search">
            <span aria-hidden>⌕</span>
            <input
              id="jobs-search"
              type="search"
              placeholder="Search jobs, skills, department, project ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="search-jobs-input"
            />
          </div>
        </div>
        <div className="filter-field">
          <label htmlFor="jobs-status-filter">Status</label>
          <select
            id="jobs-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            data-testid="status-filter"
          >
            <option value="all">All Status</option>
            <option value="OPEN">Open</option>
            <option value="PAUSED">Paused</option>
            <option value="CLOSED">Closed</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="jobs-risk-filter">AI Risk</label>
          <select id="jobs-risk-filter" value={aiRiskFilter} onChange={(e) => setAiRiskFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="jobs-sort">Sort</label>
          <select id="jobs-sort" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label.replace('Sort: ', '')}
              </option>
            ))}
          </select>
        </div>
      </div>

      <section className="jobs-content">
        {loading ? (
          <div className="jobs-state card">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
          </div>
        ) : fetchError ? (
          <div className="jobs-state jobs-state-error card">
            <h3>Could not load jobs</h3>
            <p>{fetchError}</p>
            <button type="button" className="primary" onClick={loadData}>
              Try again
            </button>
          </div>
        ) : (
          <>
            <div className="jobs-list-panel">
              {totalJobs > 0 ? (
                <p className="jobs-page-summary" data-testid="jobs-page-summary">
                  Showing {rangeStart}–{rangeEnd} of {totalJobs} jobs
                </p>
              ) : null}
              <div className={`jobs-grid ${viewMode === 'list' ? 'list-view' : ''}`} data-testid="jobs-grid">
                {totalJobs > 0 ? (
                  paginatedJobs.map((job) => <JobCommandCard key={job.id} job={job} onDelete={handleDelete} />)
                ) : (
                  <div className="jobs-state card">
                    <h3>No jobs found</h3>
                    <p>
                      {searchQuery
                        ? 'Try a different search term or filter.'
                        : 'Create your first job requisition to get started.'}
                    </p>
                    <Link to="/jobs/new" className="primary jobs-create-btn">
                      ＋ Create Job
                    </Link>
                  </div>
                )}
              </div>
              {totalJobs > PAGE_SIZE ? (
                <nav className="jobs-pagination" aria-label="Jobs pagination" data-testid="jobs-pagination">
                  <button
                    type="button"
                    className="btn jobs-page-btn"
                    disabled={safePage <= 1}
                    onClick={() => goToPage(safePage - 1)}
                    aria-label="Previous page"
                  >
                    Previous
                  </button>
                  {Array.from({ length: pageRange.end - pageRange.start + 1 }, (_, i) => pageRange.start + i).map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`btn jobs-page-btn ${p === safePage ? 'active' : ''}`}
                      onClick={() => goToPage(p)}
                      aria-current={p === safePage ? 'page' : undefined}
                      aria-label={p === safePage ? `Current page, page ${p}` : `Go to page ${p}`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="btn jobs-page-btn"
                    disabled={safePage >= totalPages}
                    onClick={() => goToPage(safePage + 1)}
                    aria-label="Next page"
                  >
                    Next
                  </button>
                </nav>
              ) : null}
            </div>
            <JobsCommandSidebar pack={null} />
          </>
        )}
      </section>
    </div>
  );
}
