import { useCallback, useEffect, useMemo, useState } from 'react';
import { dashboardApi } from '../lib/api';

const STORAGE_KEY = 'hiring-dashboard-dismissed-alerts';

function readLocalDismissed() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocalDismissed(ids) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore quota errors */
  }
}

export function useHiringAlertDismissals() {
  const [dismissed, setDismissed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await dashboardApi.getHiringAlertDismissals();
        const serverIds = res.data?.dismissed || [];
        if (!cancelled) {
          setDismissed(serverIds);
          writeLocalDismissed(serverIds);
        }
      } catch {
        if (!cancelled) {
          setDismissed(readLocalDismissed());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback(async (alertId) => {
    if (!alertId) return;
    setDismissed((prev) => {
      const next = [...new Set([...prev, alertId])];
      writeLocalDismissed(next);
      return next;
    });
    try {
      await dashboardApi.dismissHiringAlert(alertId);
    } catch {
      /* keep optimistic + local fallback */
    }
  }, []);

  const filterAlerts = useCallback(
    (alerts = []) => alerts.filter((a) => a?.id && !dismissed.includes(a.id)),
    [dismissed]
  );

  const visibleAlerts = useMemo(() => filterAlerts, [filterAlerts]);

  return { dismissed, dismiss, loading, filterAlerts, visibleAlerts };
}
