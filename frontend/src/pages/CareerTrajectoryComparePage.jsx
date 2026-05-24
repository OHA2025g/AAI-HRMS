import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, Sparkles, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { careerTrajectoryApi, candidatesApi } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Badge } from '../components/ui/badge';

const METRICS = [
  ['overall_score', 'Overall'],
  ['career_progression', 'Progression'],
  ['leadership_maturity', 'Leadership'],
  ['project_complexity', 'Project complexity'],
  ['business_impact', 'Business impact'],
  ['retention_risk', 'Retention risk'],
];

const RADAR_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899'];

export default function CareerTrajectoryComparePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialIds = (searchParams.get('ids') || '').split(',').filter(Boolean).slice(0, 5);

  const [candidates, setCandidates] = useState([]);
  const [selectedIds, setSelectedIds] = useState(initialIds);
  const [summaries, setSummaries] = useState({});
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    candidatesApi.listPaged({ limit: 200 }).then((res) => {
      setCandidates(res.data?.items || res.data || []);
    }).catch(() => {});
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
    if (!id || selectedIds.includes(id) || selectedIds.length >= 5) return;
    setSelectedIds((prev) => [...prev, id]);
  };

  const removeCandidate = (id) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  };

  const nameById = useMemo(() => {
    const m = {};
    candidates.forEach((c) => {
      m[c.id] = c.full_name || c.email || c.id;
    });
    return m;
  }, [candidates]);

  const missingIds = useMemo(
    () => selectedIds.filter((id) => !summaries[id]),
    [selectedIds, summaries]
  );

  const radarData = useMemo(() => {
    if (!selectedIds.length) return [];
    return METRICS.map(([key, label]) => {
      const row = { metric: label };
      selectedIds.forEach((id) => {
        row[id] = summaries[id]?.[key] ?? 0;
      });
      return row;
    });
  }, [selectedIds, summaries]);

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

  return (
    <div className="space-y-6 pb-12" data-testid="career-trajectory-compare-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2" style={{ fontFamily: 'Outfit' }}>
          <Users className="h-7 w-7 text-indigo-600" />
          Compare career trajectories
        </h1>
        <p className="text-slate-600 mt-1">Select up to 5 candidates. Run analysis for anyone without a report.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select candidates</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 items-center">
          <Select onValueChange={addCandidate} value="">
            <SelectTrigger className="w-64" data-testid="career-compare-add-candidate">
              <SelectValue placeholder="Add candidate…" />
            </SelectTrigger>
            <SelectContent>
              {candidates
                .filter((c) => !selectedIds.includes(c.id))
                .map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name || c.email}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {selectedIds.map((id) => (
            <Badge key={id} variant="secondary" className="gap-1 pr-1">
              {nameById[id] || id}
              {!summaries[id] ? <span className="text-amber-600 text-[10px] ml-1">no report</span> : null}
              <button
                type="button"
                className="ml-1 hover:text-rose-600"
                aria-label={`Remove ${nameById[id] || id} from comparison`}
                onClick={() => removeCandidate(id)}
              >
                ×
              </button>
            </Badge>
          ))}
          {missingIds.length > 0 ? (
            <Button size="sm" onClick={analyzeMissing} disabled={analyzing}>
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Analyze {missingIds.length} missing
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : selectedIds.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-slate-500">
            Add candidates to compare trajectory scores side by side.
          </CardContent>
        </Card>
      ) : (
        <>
          {radarData.length > 0 && selectedIds.some((id) => summaries[id]) ? (
            <Card data-testid="career-compare-radar">
              <CardHeader>
                <CardTitle className="text-lg">Score comparison (radar)</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                    <Legend />
                    {selectedIds.map((id, i) => (
                      <Radar
                        key={id}
                        name={nameById[id] || id}
                        dataKey={id}
                        stroke={RADAR_COLORS[i % RADAR_COLORS.length]}
                        fill={RADAR_COLORS[i % RADAR_COLORS.length]}
                        fillOpacity={0.15}
                      />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : null}

          <Card data-testid="career-compare-table">
            <CardHeader>
              <CardTitle className="text-lg">Trajectory comparison</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="career-compare-metrics-table">
                <thead>
                  <tr className="border-b text-left text-slate-600">
                    <th className="py-2 pr-4">Metric</th>
                    {selectedIds.map((id) => (
                      <th key={id} className="py-2 px-3 font-medium text-slate-900">
                        {nameById[id] || id}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {METRICS.map(([key, label]) => (
                    <tr key={key} className="border-b border-slate-100">
                      <td className="py-2 pr-4 text-slate-600">{label}</td>
                      {selectedIds.map((id) => {
                        const s = summaries[id];
                        const val = s?.[key];
                        return (
                          <td key={id} className="py-2 px-3 font-semibold text-indigo-800">
                            {val != null ? `${Math.round(val)}%` : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr>
                    <td className="py-2 pr-4 text-slate-600">Archetype</td>
                    {selectedIds.map((id) => (
                      <td key={id} className="py-2 px-3 text-xs">
                        {summaries[id]?.primary_archetype || '—'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-slate-600">Decision gate</td>
                    {selectedIds.map((id) => (
                      <td key={id} className="py-2 px-3 text-xs max-w-[140px]">
                        {(summaries[id]?.decision_gate || '—').split(':')[0]}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      <Button variant="outline" asChild>
        <Link to="/ai-hiring/candidate-fit/career-trajectory">
          <Sparkles className="h-4 w-4 mr-2" />
          Open trajectory analyzer
        </Link>
      </Button>
    </div>
  );
}
