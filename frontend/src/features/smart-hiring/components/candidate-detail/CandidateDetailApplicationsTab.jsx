import React from 'react';
import CandidateDetailApplicationCard from './CandidateDetailApplicationCard';
import {
  applicationsKpiStripItems,
  computeApplicationsKpis,
} from '@/shared/lib/candidateDetailApplicationsUtils';

export default function CandidateDetailApplicationsTab({
  profile,
  applications = [],
  trajSummaries = {},
  pipelineStepByApp,
  canAdvanceStage,
  stageUpdatingId,
  onAdvanceStage,
}) {
  const kpis = computeApplicationsKpis(profile, applications);
  const kpiItems = applicationsKpiStripItems(kpis);

  if (!applications.length) {
    return (
      <>
        <section className="cd-kpi-strip" data-testid="candidate-applications-kpis">
          {kpiItems.map((item) => (
            <div key={item.key} className="cd-kpi">
              <div className={`cd-kpi-icon ${item.iconClass}`}>{item.icon}</div>
              <div>
                <small>{item.label}</small>
                <b>{item.value}</b>
              </div>
            </div>
          ))}
        </section>
        <article className="cda-empty" data-testid="candidate-applications-empty">
          <div className="cda-empty-icon" aria-hidden>
            ▣
          </div>
          <h3>No applications yet</h3>
          <p>This candidate hasn&apos;t applied to any jobs yet.</p>
        </article>
      </>
    );
  }

  return (
    <>
      <section className="cd-kpi-strip" data-testid="candidate-applications-kpis">
        {kpiItems.map((item) => (
          <div key={item.key} className="cd-kpi">
            <div className={`cd-kpi-icon ${item.iconClass}`}>{item.icon}</div>
            <div>
              <small>{item.label}</small>
              <b className={item.key === 'requirements' && kpis.requirementsMet === false ? 'cda-bad-text' : undefined}>
                {item.value}
              </b>
            </div>
          </div>
        ))}
      </section>

      <div className="cda-applications-list" data-testid="candidate-applications-tab">
        {applications.map((app) => (
          <CandidateDetailApplicationCard
            key={app.id}
            app={app}
            profile={profile}
            trajSummary={trajSummaries[app.candidate_id || profile?.id]}
            pipelineStep={pipelineStepByApp?.(app)}
            canAdvance={canAdvanceStage?.(app)}
            stageUpdatingId={stageUpdatingId}
            onAdvanceStage={onAdvanceStage}
          />
        ))}
      </div>
    </>
  );
}
