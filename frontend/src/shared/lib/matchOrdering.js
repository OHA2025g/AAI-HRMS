import {
  isAiGeneratedCandidate,
  isExcelImportedCandidate,
  isInhouseDatabaseCandidate,
  isRealLinkedInCandidate,
  isTalentPoolOnlyCandidate,
} from './candidateSource';

export const AI_HIGH_MATCH_MIN_SCORE = 90;
export const DEFAULT_MATCH_LIMIT = 50;

export function getMatchFinalScore(match) {
  const v = match?.fit_score?.final_score;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

export function isAiGeneratedHighMatch(match, minScore = AI_HIGH_MATCH_MIN_SCORE, jobId = null) {
  const c = match?.candidate;
  if (!isAiGeneratedCandidate(c)) return false;
  if (getMatchFinalScore(match) >= minScore) return true;
  if (jobId && c?.seed_job_id && String(c.seed_job_id) === String(jobId)) return true;
  return false;
}

function partitionMatches(matches, minAiScore = AI_HIGH_MATCH_MIN_SCORE, jobId = null) {
  const excel = [];
  const talentPool = [];
  const aiHigh = [];
  const other = [];

  for (const row of matches || []) {
    const c = row?.candidate;
    const score = getMatchFinalScore(row);
    if (isExcelImportedCandidate(c)) {
      excel.push(row);
    } else if (isAiGeneratedHighMatch(row, minAiScore, jobId)) {
      aiHigh.push(row);
    } else if (isTalentPoolOnlyCandidate(c)) {
      talentPool.push(row);
    } else {
      other.push(row);
    }
  }

  const byScore = (a, b) => getMatchFinalScore(b) - getMatchFinalScore(a);
  excel.sort(byScore);
  talentPool.sort(byScore);
  aiHigh.sort(byScore);
  return { excel, talentPool, aiHigh, other };
}

/**
 * 3-column grid order: Excel | Talent pool | AI-generated (>90% fit), repeated for all matches.
 */
export function orderJobMatchesForGrid(
  matches,
  { totalLimit = DEFAULT_MATCH_LIMIT, minAiScore = AI_HIGH_MATCH_MIN_SCORE, jobId = null } = {}
) {
  if (!Array.isArray(matches) || matches.length === 0) return [];

  const { excel, talentPool, aiHigh, other } = partitionMatches(matches, minAiScore, jobId);
  const pools = [excel, talentPool, aiHigh];
  const indices = [0, 0, 0];
  const ordered = [];
  let pos = 0;

  while (ordered.length < totalLimit) {
    const slot = pos % 3;
    let placed = false;
    for (let offset = 0; offset < 3; offset += 1) {
      const bucket = (slot + offset) % 3;
      const pool = pools[bucket];
      const idx = indices[bucket];
      if (idx < pool.length) {
        ordered.push(pool[idx]);
        indices[bucket] = idx + 1;
        placed = true;
        break;
      }
    }
    if (!placed) {
      if (other.length > 0) {
        ordered.push(other.shift());
        placed = true;
      } else {
        break;
      }
    }
    pos += 1;
  }

  return ordered;
}

/**
 * LinkedIn search flow: real LinkedIn profiles first, then inhouse talent database, then others.
 * Each group sorted by fit score (desc).
 */
export function orderJobMatchesLinkedInFirst(
  matches,
  { totalLimit = DEFAULT_MATCH_LIMIT } = {}
) {
  if (!Array.isArray(matches) || matches.length === 0) return [];

  const linkedin = [];
  const inhouse = [];
  const other = [];
  const byScore = (a, b) => getMatchFinalScore(b) - getMatchFinalScore(a);

  for (const row of matches) {
    const c = row?.candidate;
    if (isRealLinkedInCandidate(c)) {
      linkedin.push(row);
    } else if (isInhouseDatabaseCandidate(c)) {
      inhouse.push(row);
    } else {
      other.push(row);
    }
  }

  linkedin.sort(byScore);
  inhouse.sort(byScore);
  other.sort(byScore);

  return [...linkedin, ...inhouse, ...other].slice(0, totalLimit);
}
