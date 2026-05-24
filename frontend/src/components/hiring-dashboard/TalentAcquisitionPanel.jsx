import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export default function TalentAcquisitionPanel({ talentAcquisition = {} }) {
  const mix = talentAcquisition?.source_mix || talentAcquisition?.by_source || {};
  const precision = talentAcquisition?.top_match_precision_proxy_pct;
  const dedup = talentAcquisition?.dedup_audit_events;
  const candidatesInWindow = talentAcquisition?.candidates_in_window;

  const mixEntries = typeof mix === 'object' && !Array.isArray(mix) ? Object.entries(mix).slice(0, 5) : [];

  if (!mixEntries.length && precision == null && dedup == null) {
    return null;
  }

  return (
    <Card className="border-indigo-100 bg-indigo-50/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-800" style={{ fontFamily: 'Outfit' }}>
          Talent acquisition signals (M9)
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-4 text-sm">
        {candidatesInWindow != null ? (
          <div>
            <p className="text-slate-500 text-xs">Candidates in window</p>
            <p className="font-semibold text-slate-900">{candidatesInWindow}</p>
          </div>
        ) : null}
        {precision != null ? (
          <div>
            <p className="text-slate-500 text-xs">Match precision proxy</p>
            <p className="font-semibold text-slate-900">{precision}%</p>
          </div>
        ) : null}
        {dedup != null ? (
          <div>
            <p className="text-slate-500 text-xs">Dedup events</p>
            <p className="font-semibold text-slate-900">{dedup}</p>
          </div>
        ) : null}
        {mixEntries.length > 0 ? (
          <div className="min-w-[200px]">
            <p className="text-slate-500 text-xs mb-1">Raw source mix (window)</p>
            <ul className="space-y-0.5">
              {mixEntries.map(([src, n]) => (
                <li key={src} className="flex justify-between gap-4">
                  <span className="text-slate-700">{src}</span>
                  <span className="font-medium">{n}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
