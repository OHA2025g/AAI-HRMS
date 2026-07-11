import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { careerTrajectoryApi } from '@/shared/lib/api';
import { fullReportUrl } from '@/shared/lib/candidateDetailTrajectoryUtils';

export default function TrajectoryInterviewPrepFooter({ candidateId, report }) {
  const [prep, setPrep] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!candidateId || !report) {
      setPrep(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    careerTrajectoryApi
      .getInterviewPrep(candidateId)
      .then((res) => {
        if (!cancelled) setPrep(res.data);
      })
      .catch(() => {
        if (!cancelled) setPrep(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [candidateId, report?.id]);

  const probes = prep?.recommended_interview_probes || report?.recommended_interview_probes || [];
  const status =
    loading ? 'Loading probes…' : probes.length ? `${probes.length} probe${probes.length === 1 ? '' : 's'} ready` : 'No probes generated.';

  return (
    <div className="cdt-prep-card" data-testid="interview-prep-panel">
      <div>
        <h3>
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M12 2l2.6 6.3L21 11l-6.4 2.7L12 20l-2.6-6.3L3 11l6.4-2.7L12 2z" />
          </svg>
          Career trajectory interview prep
        </h3>
        <p>Generate role-specific probes from the full AI trajectory report.</p>
        {probes.length ? (
          <ul className="cdt-prep-list">
            {probes.slice(0, 3).map((probe, i) => (
              <li key={i}>
                <strong>{probe.area}: </strong>
                {probe.question}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="cdt-prep-side">
        <span className="cdt-prep-status">{status}</span>
        <Link to={fullReportUrl(candidateId)} className="cdt-prep-link">
          Full report
        </Link>
      </div>
    </div>
  );
}
