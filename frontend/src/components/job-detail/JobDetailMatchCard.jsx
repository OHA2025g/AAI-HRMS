import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getMatchScore,
  getFitTierLabel,
  getFitBadge,
  getRingColor,
  getBarFillClass,
  getFitSubtitle,
  formatCandidateLocation,
  getSourceTagClass,
  getSourceTagLabel,
  buildInsightSection,
  getMatchedSkillsDisplay,
} from '../../lib/jobDetailMatchesUtils';

function metricValue(fitScore, key) {
  const map = {
    skills: fitScore?.skill_match_pct ?? fitScore?.skill_score ?? 0,
    title: fitScore?.title_score ?? 0,
    activity: fitScore?.activity_match_pct ?? 0,
    experience: fitScore?.experience_score ?? 0,
  };
  const v = map[key];
  return Math.round(Number(v) || 0);
}

export default function JobDetailMatchCard({ match, allMatches, onAddToPipeline }) {
  const [bookmarked, setBookmarked] = useState(false);
  const candidate = match?.candidate;
  const fitScore = match?.fit_score;

  if (!candidate?.id || !fitScore) {
    return null;
  }

  const score = getMatchScore(match);
  const fitBadge = getFitBadge(score);
  const ringColor = getRingColor(score);
  const subtitle = getFitSubtitle(score, fitScore, allMatches);
  const insight = buildInsightSection(fitScore);
  const skillsBlock = getMatchedSkillsDisplay(fitScore);
  const sourceTagClass = getSourceTagClass(candidate);
  const sourceTagLabel = getSourceTagLabel(candidate);

  const metrics = [
    { key: 'skills', label: 'Skills Match' },
    { key: 'title', label: 'Title Match' },
    { key: 'activity', label: 'Activity Match' },
    { key: 'experience', label: 'Experience' },
  ];

  return (
    <article className="jd-match-card" data-testid={`match-card-${candidate.id}`}>
      <div className="jd-match-candidate-top">
        <div className="jd-match-photo" aria-hidden>
          {candidate.profile_photo_url ? (
            <img src={candidate.profile_photo_url} alt="" />
          ) : (
            <span className="jd-match-photo-placeholder">👤</span>
          )}
        </div>
        <div className="jd-match-candidate-info">
          <div className="jd-match-name">
            {candidate.full_name}
            <span className={`jd-match-tag ${fitBadge.className}`}>{fitBadge.label}</span>
          </div>
          <div className="jd-match-role">{candidate.headline || candidate.email || '—'}</div>
          <div className="jd-match-loc">{formatCandidateLocation(candidate)}</div>
        </div>
        <span className={`jd-match-tag ${sourceTagClass}`}>{sourceTagLabel}</span>
      </div>

      <div className="jd-match-block">
        <div
          className="jd-match-ring"
          style={{ background: `conic-gradient(${ringColor} 0 ${score}%, #e2e8f0 ${score}%)` }}
        >
          <span>{Math.round(score)}%</span>
        </div>
        <div className="jd-match-title-block">
          <small>Overall Fit</small>
          <b>{getFitTierLabel(score)}</b>
          <p className={subtitle.className}>{subtitle.text}</p>
        </div>
      </div>

      {insight ? (
        <div className="jd-match-insight">
          <b>{insight.title}</b>
          {insight.rows.map((row) => (
            <div key={row.label} className="jd-match-insight-row">
              <span className={`jd-match-dot ${row.tone}`}>{row.icon}</span>
              {row.label}
            </div>
          ))}
        </div>
      ) : null}

      {metrics.map(({ key, label }) => {
        const val = metricValue(fitScore, key);
        return (
          <div key={key} className="jd-match-metric">
            <div className="jd-match-metric-title">
              <span>{label}</span>
              <span>{val}%</span>
            </div>
            <div className="jd-match-bar">
              <div
                className={`jd-match-fill ${getBarFillClass(val)}`}
                style={{ width: `${val}%` }}
              />
            </div>
          </div>
        );
      })}

      {skillsBlock ? (
        <>
          <div className="jd-match-skills-label">{skillsBlock.label}</div>
          <div className="jd-match-skill-list">
            {skillsBlock.skills.map((skill) => (
              <span key={skill} className={`jd-match-skill ${skillsBlock.variant === 'red' ? 'red' : ''}`}>
                {skill}
              </span>
            ))}
            {skillsBlock.extra > 0 ? (
              <span className="jd-match-skill more">+{skillsBlock.extra}</span>
            ) : null}
          </div>
        </>
      ) : null}

      <div className="jd-match-footer">
        <Link to={`/candidates/${candidate.id}`}>
          <button type="button">View Profile</button>
        </Link>
        <button type="button" className="primary" onClick={() => onAddToPipeline(candidate.id)}>
          ＋ Add to Pipeline
        </button>
        <button
          type="button"
          className={bookmarked ? 'bookmarked' : undefined}
          aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark candidate'}
          onClick={() => setBookmarked((v) => !v)}
        >
          {bookmarked ? '♥' : '♡'}
        </button>
      </div>
    </article>
  );
}
