import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { employeeApi, phase2FitApi } from '../../../lib/api';
import {
  barWidthPercent,
  buildPhase2FitChips,
  buildPhase2SignalRows,
  formatScorePercent,
} from '../../../lib/candidateDetailTrajectoryUtils';

const NONE_MANAGER = '__none__';

export default function Phase2ManagerFitPanel({
  candidateId,
  candidateName,
  trajectoryReport,
  onPhase2Change,
}) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [managerEmployeeId, setManagerEmployeeId] = useState(NONE_MANAGER);
  const [managerOpen, setManagerOpen] = useState(false);

  const load = useCallback(async () => {
    if (!candidateId) return;
    try {
      const res = await phase2FitApi.getByCandidate(candidateId);
      setReport(res.data);
      onPhase2Change?.(res.data);
    } catch (e) {
      setReport(null);
      onPhase2Change?.(null);
      if (e?.response?.status !== 404) {
        toast.error('Could not load Phase 2 simulation');
      }
    }
  }, [candidateId, onPhase2Change]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let alive = true;
    employeeApi
      .list({ limit: 200 })
      .then((res) => {
        const rows = Array.isArray(res.data) ? res.data : res.data?.items || [];
        if (alive) setEmployees(rows);
      })
      .catch(() => {
        if (alive) setEmployees([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const runSimulation = async () => {
    if (!candidateId || !trajectoryReport?.id) {
      toast.error('Complete Phase 1 analysis first');
      return;
    }
    setLoading(true);
    try {
      const res = await phase2FitApi.simulate({
        candidate_id: candidateId,
        trajectory_report_id: trajectoryReport.id,
        job_id: trajectoryReport.job_id || undefined,
        manager_employee_id:
          managerEmployeeId && managerEmployeeId !== NONE_MANAGER ? managerEmployeeId : undefined,
      });
      setReport(res.data);
      onPhase2Change?.(res.data);
      toast.success('Phase 2 contextual fit simulation complete');
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Phase 2 simulation failed');
    } finally {
      setLoading(false);
    }
  };

  const managerLabel = (emp) => {
    const name = emp.full_name || emp.name || emp.email || emp.id;
    const code = emp.employee_code ? ` (${emp.employee_code})` : '';
    return `${name}${code}`;
  };

  const selectedManagerLabel =
    managerEmployeeId && managerEmployeeId !== NONE_MANAGER
      ? managerLabel(employees.find((e) => e.id === managerEmployeeId) || {})
      : 'Compare with ideal manager profile';

  const fitChips = buildPhase2FitChips(report);
  const signalRows = report ? buildPhase2SignalRows(report, trajectoryReport) : [];
  const archetype = trajectoryReport?.primary_archetype?.name || 'candidate profile';

  return (
    <div className="cdt-panel cdt-sim-panel" data-testid="trajectory-phase2-panel">
      <div className="cdt-panel-title cdt-panel-title-flush">
        <div>
          <h3>
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M12 2v20M2 12h20" />
            </svg>
            Phase 2 — Manager fit
          </h3>
          <p>Simulate alignment against a hiring manager or archetype profile.</p>
        </div>
      </div>

      <div className="cdt-sim-card">
        <strong>Simulating for: {candidateName || 'This candidate'}</strong>
        <span>Phase 2 uses this profile&apos;s Phase 1 trajectory only — not other candidates.</span>
      </div>

      <button
        type="button"
        className="cdt-manager-toggle"
        onClick={() => setManagerOpen((v) => !v)}
        data-testid="phase2-manager-advanced-toggle"
      >
        {managerOpen
          ? 'Hide hiring manager comparison'
          : 'Optional: compare against a specific hiring manager'}
      </button>

      {managerOpen ? (
        <label className="cdt-manager-select-wrap">
          <span className="cdt-sr-only">Hiring manager</span>
          <select
            className="cdt-manager-select"
            value={managerEmployeeId}
            onChange={(e) => setManagerEmployeeId(e.target.value)}
            data-testid="phase2-manager-select"
          >
            <option value={NONE_MANAGER}>Compare with ideal manager profile</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {managerLabel(emp)}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className="cdt-manager-select" aria-hidden>
          <span>{selectedManagerLabel}</span>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
            <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
      )}

      <button
        type="button"
        className="cdt-btn cdt-btn-primary cdt-btn-block"
        onClick={runSimulation}
        disabled={loading || !trajectoryReport?.id}
        data-testid="phase2-run-btn"
      >
        {loading ? <span className="cdt-btn-spinner" aria-hidden /> : null}
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M13 2 3 14h9l-1 8 10-12h-9Z" />
        </svg>
        Run Phase 2 simulation
      </button>

      {report ? (
        <>
          <div className="cdt-context-fit" data-testid="phase2-contextual-fit-score">
            <div className="cdt-fit-number">{formatScorePercent(report.overall_contextual_fit_score)}</div>
            <p>
              {report.executive_summary ||
                `Contextual fit for ${archetype} using role context and ideal manager alignment.`}
            </p>
            <div className="cdt-chip-row">
              {fitChips.map((chip) => (
                <span key={chip.label} className={`cdt-chip cdt-chip-${chip.variant}`}>
                  {chip.label}
                </span>
              ))}
            </div>
          </div>
          <div className="cdt-signal-list">
            {signalRows.map((row) => (
              <div key={row.key} className="cdt-signal-row">
                <span>{row.label}</span>
                <div className={`cdt-bar ${row.barClass}`}>
                  <i style={{ width: `${barWidthPercent(row.value)}%` }} />
                </div>
                <b>{formatScorePercent(row.value)}</b>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="cdt-muted-note">No Phase 2 report yet. Run simulation after Phase 1 analysis.</p>
      )}
    </div>
  );
}
