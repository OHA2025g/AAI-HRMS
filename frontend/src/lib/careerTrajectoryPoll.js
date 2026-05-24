import { careerTrajectoryApi } from './api';

export class AnalyzeJobFailedError extends Error {
  constructor(message, jobId) {
    super(message);
    this.name = 'AnalyzeJobFailedError';
    this.jobId = jobId;
  }
}

export class AnalyzeJobTimeoutError extends Error {
  constructor(message, jobId) {
    super(message);
    this.name = 'AnalyzeJobTimeoutError';
    this.jobId = jobId;
  }
}

export function isRetryableAnalyzeError(error) {
  return (
    error instanceof AnalyzeJobFailedError ||
    error instanceof AnalyzeJobTimeoutError
  );
}

export function getRetryableJobId(error) {
  if (isRetryableAnalyzeError(error)) return error.jobId;
  return null;
}

/**
 * Poll a background analyze job until completed or failed.
 * @returns {Promise<object>} Full trajectory report
 */
export async function pollAnalyzeJob(jobId, { maxAttempts = 90, intervalMs = 1500 } = {}) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const res = await careerTrajectoryApi.getAnalyzeJob(jobId);
    const job = res.data;
    if (job.status === 'completed' && job.report_id) {
      const reportRes = await careerTrajectoryApi.getReport(job.report_id);
      return reportRes.data;
    }
    if (job.status === 'failed') {
      throw new AnalyzeJobFailedError(job.error || 'Background analysis failed', jobId);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new AnalyzeJobTimeoutError(
    'Analysis timed out — try again or use Retry analysis',
    jobId
  );
}

/** Re-queue a failed/stale job and poll until complete. */
export async function retryAndPollAnalyzeJob(jobId, pollOptions) {
  await careerTrajectoryApi.retryAnalyzeJob(jobId);
  return pollAnalyzeJob(jobId, pollOptions);
}
