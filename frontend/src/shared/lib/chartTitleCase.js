const SMALL_WORDS = new Set([
  'a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'vs', 'in', 'of', 'with',
]);

function capitalizeWord(word) {
  if (!word) return word;
  if (/^\d/.test(word)) {
    return word.replace(/([a-z]+)/gi, (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());
  }
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Title Case for chart/graph headings (matches Overview tab style).
 */
export function chartTitleCase(text) {
  if (text == null || typeof text !== 'string') return text;
  const trimmed = text.trim().replace(/\bageing\b/gi, 'aging');
  if (!trimmed) return text;

  const tokens = trimmed.split(/(\s+|→|&)/);
  const wordTokens = tokens.filter((t) => t.trim() && !/^[\s→&]+$/.test(t));
  const lastWordIndex = tokens.reduce(
    (last, token, index) => (token.trim() && !/^[\s→&]+$/.test(token) ? index : last),
    -1,
  );

  return tokens
    .map((token, index) => {
      if (!token.trim() || /^[\s→&]+$/.test(token)) return token;
      const lower = token.toLowerCase();
      const isEdge = index === 0 || index === lastWordIndex;
      if (!isEdge && SMALL_WORDS.has(lower)) return lower;
      if (token.includes('-')) {
        return token.split('-').map(capitalizeWord).join('-');
      }
      return capitalizeWord(token);
    })
    .join('');
}
