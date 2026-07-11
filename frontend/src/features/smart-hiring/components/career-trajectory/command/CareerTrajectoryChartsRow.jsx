import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts';
import { CareerTimeline } from '../CareerTimeline';
import { chartTitleCase } from '@/shared/lib/chartTitleCase';

export default function CareerTrajectoryChartsRow({ radarData, timeline }) {
  return (
    <section className="ct-grid2">
      <div className="ct-card">
        <h3>{chartTitleCase('Trajectory radar')}</h3>
        <div className="ct-radar">
          {radarData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#dbe3ff" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#64748b' }} />
                <Radar
                  dataKey="score"
                  stroke="#6d4cff"
                  fill="#6d4cff"
                  fillOpacity={0.28}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <p className="ct-muted">No score data available.</p>
          )}
        </div>
      </div>
      <div className="ct-card">
        <h3>{chartTitleCase('Career timeline')}</h3>
        <CareerTimeline timeline={timeline} commandStyle />
      </div>
    </section>
  );
}
