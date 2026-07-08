import React from 'react';
import { Link } from 'react-router-dom';
import PipelineQuickKpis from './PipelineQuickKpis';
import PipelineCandidateCard from './PipelineCandidateCard';
import {
  avgFitScore,
  countMatchedSkillsAcross,
  countRecommended,
} from '../../lib/pipelineCommandUtils';

export default function PipelineSourcedTab({
  sourcedApps,
  jobTitle,
  jobId,
  trajSummaries,
  trajLoading,
  onTrajRefresh,
  canMoveToScreening,
  onMoveToScreening,
  updating,
}) {
  const kpis = [
    { value: countRecommended(sourcedApps), label: 'Recommended now' },
    { value: avgFitScore(sourcedApps) != null ? `${avgFitScore(sourcedApps)}%` : '—', label: 'Average sourced fit' },
    { value: countMatchedSkillsAcross(sourcedApps), label: 'Matched skills' },
    { value: 0, label: 'Pending feedback' },
  ];

  return (
    <div className="pl-board pl-board--full">
      <section>
        <PipelineQuickKpis items={kpis} />
        {sourcedApps.length === 0 ? (
          <div className="pl-empty">No sourced candidates yet.</div>
        ) : (
          <div className="pl-cards">
            {sourcedApps.map((app) => (
              <PipelineCandidateCard
                key={app.id}
                app={app}
                jobTitle={jobTitle}
                jobId={jobId}
                trajSummary={trajSummaries[app.candidate_id]}
                trajLoading={trajLoading}
                onTrajRefresh={onTrajRefresh}
                variant="sourced"
                footer={
                  <div className="pl-footer-actions">
                    <Link to={`/candidates/${app.candidate_id}`} className="pl-btn">
                      View Profile
                    </Link>
                    {canMoveToScreening ? (
                      <button
                        type="button"
                        className="pl-btn pl-btn-primary"
                        disabled={updating}
                        onClick={() => onMoveToScreening(app.id)}
                      >
                        Selected for next round
                      </button>
                    ) : null}
                  </div>
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
