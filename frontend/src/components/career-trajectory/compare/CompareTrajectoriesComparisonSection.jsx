import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts';
import {
  COMPARE_MATRIX_ROWS,
  RADAR_COLORS,
  matrixCellValue,
  matrixInsight,
} from '../../../lib/compareTrajectoriesCommandUtils';
import { chartTitleCase } from '../../../lib/chartTitleCase';

export default function CompareTrajectoriesComparisonSection({
  selectedIds,
  summaries,
  nameById,
  radarData,
  hasRadarData,
  onExport,
}) {
  const hasSelection = selectedIds.length > 0;

  return (
    <section className="ctc-comparison">
      <div className="ctc-card" data-testid="career-compare-radar">
        <div className="ctc-section-title">
          <h2>{chartTitleCase('Trajectory radar')}</h2>
          <span className="ctc-muted ctc-small">Visual comparison</span>
        </div>
        <div className="ctc-radar-wrap">
          {hasRadarData ? (
            <div className="ctc-radar-chart">
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#dbe3ff" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#64748b' }} />
                  {selectedIds.map((id, i) =>
                    summaries[id] ? (
                      <Radar
                        key={id}
                        name={nameById[id] || id}
                        dataKey={id}
                        stroke={RADAR_COLORS[i % RADAR_COLORS.length]}
                        fill={RADAR_COLORS[i % RADAR_COLORS.length]}
                        fillOpacity={0.28}
                      />
                    ) : null
                  )}
                </RadarChart>
              </ResponsiveContainer>
              <div className="ctc-legend">
                {selectedIds.map((id, i) =>
                  summaries[id] ? (
                    <span key={id}>
                      <i
                        className="ctc-dot"
                        style={{ background: RADAR_COLORS[i % RADAR_COLORS.length] }}
                      />
                      {nameById[id] || `Candidate ${String.fromCharCode(65 + i)}`}
                    </span>
                  ) : null
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="ctc-radar">
                <div className="poly1" />
                <div className="poly2" />
              </div>
              <div className="ctc-legend">
                <span>
                  <i className="ctc-dot" style={{ background: '#5b4bff' }} />
                  Candidate A
                </span>
                <span>
                  <i className="ctc-dot" style={{ background: '#10b981' }} />
                  Candidate B
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="ctc-card" data-testid="career-compare-table">
        <div className="ctc-section-title">
          <h2>{chartTitleCase('Trajectory comparison matrix')}</h2>
          <button
            type="button"
            className="ctc-btn"
            onClick={onExport}
            disabled={!hasSelection}
            data-testid="compare-export-btn"
          >
            Export comparison
          </button>
        </div>
        {!hasSelection ? (
          <p className="ctc-muted">Add candidates to populate the comparison matrix.</p>
        ) : (
          <div className="ctc-table-wrap">
            <table className="ctc-table" data-testid="career-compare-metrics-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  {selectedIds.map((id) => (
                    <th key={id}>{nameById[id] || id}</th>
                  ))}
                  <th>Insight</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_MATRIX_ROWS.map((row) => (
                  <tr key={row.key}>
                    <td>{row.label}</td>
                    {selectedIds.map((id, idx) => {
                      const summary = summaries[id];
                      const val = matrixCellValue(summary, row);
                      if (row.hasBar) {
                        const pct = summary?.overall_score ?? 0;
                        return (
                          <td key={id}>
                            <span className="ctc-score-pill">{val}</span>
                            <div className={`ctc-bar ${idx % 2 === 1 ? 'green' : ''}`}>
                              <i style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
                            </div>
                          </td>
                        );
                      }
                      return <td key={id}>{val}</td>;
                    })}
                    <td className="ctc-insight-cell">{matrixInsight(row, selectedIds, summaries)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
