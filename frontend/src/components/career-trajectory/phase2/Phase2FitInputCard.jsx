import React from 'react';
import { Loader2 } from 'lucide-react';
import { Phase2CandidateSelect } from '../Phase2CandidateSelect';
import { formatSimulatingNote } from '../../../lib/phase2FitCommandUtils';

const NONE_MANAGER = '__none__';

export default function Phase2FitInputCard({
  candidateId,
  jobId,
  phase1Ready,
  showCandidatePicker,
  lockToCandidate,
  candidateMeta,
  candidateDisplayName,
  employees,
  managerEmployeeId,
  onManagerChange,
  managerLabel,
  onCandidateChange,
  onRun,
  onCompareManagers,
  loading,
  managerPickerOpen,
  pinnedToProfile,
}) {
  const simNote = formatSimulatingNote(
    candidateMeta ||
      (candidateDisplayName
        ? { full_name: candidateDisplayName, primary_archetype: null, overall_score: null }
        : null)
  );

  const managerSelect = (
    <select
      className="p2-input"
      id="phase2-manager-select"
      value={managerEmployeeId || NONE_MANAGER}
      onChange={(e) => onManagerChange(e.target.value)}
      data-testid="phase2-manager-select"
    >
      <option value={NONE_MANAGER}>Archetype ideal profile</option>
      {employees.map((emp) => (
        <option key={emp.id} value={emp.id}>
          {managerLabel(emp)}
        </option>
      ))}
    </select>
  );

  return (
    <div className="p2-card p2-phase-card">
      <h2>Phase 2 — Leadership &amp; manager fit</h2>
      <p className="p2-muted">
        Validate how the candidate may perform with the hiring manager, decision environment, and
        role expectations.
      </p>

      {simNote ? (
        <div className="p2-note" data-testid="phase2-locked-candidate">
          <b>Simulating for:</b> {simNote}
          <br />
          <small>
            Phase 2 uses candidate trajectory, role context, and archetype manager profile.
          </small>
        </div>
      ) : null}

      <div className="p2-form-grid">
        {showCandidatePicker && !lockToCandidate ? (
          <Phase2CandidateSelect
            candidateId={candidateId}
            jobId={jobId}
            onSelect={onCandidateChange}
            commandStyle
          />
        ) : (
          <div className="p2-field">
            <label htmlFor="phase2-candidate-select">Candidate</label>
            <select className="p2-input" id="phase2-candidate-select" disabled value={candidateId || ''}>
              <option value={candidateId || ''}>
                {simNote || candidateDisplayName || 'Selected candidate'}
              </option>
            </select>
          </div>
        )}

        <div className="p2-field">
          <label htmlFor="phase2-manager-select">Hiring manager profile</label>
          {pinnedToProfile && !managerPickerOpen ? (
            <>
              <select className="p2-input" disabled value={NONE_MANAGER}>
                <option value={NONE_MANAGER}>Archetype ideal profile</option>
              </select>
            </>
          ) : (
            managerSelect
          )}
        </div>
      </div>

      <div className="p2-actions-row">
        <button
          type="button"
          className="p2-btn primary"
          onClick={onRun}
          disabled={loading || !candidateId || !phase1Ready}
          data-testid="phase2-run-btn"
        >
          {loading ? <Loader2 className="p2-btn-spinner" aria-hidden /> : null}
          Run simulation
        </button>
        {pinnedToProfile ? (
          <button type="button" className="p2-btn secondary" onClick={onCompareManagers} data-testid="phase2-manager-advanced-toggle">
            Compare manager profiles
          </button>
        ) : (
          <button type="button" className="p2-btn secondary" onClick={onCompareManagers}>
            Compare manager profiles
          </button>
        )}
      </div>

      {!candidateId && showCandidatePicker ? (
        <p className="p2-muted p2-help">Select a Phase 1–ready candidate above to enable simulation.</p>
      ) : null}
      {candidateId && !phase1Ready ? (
        <p className="p2-warn-text">Phase 1 trajectory is required before running Phase 2.</p>
      ) : null}
      {candidateId && phase1Ready ? (
        <p className="p2-ready-text">Phase 1 trajectory is ready — you can run Phase 2 simulation.</p>
      ) : null}
    </div>
  );
}
