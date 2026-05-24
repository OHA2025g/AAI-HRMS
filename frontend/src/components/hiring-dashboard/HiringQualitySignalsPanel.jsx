import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export default function HiringQualitySignalsPanel({
  referralMetrics = {},
  careerTrajectoryCoverage = {},
  medianFitScore,
}) {
  const referrals = referralMetrics?.referrals_in_window ?? 0;
  const referralShare = referralMetrics?.referral_share_pct;
  const hiresFromReferrals = referralMetrics?.hires_from_referrals_in_window ?? 0;
  const trajectoryCoverage = careerTrajectoryCoverage?.coverage_pct;
  const withReport = careerTrajectoryCoverage?.candidates_with_report ?? 0;
  const pipelineCandidates = careerTrajectoryCoverage?.active_pipeline_candidates ?? 0;

  const hasContent =
    referrals > 0 ||
    referralShare != null ||
    hiresFromReferrals > 0 ||
    trajectoryCoverage != null ||
    medianFitScore != null;

  if (!hasContent) {
    return null;
  }

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-800" style={{ fontFamily: 'Outfit' }}>
          Quality & referral signals
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-6 text-sm">
        {medianFitScore != null ? (
          <div>
            <p className="text-slate-500 text-xs">Median fit score</p>
            <p className="font-semibold text-slate-900">{Math.round(medianFitScore)}%</p>
          </div>
        ) : null}
        {referrals > 0 || referralShare != null ? (
          <div>
            <p className="text-slate-500 text-xs">Referrals in window</p>
            <p className="font-semibold text-slate-900">
              {referrals}
              {referralShare != null ? (
                <span className="text-slate-500 font-normal ml-1">({referralShare}% of apps)</span>
              ) : null}
            </p>
          </div>
        ) : null}
        {hiresFromReferrals > 0 ? (
          <div>
            <p className="text-slate-500 text-xs">Hires from referrals</p>
            <p className="font-semibold text-slate-900">{hiresFromReferrals}</p>
          </div>
        ) : null}
        {trajectoryCoverage != null ? (
          <div>
            <p className="text-slate-500 text-xs">Career trajectory coverage</p>
            <p className="font-semibold text-slate-900">
              {trajectoryCoverage}%
              <span className="text-slate-500 font-normal ml-1">
                ({withReport}/{pipelineCandidates} in pipeline)
              </span>
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
