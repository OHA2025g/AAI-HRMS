import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { careerTrajectoryApi } from '@/shared/lib/api';
import { candidateDisplayName } from '@/shared/lib/candidateListUtils';
import {
  MAX_COMPARE_CANDIDATES,
  RADAR_METRICS,
  computeCompareKpis,
  exportComparisonCsv,
  mergeCandidatePools,
  normalizeTrajectoryReadyCandidates,
} from '@/shared/lib/compareTrajectoriesCommandUtils';
import CompareTrajectoriesCommandHero from '@/features/smart-hiring/components/career-trajectory/compare/CompareTrajectoriesCommandHero';
import CompareTrajectoriesSelectPanel from '@/features/smart-hiring/components/career-trajectory/compare/CompareTrajectoriesSelectPanel';
import CompareTrajectoriesComparisonSection from '@/features/smart-hiring/components/career-trajectory/compare/CompareTrajectoriesComparisonSection';
import CompareTrajectoriesBottomSections from '@/features/smart-hiring/components/career-trajectory/compare/CompareTrajectoriesBottomSections';

export default function CareerTrajectoryComparePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialIds = (searchParams.get('ids') || '').split(',').filter(Boolean).slice(0, MAX_COMPARE_CANDIDATES);

  const [candidates, setCandidates] = useState([]);
  const [selectedIds, setSelectedIds] = useState(initialIds);
  const [summaries, setSummaries] = useState({});
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    Promise.all([
      careerTrajectoryApi.listPhase1ReadyCandidates({ limit: 500 }),
      careerTrajectoryApi.listCandidateSelectOptions({ limit: 1000 }),
    ])
      .then(([readyRes, selectRes]) => {
        const ready = normalizeTrajectoryReadyCandidates(readyRes.data?.items ?? []);
        const select = selectRes.data?.items ?? [];
        setCandidates(mergeCandidatePools(ready, select));
      })
      .catch(() => {
        toast.error('Failed to load candidates');
      });
  }, []);

  const loadSummaries = useCallback(async (ids) => {
    if (!ids.length) {
      setSummaries({});
      return;
    }
    setLoading(true);
    try {
      const res = await careerTrajectoryApi.getSummaries(ids);
      setSummaries(res.data?.summaries || {});
    } catch {
      toast.error('Failed to load trajectory summaries');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummaries(selectedIds);
    setSearchParams(selectedIds.length ? { ids: selectedIds.join(',') } : {}, { replace: true });
  }, [selectedIds.join(',')]);

  const addCandidate = (id) => {
    if (!id || selectedIds.includes(id) || selectedIds.length >= MAX_COMPARE_CANDIDATES) return;
    setSelectedIds((prev) => [...prev, id]);
  };

  const removeCandidate = (id) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  };

  const nameById = useMemo(() => {
    const m = {};
    candidates.forEach((c) => {
      m[String(c.id)] = candidateDisplayName(c);
    });
    return m;
  }, [candidates]);

  const candidateById = useMemo(() => {
    const m = {};
    candidates.forEach((c) => {
      m[String(c.id)] = c;
    });
    return m;
  }, [candidates]);

  const missingIds = useMemo(
    () => selectedIds.filter((id) => !summaries[id]),
    [selectedIds, summaries]
  );

  const kpis = useMemo(() => computeCompareKpis(selectedIds, summaries), [selectedIds, summaries]);

  const radarData = useMemo(() => {
    if (!selectedIds.length) return [];
    return RADAR_METRICS.map(([key, label]) => {
      const row = { metric: label };
      selectedIds.forEach((id) => {
        row[id] = summaries[id]?.[key] ?? 0;
      });
      return row;
    });
  }, [selectedIds, summaries]);

  const hasRadarData = selectedIds.some((id) => summaries[id]);

  const analyzeMissing = async () => {
    if (!missingIds.length) {
      toast.message('All selected candidates already have trajectory reports');
      return;
    }
    setAnalyzing(true);
    try {
      for (const id of missingIds) {
        await careerTrajectoryApi.reanalyze(id);
      }
      toast.success(`Analyzed ${missingIds.length} candidate(s)`);
      await loadSummaries(selectedIds);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Analysis failed — ensure candidates have resume text');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleExport = () => {
    if (!selectedIds.length) return;
    const csv = exportComparisonCsv(selectedIds, summaries, nameById);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trajectory-comparison.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Comparison exported');
  };

  return (
    <div className="hiring-dashboard-root top-operational" data-testid="compare-trajectories-command-root">
      <CompareTrajectoriesCommandHero
        onAnalyzeMissing={analyzeMissing}
        missingCount={missingIds.length}
        analyzing={analyzing}
      />

      <CompareTrajectoriesSelectPanel
        candidates={candidates}
        selectedIds={selectedIds}
        summaries={summaries}
        nameById={nameById}
        candidateById={candidateById}
        onAdd={addCandidate}
        onRemove={removeCandidate}
        onAnalyzeMissing={analyzeMissing}
        analyzing={analyzing}
        missingCount={missingIds.length}
      />

      <section className="ctc-kpi-grid">
        <div className="ctc-card ctc-kpi">
          <span>Candidates selected</span>
          <b>{kpis.selected}</b>
          <div className="delta">{kpis.readyLabel}</div>
        </div>
        <div className="ctc-card ctc-kpi">
          <span>Reports available</span>
          <b>{kpis.withReports}</b>
          <div className="delta">{kpis.reportsDelta}</div>
        </div>
        <div className="ctc-card ctc-kpi">
          <span>Avg trajectory</span>
          <b>{kpis.avg}</b>
          <div className="delta">{kpis.avgDelta}</div>
        </div>
        <div className="ctc-card ctc-kpi">
          <span>Best fit signal</span>
          <b>{kpis.bestFit}</b>
          <div className="delta">{kpis.bestDelta}</div>
        </div>
      </section>

      {loading ? (
        <div className="ctc-loading" data-testid="career-compare-loading">
          <Loader2 className="ctc-spinner" />
        </div>
      ) : (
        <>
          <CompareTrajectoriesComparisonSection
            selectedIds={selectedIds}
            summaries={summaries}
            nameById={nameById}
            radarData={radarData}
            hasRadarData={hasRadarData}
            onExport={handleExport}
          />
          <CompareTrajectoriesBottomSections
            selectedIds={selectedIds}
            summaries={summaries}
            nameById={nameById}
            missingCount={missingIds.length}
            onAnalyzeMissing={analyzeMissing}
            onExport={handleExport}
            analyzing={analyzing}
          />
        </>
      )}
    </div>
  );
}
