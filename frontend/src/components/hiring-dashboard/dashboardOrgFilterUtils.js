/** Sentinel for native <select> "All" option (empty string is ambiguous in some browsers). */
export const ORG_FILTER_ALL = '__ALL__';

export function normalizeOrgFilterValue(value) {
  const trimmed = String(value ?? '').trim();
  return trimmed === ORG_FILTER_ALL ? '' : trimmed;
}

/** Keep the current URL selection visible even before filterOptions reload. */
export function withSelectedOrgOption(list, selected) {
  const normalized = normalizeOrgFilterValue(selected);
  const items = (list || []).map((item) => String(item).trim()).filter(Boolean);
  if (normalized && !items.includes(normalized)) {
    return [normalized, ...items];
  }
  return items;
}

export function orgFilterSelectValue(selected) {
  return normalizeOrgFilterValue(selected) || ORG_FILTER_ALL;
}

export function orgFilterChangeValue(raw) {
  return normalizeOrgFilterValue(raw);
}
