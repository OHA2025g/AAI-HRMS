/** Keep insight CTA buttons compact (2–3 words). */
export function shortenInsightActionLabel(label, maxWords = 3) {
  const text = String(label || 'View Details').trim().replace(/\s+/g, ' ');
  if (!text) return 'View Details';
  const words = text.split(' ');
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ');
}
