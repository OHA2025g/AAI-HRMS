import axios from 'axios';
import { API_BASE_URL as API_URL } from './apiBaseUrl';

// Jobs API
export const jobsApi = {
  list: (status) => axios.get(`${API_URL}/jobs`, { params: { status } }),
  get: (id) => axios.get(`${API_URL}/jobs/${id}`),
  create: (data) => axios.post(`${API_URL}/jobs`, data),
  update: (id, data) => axios.put(`${API_URL}/jobs/${id}`, data),
  delete: (id) => axios.delete(`${API_URL}/jobs/${id}`),
  match: (id) => axios.post(`${API_URL}/match/${id}`),
  generateDemoCandidates: (id, count = 50) => axios.post(`${API_URL}/jobs/${id}/demo-candidates`, { count })
};

// Candidates API
export const candidatesApi = {
  list: (params) => axios.get(`${API_URL}/candidates`, { params }),
  get: (id) => axios.get(`${API_URL}/candidates/${id}`),
  getProfile: (id) => axios.get(`${API_URL}/candidates/${id}/profile`),
  create: (data) => axios.post(`${API_URL}/candidates`, data),
  update: (id, data) => axios.put(`${API_URL}/candidates/${id}`, data),
  uploadResume: (formData) => axios.post(`${API_URL}/candidates/upload-resume`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

// Applications API
export const applicationsApi = {
  list: (params) => axios.get(`${API_URL}/applications`, { params }),
  create: (data) => axios.post(`${API_URL}/applications`, data),
  updateStage: (id, data) => axios.put(`${API_URL}/applications/${id}/stage`, data),
  getPipeline: (jobId) => axios.get(`${API_URL}/pipeline/${jobId}`)
};

// Referrals API
export const referralsApi = {
  list: () => axios.get(`${API_URL}/referrals`),
  listAll: () => axios.get(`${API_URL}/referrals/all`),
  create: (data) => axios.post(`${API_URL}/referrals`, data),
  createWithResume: (formData) =>
    axios.post(`${API_URL}/referrals/with-resume`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// Assessments API
export const assessmentsApi = {
  list: (jobId) => axios.get(`${API_URL}/assessments`, { params: { job_id: jobId } }),
  get: (id) => axios.get(`${API_URL}/assessments/${id}`),
  generate: (jobId, data) => axios.post(`${API_URL}/assessments/generate/${jobId}`, data)
};

// Dashboard API
export const dashboardApi = {
  getStats: () => axios.get(`${API_URL}/dashboard/stats`)
};

// Fit Scores API
export const fitScoresApi = {
  get: (jobId, candidateId) => axios.get(`${API_URL}/fit-scores/${jobId}/${candidateId}`)
};

// Admin API (connector configs)
export const adminApi = {
  getConnectorConfigs: () => axios.get(`${API_URL}/admin/connector-configs`),
  updateConnectorConfig: (name, data) => axios.put(`${API_URL}/admin/connector-configs/${name}`, data),
  getConnectorsHealth: () => axios.get(`${API_URL}/admin/connectors/health`),
  dispatchInterviewReminders: () => axios.post(`${API_URL}/admin/interviews/dispatch-reminders`),
  escalateLifecycleApprovals: () => axios.post(`${API_URL}/admin/employee-lifecycle/escalate-approvals`),
  scanComplianceSla: () => axios.post(`${API_URL}/admin/compliance/scan-sla-breaches`),
  dispatchComplianceReminders: () => axios.post(`${API_URL}/admin/compliance/dispatch-document-reminders`),
  listUsers: (params = {}) => axios.get(`${API_URL}/admin/users`, { params }),
  updateUserRole: (userId, data) => axios.put(`${API_URL}/admin/users/${encodeURIComponent(userId)}/role`, data),
};

// Interviews API
export const interviewsApi = {
  list: (params) => axios.get(`${API_URL}/interviews`, { params }),
  get: (id) => axios.get(`${API_URL}/interviews/${id}`),
  create: (data) => axios.post(`${API_URL}/interviews`, data),
  update: (id, data) => axios.put(`${API_URL}/interviews/${id}`, data),
  addFeedback: (id, data) => axios.post(`${API_URL}/interviews/${id}/feedback`, data),
  cancel: (id) => axios.delete(`${API_URL}/interviews/${id}`),
  getUpcoming: () => axios.get(`${API_URL}/interviews/upcoming/me`)
};

// Interview Proposals (HR Approval Scheduling) - M1
export const interviewProposalsApi = {
  listByJob: (jobId) => axios.get(`${API_URL}/jobs/${jobId}/interview-proposals`),
  approve: (proposalId, payload) =>
    axios.post(`${API_URL}/interview-proposals/${encodeURIComponent(proposalId)}/approve`, payload),
  reject: (proposalId, payload) =>
    axios.post(`${API_URL}/interview-proposals/${encodeURIComponent(proposalId)}/reject`, payload),
};

// Notifications API
export const notificationsApi = {
  list: (unreadOnly = false) => axios.get(`${API_URL}/notifications`, { params: { unread_only: unreadOnly } }),
  markRead: (id) => axios.put(`${API_URL}/notifications/${id}/read`),
  markAllRead: () => axios.put(`${API_URL}/notifications/read-all`),
  getUnreadCount: () => axios.get(`${API_URL}/notifications/unread-count`)
};

// Transformation API (BRD + SRS roadmap)
export const transformationApi = {
  getModules: () => axios.get(`${API_URL}/transformation/modules`),
};

// Employee Master API
export const employeeApi = {
  list: (params) => axios.get(`${API_URL}/employees`, { params }),
  get: (id) => axios.get(`${API_URL}/employees/${encodeURIComponent(id)}`),
  create: (data) => axios.post(`${API_URL}/employees`, data),
  update: (id, data) => axios.put(`${API_URL}/employees/${id}`, data),
  remove: (id) => axios.delete(`${API_URL}/employees/${id}`),
  listPaged: (params) => axios.get(`${API_URL}/employees/paged`, { params }),
  bulkImport: (payload) => axios.post(`${API_URL}/employees/bulk-import`, payload),
  directReports: (id) => axios.get(`${API_URL}/employees/${encodeURIComponent(id)}/direct-reports`),
  managementChain: (id) => axios.get(`${API_URL}/employees/${encodeURIComponent(id)}/management-chain`),
  orgHierarchy: (params = {}) => axios.get(`${API_URL}/org/hierarchy`, { params }),
};

// Workforce Skill Inventory API
export const workforceApi = {
  listSkills: () => axios.get(`${API_URL}/workforce/skills`),
  createSkill: (data) => axios.post(`${API_URL}/workforce/skills`, data),
  updateSkill: (skillName, data) => axios.put(`${API_URL}/workforce/skills/${encodeURIComponent(skillName)}`, data),
  deleteSkill: (skillName) => axios.delete(`${API_URL}/workforce/skills/${encodeURIComponent(skillName)}`),
  listSkillsPaged: (params) => axios.get(`${API_URL}/workforce/skills/paged`, { params }),
  bulkImport: (payload) => axios.post(`${API_URL}/workforce/skills/bulk-import`, payload),
};

// Executive KPI API
export const executiveApi = {
  getKpis: () => axios.get(`${API_URL}/executive/kpis`),
  getStrategicDashboard: (horizonMonths = 3, windowDays = 30) =>
    axios.get(`${API_URL}/executive/strategic-dashboard`, {
      params: { horizon_months: horizonMonths, window_days: windowDays },
    }),
  getCostOptimizationSummary: (windowDays = 30) =>
    axios.get(`${API_URL}/executive/cost-optimization-summary`, { params: { window_days: windowDays } }),
  /** M9 drill-down + linked window (returns { filters, dashboard, cache, scope_employee_count }). */
  getStrategicDrill: (params = {}) => axios.get(`${API_URL}/executive/m9/strategic-drill`, { params }),
  getM9DrillOptions: () => axios.get(`${API_URL}/executive/m9/drill-options`),
  getM9Freshness: () => axios.get(`${API_URL}/executive/m9/freshness`),
  getM9KpiDefinitions: () => axios.get(`${API_URL}/executive/m9/kpi-definitions`),
  getM9KpiPack: (horizonMonths = 3, windowDays = 30) =>
    axios.get(`${API_URL}/executive/m9/kpi-pack`, { params: { horizon_months: horizonMonths, window_days: windowDays } }),
  createM9MonthlySnapshot: (payload) =>
    axios.post(`${API_URL}/executive/m9/export-packs/monthly-snapshot`, payload),
  /** Week 11: persisted snapshot + JSON/CSV/PDF in one ZIP */
  downloadM9FullLeadershipPack: (payload) =>
    axios.post(`${API_URL}/executive/m9/export-packs/full-leadership-pack`, payload, { responseType: 'blob' }),
  listM9ExportPacks: (limit = 24) =>
    axios.get(`${API_URL}/executive/m9/export-packs`, { params: { limit } }),
  downloadM9ExportPack: (snapshotId, format = 'csv') =>
    axios.get(`${API_URL}/executive/m9/export-packs/${encodeURIComponent(snapshotId)}/download`, {
      params: { format },
      responseType: 'blob',
    }),
  deliverM9ExportPack: (snapshotId, webhookUrl) =>
    axios.post(`${API_URL}/executive/m9/export-packs/${encodeURIComponent(snapshotId)}/deliver`, {}, {
      params: webhookUrl ? { webhook_url: webhookUrl } : {},
    }),
};

// M7: workflow automation (admin)
export const workflowAutomationAdminApi = {
  listRules: () => axios.get(`${API_URL}/admin/workflow-automation/rules`),
  createRule: (payload) => axios.post(`${API_URL}/admin/workflow-automation/rules`, payload),
  updateRule: (ruleId, payload) =>
    axios.put(`${API_URL}/admin/workflow-automation/rules/${encodeURIComponent(ruleId)}`, payload),
  deleteRule: (ruleId) => axios.delete(`${API_URL}/admin/workflow-automation/rules/${encodeURIComponent(ruleId)}`),
  executeRule: (ruleId) => axios.post(`${API_URL}/admin/workflow-automation/rules/${encodeURIComponent(ruleId)}/execute`, {}),
  listRuns: (params = {}) => axios.get(`${API_URL}/admin/workflow-automation/runs`, { params }),
  dispatchTriggered: () => axios.post(`${API_URL}/admin/workflow-automation/dispatch-triggered`, {}),
  listBaselines: () => axios.get(`${API_URL}/admin/cost-optimization/baselines`),
  createBaseline: (payload) => axios.post(`${API_URL}/admin/cost-optimization/baselines`, payload),
  updateBaseline: (baselineId, payload) =>
    axios.put(`${API_URL}/admin/cost-optimization/baselines/${encodeURIComponent(baselineId)}`, payload),
  deleteBaseline: (baselineId) =>
    axios.delete(`${API_URL}/admin/cost-optimization/baselines/${encodeURIComponent(baselineId)}`),
  listCopilotAudit: (params = {}) => axios.get(`${API_URL}/admin/hr-copilot/audit`, { params }),
};

// M7: HR copilot (kpi_read)
export const hrCopilotApi = {
  chat: (payload) => axios.post(`${API_URL}/hr-copilot/chat`, payload),
};

// Workforce Intelligence API (Phase-3 M3)
export const workforceIntelligenceApi = {
  getForecast: (horizonMonths = 1, refresh = false) =>
    axios.get(`${API_URL}/workforce/intelligence`, {
      params: { horizon_months: horizonMonths, refresh: !!refresh },
    }),
  /** M3-2: baseline model forecast (requires trained + active model on server). */
  getModelForecast: (horizonMonths = 1) =>
    axios.get(`${API_URL}/workforce/intelligence/model-forecast`, {
      params: { horizon_months: horizonMonths },
    }),
};

// Resource Optimization API (Phase-3 M4)
export const resourceOptimizationApi = {
  getMetrics: (refresh = false) =>
    axios.get(`${API_URL}/workforce/resource-optimization`, {
      params: { refresh: !!refresh },
    }),
  getSettings: () => axios.get(`${API_URL}/workforce/resource-optimization/settings`),
  updateSettings: (payload) => axios.put(`${API_URL}/workforce/resource-optimization/settings`, payload),
  solve: () => axios.post(`${API_URL}/workforce/resource-optimization/solve`),
  simulate: (payload) =>
    axios.post(`${API_URL}/workforce/resource-optimization/simulate`, payload || {}),
  listScenarios: (limit = 30) =>
    axios.get(`${API_URL}/workforce/resource-optimization/scenarios`, { params: { limit } }),
  getScenario: (scenarioId) =>
    axios.get(`${API_URL}/workforce/resource-optimization/scenarios/${encodeURIComponent(scenarioId)}`),
  compareScenarios: (scenarioAId, scenarioBId) =>
    axios.get(`${API_URL}/workforce/resource-optimization/scenarios/compare`, {
      params: { scenario_a_id: scenarioAId, scenario_b_id: scenarioBId },
    }),
  createScenario: (payload) => axios.post(`${API_URL}/workforce/resource-optimization/scenarios`, payload),
  submitScenario: (scenarioId) =>
    axios.post(`${API_URL}/workforce/resource-optimization/scenarios/${encodeURIComponent(scenarioId)}/submit`),
  approveScenario: (scenarioId) =>
    axios.post(`${API_URL}/workforce/resource-optimization/scenarios/${encodeURIComponent(scenarioId)}/approve`),
  rejectScenario: (scenarioId, reason) =>
    axios.post(
      `${API_URL}/workforce/resource-optimization/scenarios/${encodeURIComponent(scenarioId)}/reject`,
      { reason: reason || '' },
    ),
  applyScenario: (scenarioId, dryRun = false) =>
    axios.post(
      `${API_URL}/workforce/resource-optimization/scenarios/${encodeURIComponent(scenarioId)}/apply`,
      { dry_run: !!dryRun },
    ),
};

// Projects + Project Skill Demands (Phase-3 M4 extension)
export const projectsApi = {
  create: (payload) => axios.post(`${API_URL}/projects`, payload),
  list: (status) =>
    axios.get(`${API_URL}/projects`, { params: { status } }),
  update: (projectId, payload) =>
    axios.put(`${API_URL}/projects/${encodeURIComponent(projectId)}`, payload),
  remove: (projectId) =>
    axios.delete(`${API_URL}/projects/${encodeURIComponent(projectId)}`),
  upsertSkillDemands: (projectId, payload) =>
    axios.post(`${API_URL}/projects/${encodeURIComponent(projectId)}/skill-demands/bulk`, payload),
  bulkImportSkillDemands: (projectId, payload) =>
    axios.post(`${API_URL}/projects/${encodeURIComponent(projectId)}/skill-demands/bulk-import`, payload),
  listSkillDemands: (projectId) =>
    axios.get(`${API_URL}/projects/${encodeURIComponent(projectId)}/skill-demands`),
  bulkImportSkillAllocations: (projectId, payload) =>
    axios.post(`${API_URL}/projects/${encodeURIComponent(projectId)}/skill-allocations/bulk-import`, payload),
  listSkillAllocations: (projectId) =>
    axios.get(`${API_URL}/projects/${encodeURIComponent(projectId)}/skill-allocations`),
};

// Training & Skill Development API (Phase-3 M5)
export const trainingRecommendationsApi = {
  getRecommendations: (params = {}) =>
    axios.get(`${API_URL}/workforce/training-recommendations`, { params }),
  listPathTemplates: () => axios.get(`${API_URL}/workforce/training/learning-path-templates`),
  upsertPathTemplate: (payload) => axios.put(`${API_URL}/workforce/training/learning-path-templates`, payload),
  listAssignments: (params = {}) => axios.get(`${API_URL}/workforce/training/assignments`, { params }),
  createAssignment: (payload) => axios.post(`${API_URL}/workforce/training/assignments`, payload),
  patchAssignment: (assignmentId, payload) =>
    axios.patch(`${API_URL}/workforce/training/assignments/${encodeURIComponent(assignmentId)}`, payload),
  listCatalog: (params = {}) => axios.get(`${API_URL}/workforce/training/catalog`, { params }),
  listCertifications: (params = {}) => axios.get(`${API_URL}/workforce/training/certifications`, { params }),
  createCertification: (payload) => axios.post(`${API_URL}/workforce/training/certifications`, payload),
  getManagerSummary: (managerEmployeeId) =>
    axios.get(`${API_URL}/workforce/training/manager-summary`, {
      params: { manager_employee_id: managerEmployeeId },
    }),
  adminLmsSync: (payload = {}) => axios.post(`${API_URL}/admin/training/lms/sync`, payload),
  adminLmsSyncLast: () => axios.get(`${API_URL}/admin/training/lms/sync/last`),
  adminCertScanExpiry: (daysAhead = 30) =>
    axios.post(`${API_URL}/admin/training/certifications/scan-expiry`, {}, {
      params: { days_ahead: daysAhead },
    }),
};

// Employee Engagement API (Phase-4 M6)
export const engagementApi = {
  listSurveys: (activeOnly = true) =>
    axios.get(`${API_URL}/employee-engagement/surveys`, { params: { active_only: activeOnly } }),
  createSurvey: (payload) => axios.post(`${API_URL}/employee-engagement/surveys`, payload),
  submitResponse: (payload) => axios.post(`${API_URL}/employee-engagement/responses`, payload),
  getDashboard: (params = {}) => axios.get(`${API_URL}/employee-engagement/dashboard`, { params }),
  listResponses: (params = {}) => axios.get(`${API_URL}/employee-engagement/responses`, { params }),
  listTemplates: () => axios.get(`${API_URL}/employee-engagement/survey-templates`),
  createTemplate: (payload) => axios.post(`${API_URL}/employee-engagement/survey-templates`, payload),
  updateTemplate: (templateId, payload) =>
    axios.put(`${API_URL}/employee-engagement/survey-templates/${encodeURIComponent(templateId)}`, payload),
  deleteTemplate: (templateId) =>
    axios.delete(`${API_URL}/employee-engagement/survey-templates/${encodeURIComponent(templateId)}`),
  createSurveyFromTemplate: (payload) =>
    axios.post(`${API_URL}/employee-engagement/surveys/from-template`, payload),
  listSchedules: () => axios.get(`${API_URL}/employee-engagement/survey-schedules`),
  createSchedule: (payload) => axios.post(`${API_URL}/employee-engagement/survey-schedules`, payload),
  adminDispatchDueSchedules: () =>
    axios.post(`${API_URL}/admin/employee-engagement/schedules/dispatch-due`, {}),
  adminRemindParticipation: (surveyId) =>
    axios.post(`${API_URL}/admin/employee-engagement/surveys/${encodeURIComponent(surveyId)}/remind-participation`, {}),
  listPrivacyAudit: (params = {}) => axios.get(`${API_URL}/employee-engagement/privacy-audit`, { params }),
};

// High-skill talent retention API (Phase-4 M8)
export const retentionApi = {
  getDashboard: () => axios.get(`${API_URL}/workforce/retention`),
  scoreRun: () => axios.post(`${API_URL}/workforce/retention/v1/score-run`, {}),
  listScores: (params = {}) => axios.get(`${API_URL}/workforce/retention/v1/scores`, { params }),
  getEmployeeScore: (employeeId) =>
    axios.get(`${API_URL}/workforce/retention/v1/employees/${encodeURIComponent(employeeId)}/score`),
  getSegmentSettings: () => axios.get(`${API_URL}/workforce/retention/v1/segments/settings`),
  listPlaybooks: () => axios.get(`${API_URL}/workforce/retention/v1/playbooks`),
  listInterventions: (params = {}) =>
    axios.get(`${API_URL}/workforce/retention/v1/interventions`, { params }),
  createIntervention: (payload) => axios.post(`${API_URL}/workforce/retention/v1/interventions`, payload),
  appendTimeline: (interventionId, payload) =>
    axios.patch(
      `${API_URL}/workforce/retention/v1/interventions/${encodeURIComponent(interventionId)}/timeline`,
      payload,
    ),
  setOutcome: (interventionId, payload) =>
    axios.put(
      `${API_URL}/workforce/retention/v1/interventions/${encodeURIComponent(interventionId)}/outcome`,
      payload,
    ),
  getMetrics: () => axios.get(`${API_URL}/workforce/retention/v1/metrics`),
  /** Admin JWT */
  getModel: () => axios.get(`${API_URL}/workforce/retention/v1/model`),
  /** Admin JWT — ensemble_mode: linear | gb | avg; interaction_features_enabled */
  patchModel: (payload) => axios.patch(`${API_URL}/workforce/retention/v1/model`, payload),
};

// Automation API (MVP)
export const automationApi = {
  getStatus: () => axios.get(`${API_URL}/automation/status`),
  reprocessLifecycle: (payload = { limit: 50 }) =>
    axios.post(`${API_URL}/automation/reprocess-lifecycle`, payload),
};

// Employee Lifecycle API (Phase-2)
export const employeeLifecycleApi = {
  getDashboard: () => axios.get(`${API_URL}/employee-lifecycle/dashboard`),
  listEvents: (params) => axios.get(`${API_URL}/employee-lifecycle/events`, { params }),
  createEvent: (payload) => axios.post(`${API_URL}/employee-lifecycle/events`, payload),
  updateEvent: (eventId, payload) => axios.put(`${API_URL}/employee-lifecycle/events/${encodeURIComponent(eventId)}`, payload),
  deleteEvent: (eventId) => axios.delete(`${API_URL}/employee-lifecycle/events/${encodeURIComponent(eventId)}`),
  approveEvent: (eventId) => axios.post(`${API_URL}/employee-lifecycle/events/${encodeURIComponent(eventId)}/approve`),
  rejectEvent: (eventId, payload) =>
    axios.post(`${API_URL}/employee-lifecycle/events/${encodeURIComponent(eventId)}/reject`, payload),
  auditLog: (params) => axios.get(`${API_URL}/employee-lifecycle/audit-log`, { params }),
};

export const complianceApi = {
  listDocuments: (params) => axios.get(`${API_URL}/compliance/documents`, { params }),
  createDocument: (payload) => axios.post(`${API_URL}/compliance/documents`, payload),
  verifyDocument: (docId, payload) =>
    axios.post(`${API_URL}/compliance/documents/${encodeURIComponent(docId)}/verify`, payload),
  exportReport: (params = {}) =>
    axios.get(`${API_URL}/compliance/report/export`, { params, responseType: 'blob' }),
};

export default {
  jobs: jobsApi,
  candidates: candidatesApi,
  applications: applicationsApi,
  referrals: referralsApi,
  assessments: assessmentsApi,
  dashboard: dashboardApi,
  fitScores: fitScoresApi,
  interviews: interviewsApi,
  interviewProposals: interviewProposalsApi,
  notifications: notificationsApi,
  admin: adminApi,
  transformation: transformationApi,
  employees: employeeApi,
  workforce: workforceApi,
  executive: executiveApi,
};
