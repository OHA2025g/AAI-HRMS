export const CONNECTOR_KEYS = ['COMPANY_DB_CANDIDATES', 'LINKEDIN', 'NAUKRI', 'MONSTER'];

export const CONNECTOR_META = {
  COMPANY_DB_CANDIDATES: {
    title: 'COMPANY_DB_CANDIDATES',
    queueLabel: 'Last sync',
  },
  LINKEDIN: {
    title: 'LINKEDIN',
    queueLabel: 'Pending queue',
  },
  NAUKRI: {
    title: 'NAUKRI',
    queueLabel: 'Scopes',
  },
  MONSTER: {
    title: 'MONSTER',
    queueLabel: 'Retries',
  },
};

export function parseScopesToString(scopes) {
  if (!scopes) return '';
  if (Array.isArray(scopes)) return scopes.join(', ');
  if (typeof scopes === 'string') return scopes;
  return '';
}

export function numOrUndef(v) {
  if (v === '' || v === undefined || v === null) return undefined;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : undefined;
}

export function connectorStatus(connectorKey, healthEntry, configEntry, linkedInStatus) {
  const enabled = !!configEntry?.enabled;
  if (!enabled) {
    if (connectorKey === 'LINKEDIN' && linkedInStatus && !linkedInStatus.configured) {
      return { label: 'Action needed', tone: 'warn' };
    }
    return { label: 'Disabled', tone: 'off' };
  }
  if (healthEntry?.health_ok === true) return { label: 'Healthy', tone: 'ok' };
  if (healthEntry?.health_ok === false) return { label: 'Action needed', tone: 'warn' };
  return { label: 'Enabled', tone: 'ok' };
}

export function connectorMetaLine(connectorKey, healthEntry, configEntry, linkedInStatus) {
  const enabled = configEntry?.enabled ? 'yes' : 'no';
  const healthy =
    healthEntry?.health_ok == null ? '—' : healthEntry.health_ok ? 'yes' : 'no';

  if (connectorKey === 'LINKEDIN') {
    return {
      line1: `Enabled: ${enabled}`,
      line2: `Healthy: ${healthy}`,
      line3: `Pending queue: ${linkedInStatus?.pending_export_count ?? 0}`,
    };
  }
  if (connectorKey === 'NAUKRI') {
    const scopes = parseScopesToString(configEntry?.scopes);
    return {
      line1: `Enabled: ${enabled}`,
      line2: `Healthy: ${healthy}`,
      line3: `Scopes: ${scopes ? 'set' : 'missing'}`,
    };
  }
  if (connectorKey === 'MONSTER') {
    const retries = configEntry?.max_retries ?? 'not set';
    return {
      line1: `Enabled: ${enabled}`,
      line2: `Healthy: ${healthy}`,
      line3: `Retries: ${retries}`,
    };
  }
  return {
    line1: `Enabled: ${enabled}`,
    line2: `Healthy: ${healthy}`,
    line3: `Last sync: ${healthEntry?.health_detail || '—'}`,
  };
}

export function computeReadiness(configs, health, linkedInStatus) {
  const enabledCount = CONNECTOR_KEYS.filter((k) => configs?.[k]?.enabled).length;
  let secretsMissing = 0;

  if (configs?.LINKEDIN?.enabled && !(configs.LINKEDIN.client_id && (configs.LINKEDIN.client_secret || configs.LINKEDIN.client_secret_set))) {
    secretsMissing += 1;
  }
  if (configs?.NAUKRI?.enabled && !(configs.NAUKRI.client_id && configs.NAUKRI.client_secret)) {
    secretsMissing += 1;
  }
  if (configs?.MONSTER?.enabled && !(configs.MONSTER.client_id && configs.MONSTER.client_secret)) {
    secretsMissing += 1;
  }
  if (!configs?.COMPANY_DB_CANDIDATES?.enabled && !configs?.LINKEDIN?.client_id) {
    secretsMissing = Math.max(secretsMissing, 3);
  } else {
    if (!configs?.LINKEDIN?.client_id && !configs?.LINKEDIN?.client_secret_set) secretsMissing += 1;
    if (!configs?.NAUKRI?.client_id) secretsMissing += 1;
    if (!configs?.MONSTER?.client_id) secretsMissing += 1;
  }

  const pendingExports = linkedInStatus?.pending_export_count ?? 0;
  const webhookStatus =
    linkedInStatus?.webhook_url && configs?.LINKEDIN?.client_secret_set ? 'Live' : 'Draft';

  return {
    enabledCount,
    totalConnectors: CONNECTOR_KEYS.length,
    pendingExports,
    secretsMissing: Math.min(4, Math.max(0, secretsMissing)),
    webhookStatus,
  };
}

export function enabledStatusLabel(enabled) {
  if (enabled) return { label: 'Enabled', tone: 'ok' };
  return { label: 'Not enabled', tone: 'off' };
}
