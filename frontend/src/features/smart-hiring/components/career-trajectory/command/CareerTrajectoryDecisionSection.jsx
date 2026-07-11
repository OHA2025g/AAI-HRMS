import React from 'react';
import { formatDecisionGateLabel, formatMissingEvidenceItem } from '@/shared/lib/careerTrajectoryCommandUtils';

export default function CareerTrajectoryDecisionSection({
  decisionGate,
  missingEvidence = [],
  interviewProbes = [],
}) {
  const probes = Array.isArray(interviewProbes) ? interviewProbes : [];
  const missing = Array.isArray(missingEvidence) ? missingEvidence : [];

  return (
    <>
      <section className="ct-card ct-decision">
        <h3>Decision gate</h3>
        <p className="ct-score-link">{formatDecisionGateLabel(decisionGate?.category)}</p>
        {decisionGate?.reason ? <p>{decisionGate.reason}</p> : null}
        {decisionGate?.recommended_next_step ? <p>{decisionGate.recommended_next_step}</p> : null}
      </section>

      {missing.length > 0 ? (
        <section className="ct-warnbox">
          <b>⚠ Missing evidence</b>
          <ul>
            {missing.map((item, i) => (
              <li key={i}>{formatMissingEvidenceItem(item)}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {probes.length > 0 ? (
        <section className="ct-card ct-decision">
          <h3>Interview probes</h3>
          <table className="ct-table ct-probes-table">
            <tbody>
              {probes.map((p, i) => (
                <tr key={i}>
                  <td>
                    <b>{p.area}:</b> {p.question}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </>
  );
}
