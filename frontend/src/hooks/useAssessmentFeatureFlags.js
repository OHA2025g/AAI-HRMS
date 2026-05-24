import { useEffect, useState } from 'react';
import { assessmentsApi } from '../lib/api';

const DEFAULT_FLAGS = {
  command_center: true,
  public_take: true,
  ai_grading: true,
  auto_clear_pipeline: true,
  reminder_emails: true,
  outcome_analytics: true,
  coverage_heatmap: true,
  email_delivery_ready: false,
};

export function useAssessmentFeatureFlags() {
  const [flags, setFlags] = useState(DEFAULT_FLAGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    assessmentsApi
      .config()
      .then((res) => {
        if (!cancelled && res.data) setFlags({ ...DEFAULT_FLAGS, ...res.data });
      })
      .catch(() => {
        if (!cancelled) setFlags(DEFAULT_FLAGS);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { flags, loading, isEnabled: (key) => Boolean(flags[key]) };
}
