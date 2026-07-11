/**
 * Candidate list helpers — dedupe Excel import duplicates and human-readable labels.
 * Duplicate rows often share an email but have full_name set to a row number ("1", "2").
 */

import { isSyntheticDemoCandidate } from './candidateSource';

function candidateQualityScore(c) {
  let score = 0;
  const name = (c?.full_name || '').trim();
  const id = String(c?.id || '');
  if (name && !/^\d+$/.test(name)) score += 1000 + Math.min(name.length, 100);
  if (!/^\d+$/.test(id)) score += 100;
  if (c?.email) score += 10;
  if (Array.isArray(c?.skills) && c.skills.length) score += 5;
  return score;
}

/** Display name for cards, dropdowns, and headers. */
export function candidateDisplayName(candidate) {
  const name = (candidate?.full_name || '').trim();
  if (name && !/^\d+$/.test(name)) return name;
  const email = (candidate?.email || '').trim();
  if (email) {
    const local = email.split('@')[0] || '';
    const pretty = local.replace(/[._+-]+/g, ' ').trim();
    if (pretty && !/^\d+$/.test(pretty)) {
      return pretty.replace(/\b\w/g, (ch) => ch.toUpperCase());
    }
  }
  return (candidate?.headline || '').trim() || 'Unnamed Candidate';
}

/**
 * Prefer the record with a real name when multiple candidates share the same email.
 */
export function dedupeCandidatesForDisplay(candidates) {
  if (!Array.isArray(candidates)) return [];

  const byEmail = new Map();
  const withoutEmail = [];

  for (const c of candidates) {
    if (!c?.id) continue;
    const email = (c.email || '').trim().toLowerCase();
    if (email) {
      const prev = byEmail.get(email);
      if (!prev || candidateQualityScore(c) > candidateQualityScore(prev)) {
        byEmail.set(email, c);
      }
      continue;
    }

    const name = (c.full_name || '').trim();
    const id = String(c.id);
    if (/^\d+$/.test(name) && /^\d+$/.test(id)) continue;

    withoutEmail.push(c);
  }

  const byId = new Map();
  for (const c of withoutEmail) {
    const prev = byId.get(c.id);
    if (!prev || candidateQualityScore(c) > candidateQualityScore(prev)) {
      byId.set(c.id, c);
    }
  }

  return [...byEmail.values(), ...byId.values()];
}

/**
 * Dropdown dedupe: after email dedupe, keep one row per real display name.
 * Handles bulk/import rows that share a name but have different emails.
 */
export function dedupeCandidatesByDisplayName(candidates) {
  const emailDeduped = dedupeCandidatesForDisplay(candidates);
  const byName = new Map();
  const withoutRealName = [];

  for (const c of emailDeduped) {
    const name = (c?.full_name || '').trim();
    if (!name || /^\d+$/.test(name)) {
      withoutRealName.push(c);
      continue;
    }
    const key = name.toLowerCase();
    const prev = byName.get(key);
    if (!prev || candidateQualityScore(c) > candidateQualityScore(prev)) {
      byName.set(key, c);
    }
  }

  return [...byName.values(), ...withoutRealName];
}

/**
 * Trajectory / analyze dropdowns: exclude synthetic demo rows and dedupe by name.
 */
export function dedupeCandidatesForSelect(candidates) {
  return dedupeCandidatesByDisplayName(
    (candidates || []).filter((c) => !isSyntheticDemoCandidate(c))
  );
}
