import React from 'react';

export default function ReferralsLeaderboard({ rows }) {
  const list = rows || [];

  return (
    <section className="rf-card rf-leaderboard-wrap" data-testid="referrals-leaderboard">
      <div className="rf-section-title">
        <h2>Referral leaderboard</h2>
        <button type="button" className="rf-link">
          Export →
        </button>
      </div>
      <table className="rf-leader">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Employee</th>
            <th>Referrals</th>
            <th>In pipeline</th>
            <th>Hires</th>
            <th>Impact</th>
          </tr>
        </thead>
        <tbody>
          {list.map((row) => (
            <tr key={row.rank}>
              <td>
                <span className={`rf-rank${row.gold ? ' gold' : ''}`}>{row.rank}</span>
              </td>
              <td>{row.employee}</td>
              <td>{row.referrals}</td>
              <td>{row.pipeline}</td>
              <td>{row.hires}</td>
              <td>{row.impact}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
