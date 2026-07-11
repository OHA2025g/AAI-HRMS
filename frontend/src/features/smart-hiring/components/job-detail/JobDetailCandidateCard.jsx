import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { careerTrajectoryApi } from '@/shared/lib/api';
import { getCandidateDisplaySource } from '@/shared/lib/candidateSource';
import {
  getFitMetrics,
  getFitTier,
  getMatchedSkills,
  getOverallFitScore,
  metricBarClass,
  ringGradientStyle,
} from '@/shared/lib/jobDetailCandidatesUtils';

function JobDetailCandidateTrajectory({
  candidateId,
  jobId,
  summary,
  loading,
  onAnalyzed,
}) {
  const [analyzing, setAnalyzing] = useState(false);

  if (!candidateId) return null;

  const analyzeUrl = jobId
    ? `/ai-hiring/candidate-fit/career-trajectory?candidate_id=${candidateId}&job_id=${jobId}`
    : `/ai-hiring/candidate-fit/career-trajectory?candidate_id=${candidateId}`;

  const runQuickAnalyze = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setAnalyzing(true);
    try {
      await careerTrajectoryApi.reanalyze(candidateId);
      toast.success('Career trajectory analyzed');
      onAnalyzed?.();
    } catch (err) {
      toast.error(
        err.response?.data?.detail || 'Analysis failed — add resume text on profile first'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="jd-cand-trajectory">
        <span>
          <Loader2 className="jd-cand-traj-spinner" aria-hidden />
          Loading trajectory…
        </span>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="jd-cand-trajectory">
        <span>✣ No career trajectory yet</span>
        <div className="jd-cand-mini-actions">
          <button
            type="button"
            className="jd-cand-small-btn"
            disabled={analyzing}
            onClick={runQuickAnalyze}
          >
            {analyzing ? '…' : 'Analyze'}
          </button>
          <Link to={analyzeUrl} className="jd-cand-small-btn">
            Open
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="jd-cand-trajectory jd-cand-trajectory-has-data">
      <span>
        ✣ Trajectory {Math.round(summary.overall_score ?? 0)}%
        {summary.primary_archetype ? ` · ${summary.primary_archetype}` : ''}
      </span>
      <div className="jd-cand-mini-actions">
        <button
          type="button"
          className="jd-cand-small-btn"
          disabled={analyzing}
          onClick={runQuickAnalyze}
        >
          {analyzing ? '…' : 'Re-analyze'}
        </button>
        <Link to={analyzeUrl} className="jd-cand-small-btn">
          Open
        </Link>
      </div>
    </div>
  );
}

export default function JobDetailCandidateCard({
  app,
  jobId,
  trajSummary,
  trajLoading,
  onTrajRefresh,
  pipelineStep,
  canAdvance,
  stageUpdatingId,
  onAdvanceStage,
}) {
  const candidate = app.candidate;
  const sourceBadge = getCandidateDisplaySource(candidate);
  const overallScore = getOverallFitScore(app);
  const tier = getFitTier(overallScore);
  const metrics = getFitMetrics(app.fit_score);
  const matchedSkills = getMatchedSkills(app.fit_score);
  const ringStyle =
    overallScore != null ? ringGradientStyle(overallScore, tier.ringClass) : undefined;

  return (
    <article className="jd-cand-card" data-testid={`candidate-card-${app.id}`}>
      <div className="jd-cand-card-head">
        <div className="jd-cand-card-head-text">
          <div className="jd-cand-name">{candidate?.full_name || 'Candidate'}</div>
          <div className="jd-cand-email">
            {candidate?.email || candidate?.headline || ''}
          </div>
        </div>
        {sourceBadge ? (
          <div className="jd-cand-source">{sourceBadge.label}</div>
        ) : null}
      </div>

      {app.fit_score ? (
        <>
          <div className="jd-cand-fit">
            <div
              className={`jd-cand-ring${tier.ringClass === 'blue' ? ' jd-cand-ring-blue' : ''}`}
              style={ringStyle}
            >
              <span>{overallScore != null ? `${overallScore}%` : '—'}</span>
            </div>
            <div className="jd-cand-match-label">
              <small>Overall Fit</small>
              <b>{tier.label}</b>
            </div>
          </div>

          {metrics.map((metric) => (
            <div key={metric.key} className="jd-cand-metric">
              <div className="jd-cand-metric-title">
                <span>{metric.label}</span>
                <span>{metric.score}%</span>
              </div>
              <div className="jd-cand-bar">
                <div
                  className={metricBarClass(metric.score, overallScore)}
                  style={{ width: `${metric.score}%` }}
                />
              </div>
            </div>
          ))}

          {matchedSkills.length > 0 ? (
            <>
              <div className="jd-cand-skills-label">Matched Skills</div>
              <div className="jd-cand-skill-list">
                {matchedSkills.map((skill) => (
                  <span key={skill} className="jd-cand-skill">
                    {skill}
                  </span>
                ))}
              </div>
            </>
          ) : null}
        </>
      ) : (
        <div className="jd-cand-no-fit">Fit score is not available for this application yet.</div>
      )}

      <JobDetailCandidateTrajectory
        candidateId={app.candidate_id}
        jobId={jobId}
        summary={trajSummary}
        loading={trajLoading}
        onAnalyzed={onTrajRefresh}
      />

      <div className="jd-cand-footer-actions">
        <Link to={`/candidates/${app.candidate_id}`} className="jd-cand-footer-btn">
          View Profile
        </Link>
        {pipelineStep?.next && canAdvance ? (
          <button
            type="button"
            className="jd-cand-footer-btn jd-cand-footer-primary"
            disabled={stageUpdatingId === app.id}
            onClick={() => onAdvanceStage(app)}
          >
            {stageUpdatingId === app.id ? (
              <Loader2 className="jd-cand-btn-spinner" aria-hidden />
            ) : (
              pipelineStep.label
            )}
          </button>
        ) : null}
      </div>
    </article>
  );
}
