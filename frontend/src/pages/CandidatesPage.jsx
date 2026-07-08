import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { normalizeCandidateSourceParam, normalizeDisplayChannelParam } from '../lib/drillQueryParams';
import { applicationsApi, candidatesApi, jobsApi } from '../lib/api';
import { usePlacementFilters } from '../context/PlacementFiltersContext';
import { BUSINESS_ORG_PILLARS, getDepartmentsForPillar } from '../data/businessOrgHierarchy';
import { useCareerTrajectorySummaries } from '../hooks/useCareerTrajectorySummaries';
import { dedupeCandidatesForDisplay } from '../lib/candidateListUtils';
import { useAssessmentClearance } from '../hooks/useAssessmentClearance';
import { Button } from '../components/ui/button';
import { Loader2, Users } from 'lucide-react';
import AddCandidateModal from '../components/candidates/AddCandidateModal';
import { toast } from 'sonner';
import { formatSourceLabel } from '../lib/candidateSource';
import { useAuth } from '../context/AuthContext';
import { useHiringPermissions } from '../hooks/useHiringPermissions';
import { canMoveToStage } from '../lib/hiringPipelinePermissions';
import CandidatesCommandHero, { formatCandidatesSubtitle } from '../components/candidates/CandidatesCommandHero';
import CandidatesSearchFilters from '../components/candidates/CandidatesSearchFilters';
import CandidatesHeroCards from '../components/candidates/CandidatesHeroCards';
import CandidatesKpiStrip from '../components/candidates/CandidatesKpiStrip';
import CandidateIntelligenceCard from '../components/candidates/CandidateIntelligenceCard';
import CandidatesCommandSidebar from '../components/candidates/CandidatesCommandSidebar';
import {
  collectSkillOptions,
  computeCommandMetrics,
  FIT_SCORE_FILTER_OPTIONS,
  PAGE_SIZE,
  pageWindow,
} from '../lib/candidatesCommandUtils';

const IMPORT_ALLOWED_ROLES = new Set(['admin', 'hr_admin', 'recruiter']);

const NEXT_PIPELINE_STEP = {
  SOURCED: { next: 'SCREENING', label: 'Selected for next round' },
  SCREENING: { next: 'ASSESSMENT_SENT', label: 'Selected for next round' },
  ASSESSMENT_SENT: { next: 'ASSESSMENT_CLEARED', label: 'Mark Cleared' },
  ASSESSMENT_CLEARED: { next: 'INTERVIEW_1', label: 'Start interview round' },
  INTERVIEW_1: { next: 'INTERVIEW_2', label: 'Advance to next interview' },
  INTERVIEW_2: { next: 'INTERVIEW_3', label: 'Advance to next interview' },
  INTERVIEW_3: { next: 'HR_ROUND', label: 'Advance to HR round' },
  HR_ROUND: { next: 'OFFER', label: 'Move to offer' },
  OFFER: { next: 'JOINED', label: 'Mark Joined' },
};

const DISPLAY_CHANNEL_LABELS = {
  talent_pool_ex: 'Talent Pool-Ex',
  talent_pool: 'Talent Pool',
  linkedin: 'LinkedIn',
  other: 'Other sources',
};

const CandidatesPage = () => {
  const { user } = useAuth();
  const perms = useHiringPermissions(user);
  const canBulkImport = perms.canBulkImport || IMPORT_ALLOWED_ROLES.has(String(user?.role || ''));
  const canAddCandidate = perms.canCreateGlobalCandidate;
  const [searchParams, setSearchParams] = useSearchParams();
  const drillSource = normalizeCandidateSourceParam(searchParams.get('source'));
  const drillDisplayChannel = normalizeDisplayChannelParam(searchParams.get('display_channel'));
  const drillFitMin = searchParams.get('fit_min');
  const drillFitMax = searchParams.get('fit_max');
  const fitMin = drillFitMin != null && drillFitMin !== '' ? Number(drillFitMin) : null;
  const fitMax = drillFitMax != null && drillFitMax !== '' ? Number(drillFitMax) : null;
  const placement = usePlacementFilters();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [skillFilter, setSkillFilter] = useState('all');
  const [fitFilter, setFitFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalCandidatesCount, setTotalCandidatesCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [applications, setApplications] = useState([]);
  const [openJobs, setOpenJobs] = useState([]);
  const [contextLoading, setContextLoading] = useState(true);
  const [stageUpdatingId, setStageUpdatingId] = useState(null);
  const { runWithClearanceCheck, clearanceDialog } = useAssessmentClearance();

  useEffect(() => {
    if (drillSource && drillSource !== sourceFilter) {
      setSourceFilter(drillSource);
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drillSource]);

  useEffect(() => {
    if (fitMin != null && fitMin >= 90) setFitFilter('90+');
    else if (fitMin != null && fitMin >= 80) setFitFilter('80+');
    else if (fitMin != null && fitMin >= 70) setFitFilter('70+');
    else if (fitMax != null && fitMax <= 69) setFitFilter('below70');
  }, [fitMin, fitMax]);

  const fitFilterParams = useMemo(() => {
    const opt = FIT_SCORE_FILTER_OPTIONS.find((o) => o.value === fitFilter);
    if (!opt || fitFilter === 'all') {
      return { fit_min: fitMin, fit_max: fitMax };
    }
    return {
      fit_min: opt.fitMin ?? fitMin,
      fit_max: opt.fitMax ?? fitMax,
    };
  }, [fitFilter, fitMin, fitMax]);

  useEffect(() => {
    fetchCandidates();
  }, [sourceFilter, skillFilter, page, searchQuery, drillDisplayChannel, fitFilterParams]);

  useEffect(() => {
    if (fitMin != null || fitMax != null) setPage(1);
  }, [fitMin, fitMax]);

  const clearDrillDisplayChannel = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('display_channel');
    setSearchParams(next, { replace: true });
    setPage(1);
  };

  const clearDrillSource = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('source');
    setSearchParams(next, { replace: true });
    setSourceFilter('all');
    setPage(1);
  };

  const clearFitDrill = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('fit_min');
    next.delete('fit_max');
    setSearchParams(next, { replace: true });
    setFitFilter('all');
    setPage(1);
  };

  const fitDrillActive = fitMin != null || fitMax != null;
  const fitDrillLabel =
    fitMin != null && fitMax != null
      ? `${fitMin}–${fitMax}%`
      : fitMin != null
        ? `≥ ${fitMin}%`
        : fitMax != null
          ? `≤ ${fitMax}%`
          : null;

  const onSourceFilterChange = (value) => {
    setSourceFilter(value);
    setPage(1);
    if (searchParams.get('display_channel')) {
      const next = new URLSearchParams(searchParams);
      next.delete('display_channel');
      setSearchParams(next, { replace: true });
    }
  };

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const params = { page, page_size: PAGE_SIZE };
      if (drillDisplayChannel) {
        params.display_channel = drillDisplayChannel;
      } else if (sourceFilter === '__display_talent_pool_ex__') {
        params.display_channel = 'talent_pool_ex';
      } else if (sourceFilter !== 'all') {
        params.source = sourceFilter;
      }
      if (skillFilter && skillFilter !== 'all') params.skill = skillFilter;
      if (searchQuery && searchQuery.trim()) params.q = searchQuery.trim();
      if (fitFilterParams.fit_min != null) params.fit_min = fitFilterParams.fit_min;
      if (fitFilterParams.fit_max != null) params.fit_max = fitFilterParams.fit_max;

      const listRes = await candidatesApi.listPaged(params);
      const data = listRes.data || {};
      setCandidates(dedupeCandidatesForDisplay(data.items || []));
      setTotalCandidatesCount(Number(data.total || 0));
      setTotalPages(Number(data.total_pages || 1));
    } catch {
      toast.error('Failed to fetch candidates');
    } finally {
      setLoading(false);
    }
  };

  const loadHiringContext = useCallback(async () => {
    setContextLoading(true);
    try {
      const [jobsRes, appsRes] = await Promise.all([jobsApi.list('OPEN'), applicationsApi.list()]);
      setOpenJobs(jobsRes.data || []);
      setApplications(appsRes.data || []);
    } catch {
      toast.error('Failed to load pipeline data');
      setOpenJobs([]);
      setApplications([]);
    } finally {
      setContextLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHiringContext();
  }, [loadHiringContext]);

  const placementActive = !!(
    placement.pillarId ||
    placement.departmentId ||
    placement.subDepartment ||
    placement.projectId
  );

  const pillarLabel = BUSINESS_ORG_PILLARS.find((p) => p.id === placement.pillarId)?.label || '';
  const deptLabel =
    placement.pillarId && placement.departmentId
      ? getDepartmentsForPillar(placement.pillarId).find((d) => d.id === placement.departmentId)?.label || ''
      : '';

  const matchesPlacementJob = (job) => {
    if (pillarLabel && (job?.business_pillar || '') !== pillarLabel) return false;
    if (deptLabel && (job?.business_department || '') !== deptLabel) return false;
    if (placement.subDepartment && (job?.business_sub_department || '') !== placement.subDepartment) return false;
    if (placement.projectId && (job?.project_id || '') !== placement.projectId) return false;
    return true;
  };

  const placementOpenJobIds = useMemo(() => {
    if (!placementActive) return null;
    return new Set((openJobs || []).filter(matchesPlacementJob).map((j) => j.id));
  }, [
    placementActive,
    openJobs,
    placement.pillarId,
    placement.departmentId,
    placement.subDepartment,
    placement.projectId,
    pillarLabel,
    deptLabel,
  ]);

  const listCandidateIds = useMemo(
    () => (candidates || []).map((c) => c.id).filter(Boolean),
    [candidates]
  );
  const { summaries: trajSummaries } = useCareerTrajectorySummaries(listCandidateIds);

  const bestAppByCandidateId = useMemo(() => {
    const map = new Map();
    const jobFilter =
      placementActive && placementOpenJobIds && placementOpenJobIds.size > 0 ? placementOpenJobIds : null;
    if (placementActive && placementOpenJobIds && placementOpenJobIds.size === 0) return map;

    for (const app of applications) {
      if (!app?.candidate_id) continue;
      if (jobFilter && !jobFilter.has(app.job_id)) continue;
      const score = Number(app.fit_score?.final_score);
      const sc = Number.isFinite(score) ? score : -1;
      const prev = map.get(app.candidate_id);
      const prevSc = prev
        ? Number.isFinite(Number(prev.fit_score?.final_score))
          ? Number(prev.fit_score.final_score)
          : -1
        : -999;
      const prevTs = new Date(prev?.updated_at || prev?.created_at || 0).getTime();
      const ts = new Date(app.updated_at || app.created_at || 0).getTime();
      if (!prev || sc > prevSc || (sc === prevSc && ts > prevTs)) map.set(app.candidate_id, app);
    }
    return map;
  }, [applications, placementActive, placementOpenJobIds]);

  const metrics = useMemo(
    () =>
      computeCommandMetrics({
        totalCount: totalCandidatesCount,
        candidates,
        applications,
        pack: null,
        trajSummaries,
      }),
    [totalCandidatesCount, candidates, applications, trajSummaries]
  );

  const skillOptions = useMemo(() => collectSkillOptions(candidates), [candidates]);

  const advanceApplication = async (app) => {
    const step = NEXT_PIPELINE_STEP[app?.stage];
    if (!step?.next || !app?.id) return;
    if (!canMoveToStage(perms, step.next)) {
      toast.error('You do not have permission to move candidates to this stage');
      return;
    }

    const doUpdate = async (reasonOverride) => {
      setStageUpdatingId(app.id);
      try {
        await applicationsApi.updateStage(app.id, {
          stage: step.next,
          ...(reasonOverride ? { reason: reasonOverride } : {}),
        });
        toast.success('Updated');
        await loadHiringContext();
      } catch (e) {
        toast.error(e?.response?.data?.detail || 'Failed to update stage');
      } finally {
        setStageUpdatingId(null);
      }
    };

    await runWithClearanceCheck(app, app.stage, step.next, doUpdate);
  };

  const goToPage = (p) => {
    const next = Math.min(Math.max(1, p), totalPages || 1);
    setPage(next);
    document.querySelector('[data-testid="candidates-grid"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const pageRange = pageWindow(page, totalPages);
  const rangeStart = totalCandidatesCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalCandidatesCount);

  const clearAllFilters = () => {
    setSearchQuery('');
    setSourceFilter('all');
    setSkillFilter('all');
    setFitFilter('all');
    setPage(1);
    const next = new URLSearchParams(searchParams);
    next.delete('source');
    next.delete('display_channel');
    next.delete('fit_min');
    next.delete('fit_max');
    setSearchParams(next, { replace: true });
  };

  const subtitle =
    fitDrillActive && fitDrillLabel
      ? `${totalCandidatesCount.toLocaleString()} unique candidates matching fit ${fitDrillLabel}`
      : formatCandidatesSubtitle(totalCandidatesCount);

  return (
    <div className="hiring-dashboard-root top-operational" data-testid="candidates-command-root">
      {drillDisplayChannel ? (
        <div className="cand-drill-banner">
          <span>
            Drill-down from Hiring Dashboard: channel{' '}
            <strong>{DISPLAY_CHANNEL_LABELS[drillDisplayChannel] || drillDisplayChannel}</strong>
            <span className="cand-drill-meta"> ({totalCandidatesCount} matching)</span>
          </span>
          <div className="cand-drill-actions">
            <Button asChild variant="outline" size="sm" className="h-8 bg-white">
              <Link to="/dashboard">Hiring Dashboard</Link>
            </Button>
            <button type="button" className="btn" onClick={clearDrillDisplayChannel}>
              Clear filter
            </button>
          </div>
        </div>
      ) : null}

      {drillSource ? (
        <div className="cand-drill-banner">
          <span>
            Drill-down from Executive KPIs: source <strong>{formatSourceLabel(drillSource)}</strong>
          </span>
          <div className="cand-drill-actions">
            <Button asChild variant="outline" size="sm" className="h-8 bg-white">
              <Link to="/executive-kpis">Executive KPIs</Link>
            </Button>
            <button type="button" className="btn" onClick={clearDrillSource}>
              Clear filter
            </button>
          </div>
        </div>
      ) : null}

      {fitDrillActive && fitDrillLabel ? (
        <div className="cand-drill-banner">
          <span>
            Drill-down from Hiring Dashboard: fit score <strong>{fitDrillLabel}</strong>
            <span className="cand-drill-meta"> ({totalCandidatesCount} matching)</span>
          </span>
          <div className="cand-drill-actions">
            <Button asChild variant="outline" size="sm" className="h-8 bg-white">
              <Link to="/dashboard">Hiring Dashboard</Link>
            </Button>
            <button type="button" className="btn" onClick={clearFitDrill}>
              Clear filter
            </button>
          </div>
        </div>
      ) : null}

      <CandidatesCommandHero
        subtitle={subtitle}
        canBulkImport={canBulkImport}
        canAddCandidate={canAddCandidate}
        onAddClick={() => setShowAddModal(true)}
      />

      <CandidatesSearchFilters
        searchQuery={searchQuery}
        onSearchChange={(value) => {
          setSearchQuery(value);
          setPage(1);
        }}
        sourceFilter={sourceFilter}
        onSourceChange={onSourceFilterChange}
        skillFilter={skillFilter}
        onSkillChange={(value) => {
          setSkillFilter(value);
          setPage(1);
        }}
        skillOptions={skillOptions}
        fitFilter={fitFilter}
        onFitChange={(value) => {
          setFitFilter(value);
          setPage(1);
          if (value === 'all') clearFitDrill();
        }}
        onClear={clearAllFilters}
      />

      <CandidatesHeroCards metrics={metrics} />
      <CandidatesKpiStrip metrics={metrics} />

      {placementActive ? (
        <div className="cand-drill-banner cand-drill-banner--amber">
          Header placement filters are active and only narrow the <strong>Pipeline</strong> view. This page shows the
          full candidate list ({totalCandidatesCount} total).
          <button type="button" className="cand-inline-link" onClick={() => placement.clearAll()}>
            Clear placement filters
          </button>
        </div>
      ) : null}

      <div className="cand-content">
        <section className="cand-list-panel">
          {loading || contextLoading ? (
            <div className="cand-state">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
            </div>
          ) : candidates.length > 0 ? (
            <>
              <p className="cand-page-summary" data-testid="candidates-page-summary">
                Showing {rangeStart}–{rangeEnd} of {totalCandidatesCount.toLocaleString()} candidates
              </p>
              <div className="cand-grid" data-testid="candidates-grid">
                {candidates.map((candidate) => {
                  const app = bestAppByCandidateId.get(candidate.id);
                  const step = app ? NEXT_PIPELINE_STEP[app.stage] : null;
                  return (
                    <CandidateIntelligenceCard
                      key={candidate.id}
                      candidate={candidate}
                      app={app}
                      trajSummary={trajSummaries[candidate.id]}
                      pipelineStep={step}
                      canAdvance={step?.next ? canMoveToStage(perms, step.next) : false}
                      stageUpdatingId={stageUpdatingId}
                      onAdvanceStage={advanceApplication}
                    />
                  );
                })}
              </div>
              {totalPages > 1 ? (
                <nav className="cand-pagination" aria-label="Candidates pagination" data-testid="candidates-pagination">
                  <button
                    type="button"
                    className="btn cand-page-btn"
                    disabled={page <= 1}
                    onClick={() => goToPage(page - 1)}
                    aria-label="Previous page"
                  >
                    Previous
                  </button>
                  {Array.from({ length: pageRange.end - pageRange.start + 1 }, (_, i) => pageRange.start + i).map(
                    (p) => (
                      <button
                        key={p}
                        type="button"
                        className={`btn cand-page-btn ${p === page ? 'active' : ''}`}
                        onClick={() => goToPage(p)}
                        aria-current={p === page ? 'page' : undefined}
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    className="btn cand-page-btn"
                    disabled={page >= totalPages}
                    onClick={() => goToPage(page + 1)}
                    aria-label="Next page"
                  >
                    Next
                  </button>
                </nav>
              ) : null}
            </>
          ) : (
            <div className="cand-state">
              <div className="cand-empty-icon">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <h3>No candidates found</h3>
              <p>{searchQuery ? 'Try a different search term' : 'Add your first candidate to get started'}</p>
              {canAddCandidate ? (
                <button type="button" className="btn primary" onClick={() => setShowAddModal(true)}>
                  + Add Candidate
                </button>
              ) : null}
            </div>
          )}
        </section>

        <CandidatesCommandSidebar metrics={metrics} />
      </div>

      {canAddCandidate ? (
        <AddCandidateModal
          open={showAddModal}
          onOpenChange={setShowAddModal}
          openJobs={openJobs}
          onSuccess={() => {
            fetchCandidates();
            loadHiringContext();
          }}
        />
      ) : null}

      {clearanceDialog}
    </div>
  );
};

export default CandidatesPage;
