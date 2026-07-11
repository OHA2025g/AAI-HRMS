import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { careerTrajectoryApi } from '@/shared/lib/api';
import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Checkbox } from '@/shared/ui/checkbox';

const NONE = '__none__';
const SESSION_KEY = 'aai_hrms_phase2_session_candidate_ids';

export function addCandidateToPhase2Session(candidateId) {
  if (!candidateId || typeof window === 'undefined') return;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    const next = [candidateId, ...ids.filter((id) => id !== candidateId)].slice(0, 25);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function getPhase2SessionCandidateIds() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function candidateLabel(row) {
  const name = row.full_name || row.email || row.candidate_id;
  const score =
    row.overall_score != null ? ` · ${Math.round(row.overall_score)}% trajectory` : '';
  const arch = row.primary_archetype ? ` · ${row.primary_archetype}` : '';
  return `${name}${score}${arch}`;
}

/**
 * Dropdown of candidates who have completed Phase 1 (career trajectory report).
 */
export function Phase2CandidateSelect({
  candidateId,
  jobId,
  onSelect,
  disabled = false,
  preferSessionFilter = true,
  commandStyle = false,
}) {
  const [allReady, setAllReady] = useState([]);
  const [loading, setLoading] = useState(true);
  const sessionIds = useMemo(() => getPhase2SessionCandidateIds(), []);
  const [sessionOnly, setSessionOnly] = useState(
    preferSessionFilter && sessionIds.length > 0
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 200 };
      if (jobId) params.job_id = jobId;
      const res = await careerTrajectoryApi.listPhase1ReadyCandidates(params);
      setAllReady(res.data?.items || []);
    } catch {
      setAllReady([]);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    load();
  }, [load]);

  const options = useMemo(() => {
    if (!sessionOnly || sessionIds.length === 0) return allReady;
    const allowed = new Set(sessionIds);
    const filtered = allReady.filter((r) => allowed.has(r.candidate_id));
    return filtered.length > 0 ? filtered : allReady;
  }, [allReady, sessionOnly, sessionIds]);

  const selectedRow = options.find((r) => r.candidate_id === candidateId);
  const phase1Ready = Boolean(selectedRow?.report_id);

  const onChange = (value) => {
    const cid = value === NONE ? '' : value;
    if (!cid) {
      onSelect?.({ candidate_id: '', report_id: '', job_id: undefined, phase1Ready: false });
      return;
    }
    const row = options.find((r) => r.candidate_id === cid) || allReady.find((r) => r.candidate_id === cid);
    if (row) addCandidateToPhase2Session(cid);
    onSelect?.({
      candidate_id: cid,
      report_id: row?.report_id,
      job_id: row?.job_id || jobId || undefined,
      phase1Ready: Boolean(row?.report_id),
      full_name: row?.full_name,
      primary_archetype: row?.primary_archetype,
      overall_score: row?.overall_score,
    });
  };

  if (commandStyle) {
    return (
      <div className="p2-field" data-testid="phase2-candidate-select-block">
        <label htmlFor="phase2-candidate-select">Candidate</label>
        <select
          className="p2-input"
          id="phase2-candidate-select"
          value={candidateId || NONE}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || loading}
          data-testid="phase2-candidate-select"
        >
          <option value={NONE}>
            {loading ? 'Loading Phase 1–ready candidates…' : 'Select a candidate…'}
          </option>
          {options.map((row) => (
            <option key={row.candidate_id} value={row.candidate_id}>
              {candidateLabel(row)}
            </option>
          ))}
        </select>

        {sessionIds.length > 0 ? (
          <label className="p2-check-row">
            <input
              type="checkbox"
              checked={sessionOnly}
              onChange={(e) => setSessionOnly(e.target.checked)}
              data-testid="phase2-session-only-filter"
            />
            Show only candidates from this session ({sessionIds.length})
          </label>
        ) : null}

        {loading ? (
          <p className="p2-muted p2-loading-text">
            <Loader2 className="p2-btn-spinner" aria-hidden />
            Loading candidates with Phase 1 results…
          </p>
        ) : null}

        {!loading && allReady.length === 0 ? (
          <p className="p2-warn-text">
            No candidates have Phase 1 trajectory reports yet.{' '}
            <Link className="p2-link" to="/ai-hiring/candidate-fit/career-trajectory">
              Run Phase 1 analysis
            </Link>{' '}
            first.
          </p>
        ) : null}

        {!loading && candidateId && !phase1Ready ? (
          <p className="p2-warn-text">
            This candidate does not have a completed Phase 1 report. Pick someone from the list above.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-xl" data-testid="phase2-candidate-select-block">
      <div className="space-y-2">
        <Label htmlFor="phase2-candidate-select">Candidate (Phase 1 complete only)</Label>
        <Select
          value={candidateId || NONE}
          onValueChange={onChange}
          disabled={disabled || loading}
        >
          <SelectTrigger id="phase2-candidate-select" data-testid="phase2-candidate-select">
            <SelectValue
              placeholder={
                loading ? 'Loading Phase 1–ready candidates…' : 'Select candidate…'
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Select a candidate…</SelectItem>
            {options.map((row) => (
              <SelectItem key={row.candidate_id} value={row.candidate_id}>
                {candidateLabel(row)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {sessionIds.length > 0 ? (
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <Checkbox
            checked={sessionOnly}
            onCheckedChange={(v) => setSessionOnly(Boolean(v))}
            data-testid="phase2-session-only-filter"
          />
          Show only candidates from this session ({sessionIds.length})
        </label>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading candidates with Phase 1 results…
        </p>
      ) : null}

      {!loading && allReady.length === 0 ? (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          No candidates have Phase 1 trajectory reports yet.{' '}
          <Link
            className="text-indigo-700 underline font-medium"
            to="/ai-hiring/candidate-fit/career-trajectory"
          >
            Run Phase 1 analysis
          </Link>{' '}
          first.
        </p>
      ) : null}

      {!loading && candidateId && !phase1Ready ? (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          This candidate does not have a completed Phase 1 report. Pick someone from the list above.
        </p>
      ) : null}

      {!loading && candidateId && phase1Ready ? (
        <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-md px-3 py-2">
          Phase 1 trajectory is ready — you can run Phase 2 simulation below.
        </p>
      ) : null}
    </div>
  );
}
