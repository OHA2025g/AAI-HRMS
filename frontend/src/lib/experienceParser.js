/** Parse ATS/Excel mashed experience strings into structured roles (mirrors backend). */

const ROLE_KEYWORDS = [
  'Chief',
  'Vice President',
  'Director',
  'Manager',
  'Architect',
  'Consultant',
  'Associate',
  'Analyst',
  'Engineer',
  'Developer',
  'Executive',
  'Intern',
  'Trainee',
  'Accountant',
  'Specialist',
  'Lead',
  'Officer',
  'Coordinator',
];

const RE_ISO_RANGE = /(\d{4}-\d{2})(?:\s*[-–]\s*(\d{4}-\d{2}|present|current))?/i;
const RE_ISO_MASHED = /(\d{4}-\d{2})(\d{4}-\d{2}|present|current)/i;
const RE_SERIAL_RANGE = /(\d{5,6})(\d{5,6})?(present|current)/i;
const RE_SERIAL_SINGLE = /(\d{5,6})(present|current)/i;

function excelSerialToLabel(serial) {
  try {
    const days = parseInt(serial, 10);
    if (days < 30000 || days > 60000) return null;
    const base = new Date(Date.UTC(1899, 11, 30));
    const dt = new Date(base.getTime() + days * 86400000);
    return dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  } catch {
    return null;
  }
}

function isoToLabel(ym) {
  try {
    const [year, month] = ym.split('-');
    const dt = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    return dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch {
    return ym;
  }
}

export function formatTenure(startDate, endDate) {
  const start = String(startDate || '').trim();
  const end = String(endDate || '').trim();
  if (!start && !end) return '';
  const endL = end.toLowerCase();
  const endLabel = !end || endL === 'present' || endL === 'current' ? 'Present' : end;
  if (start && endLabel) return `${start} – ${endLabel}`;
  return start || endLabel;
}

function insertTitleBoundaries(text) {
  return String(text || '')
    .replace(/(?<=[a-z])(?=[A-Z])/g, ' ')
    .replace(/(?<=[A-Z])(?=[A-Z][a-z])/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitCompanyTitle(prefix) {
  const text = insertTitleBoundaries(String(prefix || '').trim());
  if (!text) return { company: '', title: '' };
  let bestIdx = -1;
  let bestKw = '';
  let bestEnd = 0;
  for (const kw of ROLE_KEYWORDS) {
    const idx = text.toLowerCase().lastIndexOf(kw.toLowerCase());
    if (idx <= 0) continue;
    const end = idx + kw.length;
    if (end > bestEnd) {
      bestIdx = idx;
      bestKw = kw;
      bestEnd = end;
    }
  }
  if (bestIdx > 0) {
    const company = text.slice(0, bestIdx).trim();
    const title = text.slice(bestIdx).trim();
    return { company, title };
  }
  return { company: text, title: '' };
}

function extractDateRange(segment) {
  const patterns = [RE_ISO_RANGE, RE_ISO_MASHED, RE_SERIAL_RANGE, RE_SERIAL_SINGLE];
  for (const pattern of patterns) {
    const m = segment.match(pattern);
    if (!m) continue;
    const startRaw = m[1];
    const endRaw = m[2];
    const present = m[3];
    let startLabel;
    let endLabel;
    if (startRaw.includes('-')) {
      startLabel = isoToLabel(startRaw);
      if (endRaw && !/present|current/i.test(endRaw)) {
        endLabel = isoToLabel(endRaw);
      } else {
        endLabel = 'Present';
      }
    } else {
      startLabel = excelSerialToLabel(startRaw) || startRaw;
      if (endRaw) {
        endLabel = excelSerialToLabel(endRaw) || endRaw;
      } else if (present) {
        endLabel = 'Present';
      } else {
        endLabel = '';
      }
    }
    return {
      dates: { start_date: startLabel, end_date: endLabel },
      start: m.index,
      end: m.index + m[0].length,
    };
  }
  return { dates: null, start: -1, end: -1 };
}

function splitBullets(text) {
  const raw = String(text || '').trim();
  if (!raw) return [];
  const byBullet = raw.split(/\s*•\s*/).map((p) => p.trim()).filter(Boolean);
  if (byBullet.length > 1) return byBullet;
  return raw
    .split(/(?<=[.!?])\s+(?=[A-Z(])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
}

export function parseExperienceSegment(segment) {
  const seg = String(segment || '').trim();
  if (!seg) {
    return { company: '', title: '', start_date: '', end_date: '', description: '', bullets: [] };
  }

  const { dates, start, end } = extractDateRange(seg);
  const prefix = dates ? seg.slice(0, start).trim() : seg;
  const suffix = dates ? seg.slice(end).trim() : '';
  const { company, title } = splitCompanyTitle(prefix);
  const bullets = splitBullets(suffix);
  const description = bullets.length ? bullets.map((b) => `• ${b}`).join('\n') : suffix;

  return {
    company,
    title,
    start_date: dates?.start_date || '',
    end_date: dates?.end_date || '',
    description,
    bullets,
  };
}

export function parseExperienceBlob(raw) {
  const text = String(raw || '').trim().replace(/\|+$/, '');
  if (!text) return [];
  const segments = text.split('|').map((s) => s.trim()).filter(Boolean);
  return (segments.length ? segments : [text]).map(parseExperienceSegment);
}

export function normalizeExperienceList(experience) {
  if (!Array.isArray(experience) || !experience.length) return [];

  const out = [];
  for (const exp of experience) {
    if (!exp || typeof exp !== 'object') continue;
    const company = String(exp.company || '').trim();
    const title = String(exp.title || '').trim();
    const start = String(exp.start_date || '').trim();
    const end = String(exp.end_date || '').trim();
    const desc = String(exp.description || '').trim();

    if (company && title && (start || end || !desc)) {
      const bullets = Array.isArray(exp.bullets) ? exp.bullets : splitBullets(desc);
      out.push({ ...exp, company, title, bullets });
      continue;
    }

    if (desc && (desc.includes('|') || /\d{4}-\d{2}|\d{5,6}/.test(desc))) {
      out.push(...parseExperienceBlob(desc));
      continue;
    }

    if (desc) {
      out.push(parseExperienceSegment(desc));
    } else if (company || title) {
      out.push({
        company,
        title,
        start_date: start,
        end_date: end,
        description: desc,
        bullets: splitBullets(desc),
      });
    }
  }
  return out;
}
