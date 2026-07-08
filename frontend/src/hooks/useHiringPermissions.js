import { useMemo } from 'react';

const PRIVILEGED = new Set(['admin', 'hr_admin', 'recruiter']);
const STAKEHOLDER = new Set(['hiring_manager', 'technical_manager', 'project_manager']);

/**
 * Client-side capability flags (mirror backend hiring_rbac; API remains source of truth).
 */
export function useHiringPermissions(user) {
  return useMemo(() => {
    const role = String(user?.role || '').toLowerCase();
    const privileged = PRIVILEGED.has(role);
    const stakeholder = STAKEHOLDER.has(role);

    return {
      role,
      isPrivileged: privileged,
      isStakeholder: stakeholder,
      canBulkImport: privileged,
      canManageIntegrations: role === 'admin' || role === 'hr_admin',
      canCreateJob: privileged || role === 'hiring_manager' || role === 'project_manager',
      canEditJobTeam: privileged || role === 'hiring_manager',
      canEditJobTechnical: privileged || role === 'hiring_manager' || role === 'technical_manager',
      canAdvancePipeline: privileged || role === 'hiring_manager' || role === 'technical_manager',
      canMoveToOffer: privileged || role === 'hiring_manager',
      canRequestOfferApproval: role === 'technical_manager',
      canApproveOfferStageProposal: privileged || role === 'hiring_manager',
      canGenerateAssessment: privileged || role === 'hiring_manager' || role === 'technical_manager',
      canPublishAssessment: privileged || role === 'hiring_manager' || role === 'technical_manager',
      canGradeAssessment: privileged || role === 'hiring_manager' || role === 'technical_manager',
      canScheduleInterview: privileged || role === 'hiring_manager' || role === 'technical_manager',
      canApproveInterviewProposal: privileged || role === 'hiring_manager',
      canCreateGlobalCandidate: privileged,
      canReferCandidate:
        privileged || role === 'hiring_manager' || role === 'project_manager' || role === 'technical_manager',
      pipelineReadOnly: role === 'project_manager' || role === 'hr_viewer',
    };
  }, [user]);
}
