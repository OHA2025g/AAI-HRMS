import { useMemo } from 'react';

/**
 * Maps JWT user.role to ESE capabilities (mirrors backend PHASE1 engagement_* permissions).
 */
export function useEngagementPermissions(user) {
  return useMemo(() => {
    const role = String(user?.role || '').toLowerCase();
    const isAdmin = role === 'admin';
    const isHrAdmin = role === 'hr_admin';
    const isHrViewer = role === 'hr_viewer';
    const isRecruiter = role === 'recruiter';

    return {
      canRead: isAdmin || isHrAdmin || isHrViewer || isRecruiter,
      canWrite: isAdmin || isHrAdmin,
      canAnalytics: isAdmin || isHrAdmin || isHrViewer,
      canExecutive: isAdmin || isHrAdmin,
      canAi: isAdmin || isHrAdmin,
      canPrivacyRaw: isAdmin || isHrAdmin,
    };
  }, [user]);
}
