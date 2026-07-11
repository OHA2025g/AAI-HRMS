import { useEffect, useMemo, useState } from 'react';
import { careerTrajectoryApi } from '@/shared/lib/api';

/**
 * Batch-load latest career trajectory summaries for candidate cards (pipeline, list, job).
 */
export function useCareerTrajectorySummaries(candidateIds) {
  const key = useMemo(
    () => [...new Set((candidateIds || []).filter(Boolean))].sort().join(','),
    [candidateIds]
  );
  const [summaries, setSummaries] = useState({});
  const [loading, setLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = () => setReloadToken((t) => t + 1);

  useEffect(() => {
    const ids = key ? key.split(',') : [];
    if (!ids.length) {
      setSummaries({});
      return;
    }
    let cancelled = false;
    setLoading(true);
    careerTrajectoryApi
      .getSummaries(ids)
      .then((res) => {
        if (!cancelled) setSummaries(res.data?.summaries || {});
      })
      .catch(() => {
        if (!cancelled) setSummaries({});
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key, reloadToken]);

  return { summaries, loading, reload };
}
