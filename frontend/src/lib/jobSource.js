/** Excel-imported requisitions vs demo/QA/other seeded jobs. */

const EXCEL_JOB_MARKER = 'excel_job_descriptions_v1';

export function isExcelJob(job) {
  if (!job) return false;
  const marker = String(job.seed_marker || '').trim();
  if (marker === EXCEL_JOB_MARKER) return true;
  if (job.import_source_file || job.import_stable_id) return true;
  return false;
}

export function isSeededJob(job) {
  return Boolean(job) && !isExcelJob(job);
}

/**
 * Grid is 3 columns: seeded | excel | seeded per row, repeating for all jobs.
 */
export function orderJobsSeededExcelPattern(jobs) {
  if (!Array.isArray(jobs) || jobs.length === 0) return [];

  const seeded = [];
  const excel = [];
  for (const job of jobs) {
    if (isExcelJob(job)) excel.push(job);
    else seeded.push(job);
  }

  const out = [];
  let si = 0;
  let ei = 0;
  let pos = 0;

  while (si < seeded.length || ei < excel.length) {
    const slot = pos % 3;
    const wantExcel = slot === 1;

    if (wantExcel) {
      if (ei < excel.length) out.push(excel[ei++]);
      else if (si < seeded.length) out.push(seeded[si++]);
      else break;
    } else if (si < seeded.length) {
      out.push(seeded[si++]);
    } else if (ei < excel.length) {
      out.push(excel[ei++]);
    } else {
      break;
    }
    pos += 1;
  }

  return out;
}
