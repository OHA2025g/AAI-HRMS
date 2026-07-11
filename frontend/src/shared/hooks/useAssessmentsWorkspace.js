import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { assessmentsApi } from '@/shared/lib/api';
import { usePlacementFilters } from '@/shared/context/PlacementFiltersContext';
import { BUSINESS_ORG_PILLARS, getDepartmentsForPillar } from '@/data/businessOrgHierarchy';

function orgParams(placement) {
  const pillarLabel = BUSINESS_ORG_PILLARS.find((p) => p.id === placement.pillarId)?.label || '';
  const deptLabel =
    placement.pillarId && placement.departmentId
      ? getDepartmentsForPillar(placement.pillarId).find((d) => d.id === placement.departmentId)?.label || ''
      : '';
  const params = {};
  if (pillarLabel) params.pillar = pillarLabel;
  if (deptLabel) params.department = deptLabel;
  if (placement.subDepartment) params.sub_department = placement.subDepartment;
  if (placement.projectId) params.project_id = placement.projectId;
  return params;
}

export function useAssessmentsWorkspace() {
  const placement = usePlacementFilters();
  const [searchParams, setSearchParams] = useSearchParams();

  const tab = searchParams.get('tab') || 'overview';
  const windowDays = Number(searchParams.get('window') || 30);
  const jobFilter = searchParams.get('job_id') || '';
  const typeFilter = searchParams.get('type') || '';
  const usageFilter = searchParams.get('usage') || '';
  const sortFilter = searchParams.get('sort') || '-created_at';
  const searchQ = searchParams.get('q') || '';
  const scoreMin = searchParams.get('score_min') || '';
  const scoreMax = searchParams.get('score_max') || '';
  const scoreBucket = searchParams.get('score_bucket') || '';

  const [summary, setSummary] = useState(null);
  const [funnel, setFunnel] = useState([]);
  const [passRate, setPassRate] = useState([]);
  const [scoreDist, setScoreDist] = useState({ buckets: [], pass_threshold_pct: 70 });
  const [trends, setTrends] = useState([]);
  const [skillBreakdown, setSkillBreakdown] = useState([]);
  const [fitVsScore, setFitVsScore] = useState([]);
  const [timeVsScore, setTimeVsScore] = useState([]);
  const [calibration, setCalibration] = useState(null);
  const [outcomeCorrelation, setOutcomeCorrelation] = useState(null);
  const [coverageMatrix, setCoverageMatrix] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);
  const [error, setError] = useState(null);

  const org = useMemo(() => orgParams(placement), [placement]);

  const setTab = useCallback(
    (next) => {
      const p = new URLSearchParams(searchParams);
      p.set('tab', next);
      setSearchParams(p, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const setFilter = useCallback(
    (key, value) => {
      const p = new URLSearchParams(searchParams);
      if (value) p.set(key, value);
      else p.delete(key);
      setSearchParams(p, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const setWindowDays = useCallback(
    (days) => {
      const p = new URLSearchParams(searchParams);
      p.set('window', String(days));
      setSearchParams(p, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const setScoreRange = useCallback(
    ({ min, max, bucket }) => {
      const p = new URLSearchParams(searchParams);
      if (min != null && min !== '') p.set('score_min', String(min));
      else p.delete('score_min');
      if (max != null && max !== '') p.set('score_max', String(max));
      else p.delete('score_max');
      if (bucket) p.set('score_bucket', bucket);
      else p.delete('score_bucket');
      p.set('tab', 'results');
      setSearchParams(p, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const clearScoreRange = useCallback(() => {
    const p = new URLSearchParams(searchParams);
    p.delete('score_min');
    p.delete('score_max');
    p.delete('score_bucket');
    setSearchParams(p, { replace: true });
  }, [searchParams, setSearchParams]);

  const load = useCallback(
    async (isRefetch = false) => {
      if (isRefetch) setRefetching(true);
      else setLoading(true);
      setError(null);
      try {
        const listParams = {
          ...org,
          sort: sortFilter,
          limit: 200,
          ...(jobFilter ? { job_id: jobFilter } : {}),
          ...(typeFilter ? { assessment_type: typeFilter } : {}),
          ...(usageFilter ? { usage: usageFilter } : {}),
          ...(searchQ ? { q: searchQ } : {}),
        };
        const analyticsParams = { ...org, window_days: windowDays };
        const trendWeeks = Math.max(2, Math.min(8, Math.floor(windowDays / 7) || 2));

        const [
          summaryRes,
          funnelRes,
          passRes,
          distRes,
          trendsRes,
          skillRes,
          fitRes,
          timeRes,
          calRes,
          outcomeRes,
          coverageRes,
          listRes,
          subsRes,
        ] = await Promise.all([
          assessmentsApi.analyticsSummary(analyticsParams),
          assessmentsApi.analyticsFunnel(analyticsParams),
          assessmentsApi.analyticsPassRate(analyticsParams),
          assessmentsApi.analyticsScoreDistribution(analyticsParams),
          assessmentsApi.analyticsTrends({ ...analyticsParams, weeks: trendWeeks }),
          assessmentsApi.analyticsSkillBreakdown(analyticsParams),
          assessmentsApi.analyticsFitVsScore(analyticsParams),
          assessmentsApi.analyticsTimeVsScore(analyticsParams),
          assessmentsApi.analyticsCalibration(analyticsParams),
          assessmentsApi.analyticsOutcomeCorrelation(analyticsParams),
          assessmentsApi.analyticsCoverage(analyticsParams).catch(() => ({ data: null })),
          assessmentsApi.list(listParams),
          assessmentsApi.listSubmissions({
            limit: 200,
            window_days: windowDays,
            ...org,
            ...(scoreMin ? { score_min_pct: Number(scoreMin) } : {}),
            ...(scoreMax ? { score_max_pct: Number(scoreMax) } : {}),
            ...(scoreMin || scoreMax ? { status: 'SCORED' } : {}),
          }),
        ]);

        setSummary(summaryRes.data);
        setFunnel(funnelRes.data || []);
        setPassRate(passRes.data || []);
        setScoreDist(distRes.data || { buckets: [], pass_threshold_pct: 70 });
        setTrends(trendsRes.data || []);
        setSkillBreakdown(skillRes.data || []);
        setFitVsScore(fitRes.data || []);
        setTimeVsScore(timeRes.data || []);
        setCalibration(calRes.data || null);
        setOutcomeCorrelation(outcomeRes.data || null);
        setCoverageMatrix(coverageRes.data || null);
        setAssessments(listRes.data || []);
        setSubmissions(subsRes.data || []);
      } catch (e) {
        setError(e?.response?.data?.detail || e?.message || 'Failed to load assessments');
      } finally {
        setLoading(false);
        setRefetching(false);
      }
    },
    [org, windowDays, jobFilter, typeFilter, usageFilter, sortFilter, searchQ, scoreMin, scoreMax]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  return {
    tab,
    setTab,
    windowDays,
    setWindowDays,
    jobFilter,
    typeFilter,
    usageFilter,
    sortFilter,
    searchQ,
    scoreMin,
    scoreMax,
    scoreBucket,
    setFilter,
    setScoreRange,
    clearScoreRange,
    summary,
    funnel,
    passRate,
    scoreDist,
    trends,
    skillBreakdown,
    fitVsScore,
    timeVsScore,
    calibration,
    outcomeCorrelation,
    coverageMatrix,
    assessments,
    submissions,
    loading,
    refetching,
    error,
    reload: () => load(true),
    org,
  };
}

export function getTypeColor(type) {
  switch (type) {
    case 'SCREENING':
      return 'bg-blue-100 text-blue-700';
    case 'CORE_SKILL':
      return 'bg-purple-100 text-purple-700';
    case 'WORK_SIMULATION':
      return 'bg-amber-100 text-amber-700';
    case 'BEHAVIORAL':
      return 'bg-emerald-100 text-emerald-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}
