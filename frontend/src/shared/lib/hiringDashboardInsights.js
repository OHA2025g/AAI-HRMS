import { shortenInsightActionLabel } from './insightActionLabel';

const SEVERITY_MAP = { critical: 'red', warning: 'orange', info: 'blue' };

export function alertToInsight(alert) {
  const sev = alert?.severity || 'info';
  return {
    severity: SEVERITY_MAP[sev] || 'blue',
    title: String(alert?.title || ''),
    message: String(alert?.message || ''),
    action_label: shortenInsightActionLabel(sev === 'critical' ? 'Take Action' : 'View Details'),
    action_path: alert?.action_path,
  };
}

/** Full insight list for the dashboard modal (alerts + monitoring tip). */
export function buildAllAiInsightsFromPack(pack, { limit = 12 } = {}) {
  const alerts = pack?.alerts || [];
  if (alerts.length) {
    const out = alerts.map(alertToInsight);
    const hasMonitoring = out.some((item) => item.title === 'Continue monitoring hiring health');
    if (!hasMonitoring) {
      out.push({
        severity: 'green',
        title: 'Continue monitoring hiring health',
        message: 'Review trends weekly to catch regressions early.',
        action_label: 'View Trend',
        action_path: '/dashboard?tab=analytics',
      });
    }
    return out.slice(0, limit);
  }
  return pack?.ai_insights || [];
}
