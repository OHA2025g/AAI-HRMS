import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { candidateDisplayName } from '@/shared/lib/candidateListUtils';
import {
  buildAiInsight,
  formatAvailability,
  formatExperienceYears,
  getCandidateSourceLabel,
  getStatusBadgeLabel,
  initials,
  resolveCandidateFitScore,
  ringGradientStyle,
  topSkillNames,
} from '@/shared/lib/candidatesCommandUtils';

export default function CandidateIntelligenceCard({
  candidate,
  app,
  trajSummary,
  pipelineStep,
  canAdvance,
  stageUpdatingId,
  onAdvanceStage,
}) {
  const fitScore = resolveCandidateFitScore(candidate, app, trajSummary);
  const displayScore = fitScore ?? 0;
  const statusLabel = getStatusBadgeLabel(candidate, app, fitScore);
  const skills = topSkillNames(candidate?.skills, 5);
  const insight = buildAiInsight(candidate, app, trajSummary, fitScore);
  const analyzeUrl = app?.job_id
    ? `/ai-hiring/candidate-fit/career-trajectory?candidate_id=${candidate.id}&job_id=${app.job_id}`
    : `/ai-hiring/candidate-fit/career-trajectory?candidate_id=${candidate.id}`;

  return (
    <article className="cand-card" data-testid={`candidate-card-${candidate.id}`}>
      <div className="cand-head">
        <div className="cand-person">
          <div className="cand-avatar">{initials(candidateDisplayName(candidate))}</div>
          <div>
            <div className="cand-name">{candidateDisplayName(candidate)}</div>
            <div className="cand-email">{candidate.email || candidate.headline || '—'}</div>
          </div>
        </div>
        <div className="cand-fit">
          <span className="cand-status">{statusLabel}</span>
          <div className="cand-ring" style={ringGradientStyle(displayScore)}>
            <span>{fitScore != null ? `${fitScore}%` : '—'}</span>
          </div>
        </div>
      </div>

      <div className="cand-meta">
        <div>
          <small>Source</small>
          <b>{getCandidateSourceLabel(candidate)}</b>
        </div>
        <div>
          <small>Experience</small>
          <b>{formatExperienceYears(candidate.total_experience_years)}</b>
        </div>
        <div>
          <small>Availability</small>
          <b>{formatAvailability(candidate)}</b>
        </div>
      </div>

      <div className="cand-skills">
        {skills.length ? (
          skills.map((skill) => (
            <span key={`${candidate.id}-${skill}`} className="cand-skill">
              {skill}
            </span>
          ))
        ) : (
          <span className="cand-skill">Skills pending</span>
        )}
      </div>

      <div className="cand-ai-box">
        <b>✦ AI Insight</b>
        <p>{insight}</p>
      </div>

      <div className="cand-card-actions">
        <Link to={`/candidates/${candidate.id}`} className="cand-linkbtn cand-linkbtn-fill">
          View Profile
        </Link>
        <Link to={analyzeUrl} className="cand-linkbtn">
          Analyze
        </Link>
        {pipelineStep?.next && canAdvance ? (
          <button
            type="button"
            className="cand-linkbtn cand-linkbtn-soft"
            disabled={stageUpdatingId === app?.id}
            onClick={() => onAdvanceStage(app)}
          >
            {stageUpdatingId === app?.id ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Pipeline'}
          </button>
        ) : (
          <Link to="/pipeline" className="cand-linkbtn cand-linkbtn-soft">
            Pipeline
          </Link>
        )}
      </div>
    </article>
  );
}
