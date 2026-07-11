import React from 'react';

export const FitScoreRing = ({ score, size = 64, strokeWidth = 6, className = '' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  
  const getScoreColor = (score) => {
    if (score >= 80) return '#10B981'; // emerald
    if (score >= 60) return '#6366F1'; // indigo
    if (score >= 40) return '#F59E0B'; // amber
    return '#EF4444'; // red
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Low';
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="progress-ring">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          className="progress-ring__circle"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={getScoreColor(score)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
          {Math.round(score)}%
        </span>
      </div>
    </div>
  );
};

export const FitScoreBar = ({ label, score, className = '' }) => {
  const getScoreColor = (score) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-indigo-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <span className="text-xs font-semibold text-slate-900">{Math.round(score)}%</span>
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${getScoreColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
};

export const FitScoreCard = ({ fitScore, showDetails = false }) => {
  if (!fitScore) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <FitScoreRing score={fitScore.final_score} size={72} />
        <div>
          <div className="text-sm font-medium text-slate-600">Overall Fit</div>
          <div className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
            {fitScore.final_score >= 80 ? 'Excellent Match' : 
             fitScore.final_score >= 60 ? 'Good Match' : 
             fitScore.final_score >= 40 ? 'Fair Match' : 'Low Match'}
          </div>
          {!fitScore.must_have_ok && (
            <div className="text-xs text-red-600 font-medium mt-1">
              Missing required skills
            </div>
          )}
        </div>
      </div>

      {showDetails && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <FitScoreBar label="Skills Match" score={fitScore.skill_match_pct} />
          <FitScoreBar label="Title Match" score={fitScore.title_score} />
          <FitScoreBar label="Activity Match" score={fitScore.activity_match_pct} />
          <FitScoreBar label="Experience" score={fitScore.experience_score} />
        </div>
      )}

      {showDetails && fitScore.ranking_explainability && (
        <div className="pt-2 border-t border-indigo-100 bg-indigo-50/40 rounded-md p-3 space-y-2">
          <div className="text-xs font-semibold text-indigo-800 uppercase tracking-wide">Multi-source ranking</div>
          <div className="text-xs text-slate-600">
            Model: <span className="font-medium text-slate-800">{fitScore.ranking_explainability.score_source}</span>
            {fitScore.ranking_explainability.deterministic_match && (
              <span className="ml-2">
                · deterministic score{' '}
                <span className="font-mono font-medium">
                  {fitScore.ranking_explainability.deterministic_match.score}
                </span>
              </span>
            )}
          </div>
          {fitScore.ranking_explainability.deterministic_match && (
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
              <div>Title overlap: {fitScore.ranking_explainability.deterministic_match.title_score}%</div>
              <div>Skill overlap: {fitScore.ranking_explainability.deterministic_match.skill_score}%</div>
              <div>Resume/JD text: {fitScore.ranking_explainability.deterministic_match.description_score}%</div>
              <div>Must-haves: {fitScore.ranking_explainability.deterministic_match.must_have_ok ? 'OK' : 'Gap'}</div>
            </div>
          )}
          {fitScore.ranking_explainability.score_factors && (
            <div className="text-xs text-slate-600">
              <span className="font-medium text-slate-700">Weighted factors: </span>
              {Object.entries(fitScore.ranking_explainability.score_factors).map(([k, v]) => (
                <span key={k} className="mr-2">
                  {k.replace(/_/g, ' ')}: <span className="font-mono">{Number(v).toFixed(2)}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {showDetails && fitScore.explanation && (
        <div className="pt-2 border-t border-slate-100 space-y-2">
          {fitScore.explanation.matched_skills?.length > 0 && (
            <div>
              <div className="text-xs font-medium text-slate-500 mb-1">Matched Skills</div>
              <div className="flex flex-wrap gap-1">
                {fitScore.explanation.matched_skills.map((skill, i) => (
                  <span key={i} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-md">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          {fitScore.explanation.missing_must_have?.length > 0 && (
            <div>
              <div className="text-xs font-medium text-slate-500 mb-1">Missing Required</div>
              <div className="flex flex-wrap gap-1">
                {fitScore.explanation.missing_must_have.map((skill, i) => (
                  <span key={i} className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-md">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FitScoreRing;
