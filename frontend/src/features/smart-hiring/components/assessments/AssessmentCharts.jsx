import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Line, ComposedChart, Legend, ReferenceLine, ScatterChart, Scatter, ZAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { chartTitleCase } from '@/shared/lib/chartTitleCase';

const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'];

const Empty = ({ h = 240, text }) => (
  <div className={`h-[${h}px] flex items-center justify-center text-slate-500 text-sm`} style={{ height: h }}>
    {text}
  </div>
);

export function AssessmentFunnelChart({ funnel = [] }) {
  const data = (funnel || []).map((row) => ({
    name: row.label,
    count: row.count,
    conversion: row.conversion_from_prev_pct,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold" style={{ fontFamily: 'Outfit' }}>
          {chartTitleCase('Assessment funnel')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value, _n, props) => {
                  const conv = props?.payload?.conversion;
                  return conv != null ? [`${value} (${conv}% conv.)`, 'Count'] : [value, 'Count'];
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Empty h={280} text="No funnel data yet" />
        )}
      </CardContent>
    </Card>
  );
}

export function AssessmentPassRateChart({ data = [] }) {
  const rows = (data || []).map((d) => ({
    name: (d.assessment_type || '').replace(/_/g, ' '),
    passRate: d.pass_rate_pct,
    completed: d.completed,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold" style={{ fontFamily: 'Outfit' }}>
          {chartTitleCase('Pass rate by type')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={rows}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis unit="%" domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="passRate" fill="#6366F1" name="Pass rate %" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Empty text="No scored submissions yet" />
        )}
      </CardContent>
    </Card>
  );
}

export function AssessmentScoreHistogram({ buckets = [], passThresholdPct = 70, onBucketClick, selectedBucket }) {
  const data = (buckets || []).map((b) => ({ name: b.bucket, count: b.count, min: b.min_score, max: b.max_score }));
  const thresholdBucket =
    data.find((d) => {
      const [lo] = (d.name || '0').split('-').map(Number);
      return passThresholdPct >= lo && passThresholdPct < lo + 10;
    })?.name || '70-80';

  return (
    <Card data-testid="assessment-score-histogram">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold" style={{ fontFamily: 'Outfit' }}>
          {chartTitleCase('Score distribution')}
        </CardTitle>
        {onBucketClick ? (
          <p className="text-xs text-slate-500 mt-1">Click a bar to filter scored results</p>
        ) : null}
      </CardHeader>
      <CardContent>
        {data.some((d) => d.count > 0) ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <ReferenceLine x={thresholdBucket} stroke="#EF4444" strokeDasharray="4 4" label={{ value: `Pass ${passThresholdPct}%`, position: 'top', fill: '#EF4444', fontSize: 11 }} />
              <Bar
                dataKey="count"
                fill="#8B5CF6"
                radius={[4, 4, 0, 0]}
                cursor={onBucketClick ? 'pointer' : 'default'}
                onClick={(bar) => {
                  if (onBucketClick && bar?.payload) onBucketClick(bar.payload);
                }}
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={selectedBucket === entry.name ? '#4F46E5' : '#8B5CF6'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Empty text="No scores yet" />
        )}
      </CardContent>
    </Card>
  );
}

export function AssessmentTrendsChart({ trends = [] }) {
  const data = trends || [];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold" style={{ fontFamily: 'Outfit' }}>
          {chartTitleCase('Invites & completions')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={data}>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" unit="%" domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="invited" fill="#6366F1" name="Invited" />
              <Bar yAxisId="left" dataKey="completed" fill="#10B981" name="Completed" />
              <Line yAxisId="right" type="monotone" dataKey="pass_rate_pct" stroke="#F59E0B" name="Pass rate %" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <Empty text="No trend data" />
        )}
      </CardContent>
    </Card>
  );
}

export function AssessmentSkillChart({ skills = [] }) {
  const data = (skills || []).slice(0, 10).map((s) => ({
    name: s.skill?.length > 18 ? `${s.skill.slice(0, 16)}…` : s.skill,
    avg: s.avg_score_pct,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold" style={{ fontFamily: 'Outfit' }}>
          {chartTitleCase('Skill performance')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
              <XAxis type="number" domain={[0, 100]} unit="%" />
              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="avg" fill="#EC4899" name="Avg score %" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Empty h={260} text="No skill-level scores yet" />
        )}
      </CardContent>
    </Card>
  );
}

const QUADRANT_COLORS = {
  high_fit_pass: '#10B981',
  high_fit_fail: '#F59E0B',
  low_fit_pass: '#6366F1',
  low_fit_fail: '#EF4444',
};

export function FitVsScoreScatterChart({ points = [], threshold = 70 }) {
  const data = (points || []).map((p) => ({
    ...p,
    x: p.fit_score,
    y: p.assessment_score_pct,
    fill: QUADRANT_COLORS[p.quadrant] || '#94A3B8',
  }));

  return (
    <Card data-testid="fit-vs-score-chart">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold" style={{ fontFamily: 'Outfit' }}>
          {chartTitleCase('Fit score vs assessment score')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={320}>
              <ScatterChart margin={{ top: 12, right: 16, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="x" name="Fit score" unit="%" domain={[0, 100]} />
                <YAxis type="number" dataKey="y" name="Assessment" unit="%" domain={[0, 100]} />
                <ZAxis range={[60, 60]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  formatter={(value, name) => [`${value}%`, name === 'x' ? 'Fit' : 'Assessment']}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.candidate_name || ''}
                />
                <ReferenceLine x={threshold} stroke="#64748B" strokeDasharray="4 4" />
                <ReferenceLine y={threshold} stroke="#64748B" strokeDasharray="4 4" />
                <Scatter data={data} fill="#6366F1">
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-600">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> High fit · Pass</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> High fit · Fail</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Low fit · Pass</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Low fit · Fail</span>
            </div>
          </>
        ) : (
          <Empty h={320} text="Score submissions with fit scores to populate calibration chart" />
        )}
      </CardContent>
    </Card>
  );
}

export function TimeVsScoreScatterChart({ points = [] }) {
  const data = (points || []).map((p) => ({
    ...p,
    x: p.minutes,
    y: p.score_pct,
  }));

  return (
    <Card data-testid="time-vs-score-chart">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold" style={{ fontFamily: 'Outfit' }}>
          {chartTitleCase('Time vs score')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 12, right: 16, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey="x" name="Minutes" unit=" min" />
              <YAxis type="number" dataKey="y" name="Score" unit="%" domain={[0, 100]} />
              <ZAxis range={[60, 60]} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(value, name) => [name === 'x' ? `${value} min` : `${value}%`, name === 'x' ? 'Time vs score' : 'Score']}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.candidate_name || ''}
              />
              <Scatter data={data} fill="#6366F1" />
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <Empty h={320} text="Scored submissions with timing data will appear here" />
        )}
      </CardContent>
    </Card>
  );
}
