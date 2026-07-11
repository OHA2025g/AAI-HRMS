/** Export assessment results as CSV (browser download). */

function escapeCsv(value) {
  const s = value == null ? '' : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadAssessmentResultsCsv(rows, filename = 'assessment-results.csv') {
  const headers = ['Candidate', 'Assessment', 'Job', 'Score %', 'Pass', 'Status', 'Completed', 'Invited'];
  const lines = [
    headers.join(','),
    ...rows.map((s) =>
      [
        escapeCsv(s.candidate_name),
        escapeCsv(s.assessment_title),
        escapeCsv(s.job_title),
        escapeCsv(s.score_pct),
        escapeCsv(s.passed == null ? '' : s.passed ? 'Pass' : 'Fail'),
        escapeCsv(s.status),
        escapeCsv(s.completed_at ? new Date(s.completed_at).toISOString() : ''),
        escapeCsv(s.invited_at ? new Date(s.invited_at).toISOString() : ''),
      ].join(',')
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
