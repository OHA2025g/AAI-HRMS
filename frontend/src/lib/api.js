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
  listPaged: (params) => axios.get(`${API_URL}/candidates/paged`, { params }),
  get: (id) => axios.get(`${API_URL}/candidates/${encodeURIComponent(id)}`),
  getProfile: (id) => axios.get(`${API_URL}/candidates/${encodeURIComponent(id)}/profile`),
  create: (data) => axios.post(`${API_URL}/candidates`, data),
  update: (id, data) => axios.put(`${API_URL}/candidates/${encodeURIComponent(id)}`, data),
  uploadResume: (formData) => axios.post(`${API_URL}/candidates/upload-resume`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

// Applications API
export const applicationsApi = {
  list: (params) => axios.get(`${API_URL}/applications`, { params }),
  create: (data) => axios.post(`${API_URL}/applications`, data),
  updateStage: (id, data) => axios.put(`${API_URL}/applications/${id}/stage`, data),
  updateOfferStatus: (id, data) => axios.patch(`${API_URL}/applications/${id}/offer-status`, data),
  getStageHistory: (id) => axios.get(`${API_URL}/applications/${id}/stage-history`),
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
  list: (params = {}) => axios.get(`${API_URL}/assessments`, { params }),
  get: (id) => axios.get(`${API_URL}/assessments/${id}`),
  generate: (jobId, data, publish = false) =>
    axios.post(`${API_URL}/assessments/generate/${jobId}`, data, { params: { publish } }),
  update: (id, data) => axios.put(`${API_URL}/assessments/${id}`, data),
  publish: (id) => axios.post(`${API_URL}/assessments/${id}/publish`),
  archive: (id) => axios.post(`${API_URL}/assessments/${id}/archive`),
  setPrimary: (id) => axios.post(`${API_URL}/assessments/${id}/set-primary`),
  duplicate: (id) => axios.post(`${API_URL}/assessments/${id}/duplicate`),
  regenerateQuestion: (assessmentId, questionId) =>
    axios.post(`${API_URL}/assessments/${assessmentId}/questions/${questionId}/regenerate`),
  suggestPassThreshold: (id) => axios.post(`${API_URL}/assessments/${id}/suggest-pass-threshold`),
  invite: (id, data) => axios.post(`${API_URL}/assessments/${id}/invite`, data),
  itemAnalysis: (id) => axios.get(`${API_URL}/assessments/${id}/item-analysis`),
  auditLog: (params = {}) => axios.get(`${API_URL}/assessments/audit-log`, { params }),
  analyticsSummary: (params = {}) => axios.get(`${API_URL}/assessments/analytics/summary`, { params }),
  analyticsFunnel: (params = {}) => axios.get(`${API_URL}/assessments/analytics/funnel`, { params }),
  analyticsPassRate: (params = {}) => axios.get(`${API_URL}/assessments/analytics/pass-rate-by-type`, { params }),
  analyticsScoreDistribution: (params = {}) =>
    axios.get(`${API_URL}/assessments/analytics/score-distribution`, { params }),
  analyticsTrends: (params = {}) => axios.get(`${API_URL}/assessments/analytics/trends`, { params }),
  analyticsSkillBreakdown: (params = {}) =>
    axios.get(`${API_URL}/assessments/analytics/skill-breakdown`, { params }),
  analyticsFitVsScore: (params = {}) => axios.get(`${API_URL}/assessments/analytics/fit-vs-score`, { params }),
  analyticsTimeVsScore: (params = {}) => axios.get(`${API_URL}/assessments/analytics/time-vs-score`, { params }),
  analyticsCalibration: (params = {}) => axios.get(`${API_URL}/assessments/analytics/calibration`, { params }),
  analyticsOutcomeCorrelation: (params = {}) =>
    axios.get(`${API_URL}/assessments/analytics/outcome-correlation`, { params }),
  analyticsCoverage: (params = {}) => axios.get(`${API_URL}/assessments/analytics/coverage`, { params }),
  config: () => axios.get(`${API_URL}/assessments/config`),
  dispatchInviteEmails: (limit = 100) =>
    axios.post(`${API_URL}/assessments/admin/dispatch-invite-emails`, null, { params: { limit } }),
  dispatchReminders: (hoursSinceInvite = 48) =>
    axios.post(`${API_URL}/assessments/admin/dispatch-reminders`, null, {
      params: { hours_since_invite: hoursSinceInvite },
    }),
  opsStatus: () => axios.get(`${API_URL}/assessments/admin/ops-status`),
  listSubmissions: (params = {}) => axios.get(`${API_URL}/assessments/submissions`, { params }),
  getSubmission: (id) => axios.get(`${API_URL}/assessments/submissions/${id}`),
  startSubmission: (id) => axios.post(`${API_URL}/assessments/submissions/${id}/start`),
  submitSubmission: (id, data) => axios.post(`${API_URL}/assessments/submissions/${id}/submit`, data),
  gradeSubmission: (id, data) => axios.patch(`${API_URL}/assessments/submissions/${id}`, data),
  aiSuggestGrades: (id) => axios.post(`${API_URL}/assessments/submissions/${id}/ai-suggest-grades`),
  resendSubmissionEmail: (id) => axios.post(`${API_URL}/assessments/submissions/${id}/resend-email`),
  cancelSubmission: (id) => axios.post(`${API_URL}/assessments/submissions/${id}/cancel`),
  publicTake: (token) => axios.get(`${API_URL}/assessments/take/${token}`),
  publicTakeStart: (token) => axios.post(`${API_URL}/assessments/take/${token}/start`),
  publicTakeDraft: (token, data) => axios.put(`${API_URL}/assessments/take/${token}/draft`, data),
  publicTakeSubmit: (token, data) => axios.post(`${API_URL}/assessments/take/${token}/submit`, data),
  listVersions: (id) => axios.get(`${API_URL}/assessments/${id}/versions`),
};

// Dashboard API
export const dashboardApi = {
  getStats: () => axios.get(`${API_URL}/dashboard/stats`),
  getHiringPack: (params = {}) => axios.get(`${API_URL}/dashboard/hiring-pack`, { params }),
  getTrends: (params = {}) => axios.get(`${API_URL}/dashboard/trends`, { params }),
  getTrendsHealth: () => axios.get(`${API_URL}/dashboard/trends/health`),
  getHiringAlertDismissals: () => axios.get(`${API_URL}/dashboard/hiring-alerts/dismissals`),
  dismissHiringAlert: (alertId) =>
    axios.post(`${API_URL}/dashboard/hiring-alerts/dismissals`, { alert_id: alertId }),
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
  getHiringDashboardConfig: () => axios.get(`${API_URL}/admin/hiring-dashboard/config`),
  updateHiringDashboardConfig: (data) => axios.put(`${API_URL}/admin/hiring-dashboard/config`, data),
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
  getM9Trends: (months = 12) => axios.get(`${API_URL}/executive/m9/trends`, { params: { months } }),
  getM9PredictiveViews: (params = {}) => axios.get(`${API_URL}/executive/m9/predictive-views`, { params }),
  /** Single round-trip: pack, drill, definitions, trends, drill_options, snapshots */
  getM9DashboardBundle: (params = {}) => axios.get(`${API_URL}/executive/m9/dashboard-bundle`, { params }),
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

export const executiveKpiAdminApi = {
  listThresholds: () => axios.get(`${API_URL}/admin/m9/kpi-thresholds`),
  updateThreshold: (kpiId, payload) =>
    axios.put(`${API_URL}/admin/m9/kpi-thresholds/${encodeURIComponent(kpiId)}`, payload),
  resetThreshold: (kpiId) => axios.delete(`${API_URL}/admin/m9/kpi-thresholds/${encodeURIComponent(kpiId)}`),
  updateDefinition: (kpiId, payload) =>
    axios.put(`${API_URL}/admin/m9/kpi-definitions/${encodeURIComponent(kpiId)}`, payload),
  resetDefinition: (kpiId) =>
    axios.delete(`${API_URL}/admin/m9/kpi-definitions/${encodeURIComponent(kpiId)}`),
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

// Workforce Intelligence module API (M15)
export const workforceIntelModuleApi = {
  getDashboardSummary: () => axios.get(`${API_URL}/workforce-intelligence/dashboard/summary`),
  getExecutiveSummary: () => axios.get(`${API_URL}/workforce-intelligence/executive/summary`),
  listByPath: (apiPath, params = {}) => axios.get(`${API_URL}/workforce-intelligence/${apiPath}`, { params }),
  copilotQuery: (payload) => axios.post(`${API_URL}/workforce-intelligence/copilot/query`, payload),
  listCopilotQueries: (params = {}) => axios.get(`${API_URL}/workforce-intelligence/copilot/queries`, { params }),
};

// Cost Optimization & Automation (M16)
export const costOptimizationModuleApi = {
  getDashboardSummary: () => axios.get(`${API_URL}/cost-optimization-automation/dashboard/summary`),
  getExecutiveSummary: () => axios.get(`${API_URL}/cost-optimization-automation/executive/summary`),
  getStrategicSummary: () => axios.get(`${API_URL}/cost-optimization-automation/strategic/summary`),
  getSummariesBundle: () => axios.get(`${API_URL}/cost-optimization-automation/summaries/bundle`),
  listBySegment: (segment, params = {}) =>
    axios.get(`${API_URL}/cost-optimization-automation/records/${encodeURIComponent(segment)}`, { params }),
  copilotQuery: (payload) => axios.post(`${API_URL}/cost-optimization-automation/copilot/query`, payload),
  listCopilotQueries: (params = {}) => axios.get(`${API_URL}/cost-optimization-automation/copilot/queries`, { params }),
  scenarioWhatIf: (payload) => axios.post(`${API_URL}/cost-optimization-automation/scenario/what-if`, payload),
};

// Employee Satisfaction & Engagement (M17)
export const employeeSatisfactionEngagementApi = {
  getDashboardSummary: () => axios.get(`${API_URL}/employee-satisfaction-engagement/dashboard/summary`),
  getSummariesBundle: () => axios.get(`${API_URL}/employee-satisfaction-engagement/summaries/bundle`),
  getExecutiveSummary: () => axios.get(`${API_URL}/employee-satisfaction-engagement/executive/summary`),
  listBySegment: (segment, params = {}) =>
    axios.get(`${API_URL}/employee-satisfaction-engagement/records/${encodeURIComponent(segment)}`, { params }),
  listElmGrievances: (params = {}) =>
    axios.get(`${API_URL}/employee-satisfaction-engagement/integrations/elm/grievances`, { params }),
  listWfiBurnout: (params = {}) =>
    axios.get(`${API_URL}/employee-satisfaction-engagement/integrations/wfi/burnout-risk`, { params }),
  listWfiAttrition: (params = {}) =>
    axios.get(`${API_URL}/employee-satisfaction-engagement/integrations/wfi/attrition-risk`, { params }),
  listWfiEngagementVisibility: (params = {}) =>
    axios.get(`${API_URL}/employee-satisfaction-engagement/integrations/wfi/engagement-visibility`, { params }),
  listWfiForecasts: (params = {}) =>
    axios.get(`${API_URL}/employee-satisfaction-engagement/integrations/wfi/forecasts`, { params }),
  listWfiAiRecommendations: (params = {}) =>
    axios.get(`${API_URL}/employee-satisfaction-engagement/integrations/wfi/ai-recommendations`, { params }),
  getWfiExecutiveSummary: () => axios.get(`${API_URL}/employee-satisfaction-engagement/integrations/wfi/executive-summary`),
  postFeedback: (payload) => axios.post(`${API_URL}/employee-satisfaction-engagement/feedback`, payload),
  postActionPlan: (payload) => axios.post(`${API_URL}/employee-satisfaction-engagement/action-plans`, payload),
  postGovernance: (payload) => axios.post(`${API_URL}/employee-satisfaction-engagement/governance/records`, payload),
  scenarioWhatIf: (payload) => axios.post(`${API_URL}/employee-satisfaction-engagement/scenario/what-if`, payload),
  copilotQuery: (payload) => axios.post(`${API_URL}/employee-satisfaction-engagement/copilot/query`, payload),
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

export const resourcesApi = {
  create: (payload) => axios.post(`${API_URL}/resources/create`, payload),
  search: (params) => axios.get(`${API_URL}/resources/search`, { params }),
  get: (id) => axios.get(`${API_URL}/resources/${encodeURIComponent(id)}`),
  update: (employeeId, payload) =>
    axios.put(`${API_URL}/resources/update`, payload, { params: { employee_id: employeeId } }),
};

export const allocationsApi = {
  create: (payload) => axios.post(`${API_URL}/allocations`, payload),
  listByProject: (projectId) => axios.get(`${API_URL}/allocations/project/${encodeURIComponent(projectId)}`),
  listByResource: (employeeId) => axios.get(`${API_URL}/allocations/resource/${encodeURIComponent(employeeId)}`),
  update: (allocationId, payload) =>
    axios.put(`${API_URL}/allocations/${encodeURIComponent(allocationId)}`, payload),
  approve: (allocationId, action, reason) =>
    axios.post(`${API_URL}/allocations/${encodeURIComponent(allocationId)}/approve`, { action, reason }),
};

const AS = `${API_URL}/resource-project-optimization/allocation`;

/** Allocation Section — staffing bridge (projects ↔ resources). */
export const allocationSectionApi = {
  dashboardSummary: () => axios.get(`${AS}/dashboard/summary`),
  masterList: (params = {}) => axios.get(`${AS}/master`, { params }),
  masterGet: (id) => axios.get(`${AS}/master/${encodeURIComponent(id)}`),
  masterCreate: (payload) => axios.post(`${AS}/master`, payload),
  masterUpdate: (id, payload) => axios.put(`${AS}/master/${encodeURIComponent(id)}`, payload),
  masterDelete: (id) => axios.delete(`${AS}/master/${encodeURIComponent(id)}`),
  masterClone: (id) => axios.post(`${AS}/master/${encodeURIComponent(id)}/clone`),
  requestsList: () => axios.get(`${AS}/requests`),
  requestsCreate: (payload) => axios.post(`${AS}/requests`, payload),
  requestsUpdate: (id, payload) => axios.put(`${AS}/requests/${encodeURIComponent(id)}`, payload),
  requestsConvert: (id, body) => axios.post(`${AS}/requests/${encodeURIComponent(id)}/convert-to-allocation`, body),
  assignmentSuggestions: (params) => axios.get(`${AS}/assignment/suggestions`, { params }),
  scheduling: () => axios.get(`${AS}/scheduling`),
  capacityConflicts: () => axios.get(`${AS}/capacity-conflicts`),
  resolveConflict: (id, body) => axios.post(`${AS}/capacity-conflicts/${encodeURIComponent(id)}/resolve`, body),
  billability: () => axios.get(`${AS}/billability-commercials`),
  approvals: () => axios.get(`${AS}/approvals`),
  approvalAction: (id, body) => axios.post(`${AS}/approvals/${encodeURIComponent(id)}/action`, body),
  rollonRolloff: () => axios.get(`${AS}/rollon-rolloff`),
  demandSupply: () => axios.get(`${AS}/demand-supply`),
  fulfillmentBench: () => axios.get(`${AS}/fulfillment-bench`),
  replacementBackup: () => axios.get(`${AS}/replacement-backup`),
  changesRelease: () => axios.get(`${AS}/changes-release`),
  calendarHeatmap: () => axios.get(`${AS}/calendar-heatmap`),
  documentsNotes: (params = {}) => axios.get(`${AS}/documents-notes/notes`, { params }),
  createNote: (payload) => axios.post(`${AS}/documents-notes/notes`, payload),
  alerts: () => axios.get(`${AS}/alerts-communication`),
  ackAlert: (id) => axios.post(`${AS}/alerts-communication/${encodeURIComponent(id)}/ack`),
  analyticsSummary: () => axios.get(`${AS}/analytics/summary`),
  forecasting: () => axios.get(`${AS}/forecasting`),
  aiInsights: () => axios.get(`${AS}/ai-insights`),
};

const RS = `${API_URL}/resource-project-optimization/resource`;

/** Resource Section — workforce intelligence & deployability (M11). */
export const resourceSectionApi = {
  dashboardSummary: () => axios.get(`${RS}/dashboard/summary`),
  masterList: (params = {}) => axios.get(`${RS}/master`, { params }),
  masterGet: (id) => axios.get(`${RS}/master/${encodeURIComponent(id)}`),
  patchProfile: (id, payload) => axios.patch(`${RS}/master/${encodeURIComponent(id)}/profile`, payload),
  classificationList: (params = {}) => axios.get(`${RS}/classification`, { params }),
  classificationAdd: (body) => axios.post(`${RS}/classification`, body),
  skillsList: (params = {}) => axios.get(`${RS}/skills`, { params }),
  skillsCreate: (payload) => axios.post(`${RS}/skills`, payload),
  availabilityUtilization: () => axios.get(`${RS}/availability-utilization`),
  bench: () => axios.get(`${RS}/bench`),
  deploymentReadiness: () => axios.get(`${RS}/deployment-readiness`),
  demandMatching: () => axios.get(`${RS}/demand-matching`),
  mobilityCareer: () => axios.get(`${RS}/mobility-career`),
  learningCertifications: () => axios.get(`${RS}/learning-certifications`),
  costCommercial: () => axios.get(`${RS}/cost-commercial`),
  attendanceLeaveImpact: () => axios.get(`${RS}/attendance-leave-impact`),
  documentsCompliance: () => axios.get(`${RS}/documents-compliance`),
  notesList: (params = {}) => axios.get(`${RS}/notes-communication`, { params }),
  notesCreate: (payload) => axios.post(`${RS}/notes-communication`, payload),
  analyticsSummary: () => axios.get(`${RS}/analytics/summary`),
  forecasting: () => axios.get(`${RS}/forecasting`),
  approvalsList: () => axios.get(`${RS}/approvals-governance`),
  approvalAction: (id, body) =>
    axios.post(`${RS}/approvals-governance/${encodeURIComponent(id)}/action`, body),
  aiInsights: (params = {}) => axios.get(`${RS}/ai-insights`, { params }),
};

// Project Section (Enterprise Project Management)
export const projectSectionApi = {
  dashboardSummary: (params = {}) =>
    axios.get(`${API_URL}/project-section/dashboard/summary`, { params }),
  listProjects: (params = {}) => axios.get(`${API_URL}/project-section/projects`, { params }),
  createProject: (payload) => axios.post(`${API_URL}/project-section/projects`, payload),
  getProject: (id) => axios.get(`${API_URL}/project-section/projects/${encodeURIComponent(id)}`),
  updateProject: (id, payload) => axios.put(`${API_URL}/project-section/projects/${encodeURIComponent(id)}`, payload),
  archiveProject: (id) =>
    axios.post(`${API_URL}/project-section/projects/${encodeURIComponent(id)}/archive`),
  cloneProject: (id) =>
    axios.post(`${API_URL}/project-section/projects/${encodeURIComponent(id)}/clone`),
  transitionLifecycle: (id, payload) =>
    axios.post(`${API_URL}/project-section/projects/${encodeURIComponent(id)}/lifecycle/transition`, payload),
  listDemands: (projectId) =>
    axios.get(`${API_URL}/project-section/projects/${encodeURIComponent(projectId)}/demands`),
  upsertDemands: (projectId, payload) =>
    axios.post(`${API_URL}/project-section/projects/${encodeURIComponent(projectId)}/demands/bulk`, payload),
  listRisks: (projectId) =>
    axios.get(`${API_URL}/project-section/projects/${encodeURIComponent(projectId)}/risks`),
  createRisk: (projectId, payload) =>
    axios.post(`${API_URL}/project-section/projects/${encodeURIComponent(projectId)}/risks`, payload),
  listIssues: (projectId) =>
    axios.get(`${API_URL}/project-section/projects/${encodeURIComponent(projectId)}/issues`),
  createIssue: (projectId, payload) =>
    axios.post(`${API_URL}/project-section/projects/${encodeURIComponent(projectId)}/issues`, payload),
  listDocuments: (projectId) =>
    axios.get(`${API_URL}/project-section/projects/${encodeURIComponent(projectId)}/documents`),
  addDocument: (projectId, payload) =>
    axios.post(`${API_URL}/project-section/projects/${encodeURIComponent(projectId)}/documents`, payload),
  listNotes: (projectId) =>
    axios.get(`${API_URL}/project-section/projects/${encodeURIComponent(projectId)}/notes`),
  addNote: (projectId, payload) =>
    axios.post(`${API_URL}/project-section/projects/${encodeURIComponent(projectId)}/notes`, payload),
  allocationSummary: (projectId) =>
    axios.get(`${API_URL}/project-section/projects/${encodeURIComponent(projectId)}/allocations/summary`),
  kpiSnapshot: (projectId) =>
    axios.get(`${API_URL}/project-section/projects/${encodeURIComponent(projectId)}/kpi`),
  analytics: (params = {}) =>
    axios.get(`${API_URL}/project-section/analytics`, { params }),
  listApprovals: (params = {}) =>
    axios.get(`${API_URL}/project-section/approvals`, { params }),
  approve: (approvalId, action, reason) =>
    axios.post(`${API_URL}/project-section/approvals/${encodeURIComponent(approvalId)}/action`, { action, reason }),
  closureGet: (projectId) =>
    axios.get(`${API_URL}/project-section/projects/${encodeURIComponent(projectId)}/closure`),
  closureUpsert: (projectId, payload) =>
    axios.put(`${API_URL}/project-section/projects/${encodeURIComponent(projectId)}/closure`, payload),
  aiRecommendations: (projectId) =>
    axios.get(`${API_URL}/project-section/projects/${encodeURIComponent(projectId)}/ai-recommendations`),
  lifecycleHistory: (projectId) =>
    axios.get(`${API_URL}/project-section/projects/${encodeURIComponent(projectId)}/lifecycle/history`),
  wbsList: (projectId) =>
    axios.get(`${API_URL}/project-section/projects/${encodeURIComponent(projectId)}/planning/wbs`),
  wbsCreate: (projectId, payload) =>
    axios.post(`${API_URL}/project-section/projects/${encodeURIComponent(projectId)}/planning/wbs`, payload),
  wbsUpdate: (projectId, wbsId, payload) =>
    axios.put(`${API_URL}/project-section/projects/${encodeURIComponent(projectId)}/planning/wbs/${encodeURIComponent(wbsId)}`, payload),
  wbsDelete: (projectId, wbsId) =>
    axios.delete(`${API_URL}/project-section/projects/${encodeURIComponent(projectId)}/planning/wbs/${encodeURIComponent(wbsId)}`),
  wbsReorder: (projectId, payload) =>
    axios.post(`${API_URL}/project-section/projects/${encodeURIComponent(projectId)}/planning/wbs/reorder`, payload),
  wbsValidateGraph: (projectId) =>
    axios.get(`${API_URL}/project-section/projects/${encodeURIComponent(projectId)}/planning/wbs/validate-graph`),
  financeGet: (projectId) =>
    axios.get(`${API_URL}/project-section/projects/${encodeURIComponent(projectId)}/finance`),
  financeUpsert: (projectId, payload) =>
    axios.put(`${API_URL}/project-section/projects/${encodeURIComponent(projectId)}/finance`, payload),
  financeSnapshots: (projectId) =>
    axios.get(`${API_URL}/project-section/projects/${encodeURIComponent(projectId)}/finance/snapshots`),
  statusReportsList: (projectId) =>
    axios.get(`${API_URL}/project-section/projects/${encodeURIComponent(projectId)}/execution/status-reports`),
  statusReportCreate: (projectId, payload) =>
    axios.post(`${API_URL}/project-section/projects/${encodeURIComponent(projectId)}/execution/status-reports`, payload),
  executionAlerts: (projectId) =>
    axios.get(`${API_URL}/project-section/projects/${encodeURIComponent(projectId)}/execution/alerts`),
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

/** Training & Skill Development — M12 modular LMS */
export const trainingDevelopmentApi = {
  dashboardSummary: () => axios.get(`${API_URL}/training-development/dashboard/summary`),
  listPrograms: (params = {}) => axios.get(`${API_URL}/training-development/training-programs`, { params }),
  getProgram: (id) => axios.get(`${API_URL}/training-development/training-programs/${encodeURIComponent(id)}`),
  getProgramDetail: (id) =>
    axios.get(`${API_URL}/training-development/training-programs/${encodeURIComponent(id)}/detail`),
  createProgram: (payload) => axios.post(`${API_URL}/training-development/training-programs`, payload),
  updateProgram: (id, payload) =>
    axios.patch(`${API_URL}/training-development/training-programs/${encodeURIComponent(id)}`, payload),
  archiveProgram: (id) =>
    axios.delete(`${API_URL}/training-development/training-programs/${encodeURIComponent(id)}`),
  cloneProgram: (id) =>
    axios.post(`${API_URL}/training-development/training-programs/${encodeURIComponent(id)}/clone`),
  listBatches: (params = {}) => axios.get(`${API_URL}/training-development/batches`, { params }),
  createBatch: (payload) => axios.post(`${API_URL}/training-development/batches`, payload),
  listSessions: (params = {}) => axios.get(`${API_URL}/training-development/sessions`, { params }),
  createSession: (payload) => axios.post(`${API_URL}/training-development/sessions`, payload),
  listEnrollments: (params = {}) => axios.get(`${API_URL}/training-development/enrollments`, { params }),
  createEnrollment: (payload) => axios.post(`${API_URL}/training-development/enrollments`, payload),
  listCatalog: (params = {}) => axios.get(`${API_URL}/training-development/catalog-items`, { params }),
  createCatalogItem: (payload) => axios.post(`${API_URL}/training-development/catalog-items`, payload),
  listExtended: (recordType, params = {}) =>
    axios.get(`${API_URL}/training-development/extended-records/${encodeURIComponent(recordType)}`, { params }),
  createExtended: (payload) => axios.post(`${API_URL}/training-development/extended-records`, payload),
  listApprovals: (params = {}) => axios.get(`${API_URL}/training-development/approvals`, { params }),
  aiSkillGapPredictions: () => axios.get(`${API_URL}/training-development/ai/skill-gap-predictions`),
  aiLearningRecommendations: () => axios.get(`${API_URL}/training-development/ai/learning-recommendations`),
  forecastsSummary: () => axios.get(`${API_URL}/training-development/forecasts/summary`),
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

/** High-Skill Talent Retention — M13 strategic module */
export const highSkillRetentionApi = {
  dashboardSummary: (params = {}) => axios.get(`${API_URL}/high-skill-talent-retention/dashboard/summary`, { params }),

  listProfiles: (params = {}) => axios.get(`${API_URL}/high-skill-talent-retention/talent-profiles`, { params }),
  getProfile: (id) => axios.get(`${API_URL}/high-skill-talent-retention/talent-profiles/${encodeURIComponent(id)}`),
  getProfileDetail: (id) =>
    axios.get(`${API_URL}/high-skill-talent-retention/talent-profiles/${encodeURIComponent(id)}/detail`),
  createProfile: (payload) => axios.post(`${API_URL}/high-skill-talent-retention/talent-profiles`, payload),
  updateProfile: (id, payload) =>
    axios.patch(`${API_URL}/high-skill-talent-retention/talent-profiles/${encodeURIComponent(id)}`, payload),
  archiveProfile: (id) =>
    axios.delete(`${API_URL}/high-skill-talent-retention/talent-profiles/${encodeURIComponent(id)}`),

  listSegments: (params = {}) => axios.get(`${API_URL}/high-skill-talent-retention/segments`, { params }),
  sentimentEngagement: (params = {}) =>
    axios.get(`${API_URL}/high-skill-talent-retention/sentiment-engagement`, { params }),

  listStayInterviews: (params = {}) => axios.get(`${API_URL}/high-skill-talent-retention/stay-interviews`, { params }),
  createStayInterview: (payload) => axios.post(`${API_URL}/high-skill-talent-retention/stay-interviews`, payload),

  listRiskAssessments: (params = {}) => axios.get(`${API_URL}/high-skill-talent-retention/risk-assessments`, { params }),
  createRiskAssessment: (payload) => axios.post(`${API_URL}/high-skill-talent-retention/risk-assessments`, payload),

  listAttritionPredictions: (params = {}) =>
    axios.get(`${API_URL}/high-skill-talent-retention/attrition-predictions`, { params }),
  createAttritionPrediction: (payload) =>
    axios.post(`${API_URL}/high-skill-talent-retention/attrition-predictions`, payload),

  listCases: (params = {}) => axios.get(`${API_URL}/high-skill-talent-retention/cases`, { params }),
  createCase: (payload) => axios.post(`${API_URL}/high-skill-talent-retention/cases`, payload),

  listEngagementActions: (params = {}) =>
    axios.get(`${API_URL}/high-skill-talent-retention/engagement-actions`, { params }),
  createEngagementAction: (payload) => axios.post(`${API_URL}/high-skill-talent-retention/engagement-actions`, payload),

  analytics: () => axios.get(`${API_URL}/high-skill-talent-retention/analytics`),
  aiRecommendations: () => axios.get(`${API_URL}/high-skill-talent-retention/ai-recommendations`),
  aiFlightRisk: () => axios.get(`${API_URL}/high-skill-talent-retention/ai-flight-risk`),
  forecastingSummary: () => axios.get(`${API_URL}/high-skill-talent-retention/forecasting/summary`),

  naturalLanguageSearch: (payload) =>
    axios.post(`${API_URL}/high-skill-talent-retention/natural-language-search`, payload),

  // Simple list endpoints
  recognitionRewards: (params = {}) =>
    axios.get(`${API_URL}/high-skill-talent-retention/recognition-rewards`, { params }),
  relationshipHistory: (params = {}) =>
    axios.get(`${API_URL}/high-skill-talent-retention/relationship-history`, { params }),
  compensationAnalysis: (params = {}) =>
    axios.get(`${API_URL}/high-skill-talent-retention/compensation-analysis`, { params }),
  incentives: (params = {}) => axios.get(`${API_URL}/high-skill-talent-retention/incentives`, { params }),
  careerGrowth: (params = {}) => axios.get(`${API_URL}/high-skill-talent-retention/career-growth`, { params }),
  internalMobility: (params = {}) => axios.get(`${API_URL}/high-skill-talent-retention/internal-mobility`, { params }),
  skillUtilization: (params = {}) => axios.get(`${API_URL}/high-skill-talent-retention/skill-utilization`, { params }),
  criticalityMapping: (params = {}) =>
    axios.get(`${API_URL}/high-skill-talent-retention/criticality-mapping`, { params }),
  successorCoverage: (params = {}) =>
    axios.get(`${API_URL}/high-skill-talent-retention/successor-coverage`, { params }),
  developmentPlans: (params = {}) =>
    axios.get(`${API_URL}/high-skill-talent-retention/development-plans`, { params }),
  learningUpskilling: (params = {}) =>
    axios.get(`${API_URL}/high-skill-talent-retention/learning-upskilling`, { params }),
  workloadWellbeing: (params = {}) =>
    axios.get(`${API_URL}/high-skill-talent-retention/workload-wellbeing`, { params }),
  workExperience: (params = {}) => axios.get(`${API_URL}/high-skill-talent-retention/work-experience`, { params }),
  counteroffers: (params = {}) =>
    axios.get(`${API_URL}/high-skill-talent-retention/counteroffer-handling`, { params }),
  exitRiskTriggers: (params = {}) =>
    axios.get(`${API_URL}/high-skill-talent-retention/exit-risk-triggers`, { params }),
  knowledgeRisk: (params = {}) => axios.get(`${API_URL}/high-skill-talent-retention/knowledge-risk`, { params }),
  clientCritical: (params = {}) => axios.get(`${API_URL}/high-skill-talent-retention/client-critical`, { params }),
  projectCritical: (params = {}) => axios.get(`${API_URL}/high-skill-talent-retention/project-critical`, { params }),
  benchRisk: (params = {}) => axios.get(`${API_URL}/high-skill-talent-retention/bench-risk`, { params }),
  promotionStagnation: (params = {}) =>
    axios.get(`${API_URL}/high-skill-talent-retention/promotion-stagnation`, { params }),
  strategicIntelligence: (params = {}) =>
    axios.get(`${API_URL}/high-skill-talent-retention/strategic-intelligence`, { params }),
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

// Employee Lifecycle Management API (M14)
export const employeeLifecycleManagementApi = {
  getDashboardSummary: () => axios.get(`${API_URL}/employee-lifecycle-management/dashboard/summary`),
  getEmployeeBundle: (employeeId) =>
    axios.get(`${API_URL}/employee-lifecycle-management/employees/${encodeURIComponent(employeeId)}/bundle`),
  listPreboarding: (params = {}) => axios.get(`${API_URL}/employee-lifecycle-management/pre-boarding`, { params }),
  createPreboarding: (payload) => axios.post(`${API_URL}/employee-lifecycle-management/pre-boarding`, payload),
  listOnboarding: (params = {}) => axios.get(`${API_URL}/employee-lifecycle-management/onboarding`, { params }),
  createOnboarding: (payload) => axios.post(`${API_URL}/employee-lifecycle-management/onboarding`, payload),
  listProbation: (params = {}) => axios.get(`${API_URL}/employee-lifecycle-management/probation-confirmation/probation`, { params }),
  createProbation: (payload) =>
    axios.post(`${API_URL}/employee-lifecycle-management/probation-confirmation/probation`, payload),
  listResignations: (params = {}) => axios.get(`${API_URL}/employee-lifecycle-management/resignation-exit`, { params }),
  createResignation: (payload) => axios.post(`${API_URL}/employee-lifecycle-management/resignation-exit`, payload),
  listNotes: (params = {}) => axios.get(`${API_URL}/employee-lifecycle-management/notes`, { params }),
  createNote: (payload) => axios.post(`${API_URL}/employee-lifecycle-management/notes`, payload),
  listByPath: (apiPath, params = {}) => axios.get(`${API_URL}/employee-lifecycle-management/${apiPath}`, { params }),
  listForecasts: () => axios.get(`${API_URL}/employee-lifecycle-management/forecasting/summary`),
  listAiInsights: () => axios.get(`${API_URL}/employee-lifecycle-management/ai-insights/summary`),
};

export const careerTrajectoryApi = {
  analyze: (formData, { background = false } = {}) => {
    if (background) {
      formData.append('background', 'true');
    }
    return axios.post(`${API_URL}/ai-hiring/candidate-fit/career-trajectory/analyze`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      validateStatus: (s) => (background ? s === 202 || s === 200 : s >= 200 && s < 300),
    });
  },
  analyzeText: (body) => axios.post(`${API_URL}/ai-hiring/candidate-fit/career-trajectory/analyze-text`, body),
  getSummaries: (candidateIds) =>
    axios.get(`${API_URL}/ai-hiring/candidate-fit/career-trajectory/summaries`, {
      params: { candidate_ids: Array.isArray(candidateIds) ? candidateIds.join(',') : candidateIds },
    }),
  listPhase1ReadyCandidates: (params = { limit: 200 }) =>
    axios.get(`${API_URL}/ai-hiring/candidate-fit/career-trajectory/candidates/phase1-ready`, {
      params,
    }),
  getInterviewPrep: (candidateId) =>
    axios.get(
      `${API_URL}/ai-hiring/candidate-fit/career-trajectory/candidate/${encodeURIComponent(candidateId)}/interview-prep`
    ),
  getByCandidate: (candidateId) =>
    axios.get(`${API_URL}/ai-hiring/candidate-fit/career-trajectory/candidate/${encodeURIComponent(candidateId)}`),
  getReport: (reportId) =>
    axios.get(`${API_URL}/ai-hiring/candidate-fit/career-trajectory/report/${encodeURIComponent(reportId)}`),
  reanalyze: (candidateId, { background = false } = {}) =>
    axios.post(
      `${API_URL}/ai-hiring/candidate-fit/career-trajectory/reanalyze/${encodeURIComponent(candidateId)}`,
      null,
      {
        params: background ? { background: true } : {},
        validateStatus: (s) => (background ? s === 202 || s === 200 : s >= 200 && s < 300),
      }
    ),
  retryAnalyzeJob: (jobId) =>
    axios.post(
      `${API_URL}/ai-hiring/candidate-fit/career-trajectory/analyze-jobs/${encodeURIComponent(jobId)}/retry`
    ),
  listReports: (params) => axios.get(`${API_URL}/ai-hiring/candidate-fit/career-trajectory/reports`, { params }),
  deleteReport: (reportId) =>
    axios.delete(`${API_URL}/ai-hiring/candidate-fit/career-trajectory/report/${encodeURIComponent(reportId)}`),
  exportReport: (reportId, format = 'json') =>
    axios.get(`${API_URL}/ai-hiring/candidate-fit/career-trajectory/report/${encodeURIComponent(reportId)}/export`, {
      params: { format },
      responseType: format === 'pdf' || format === 'csv' || format === 'xlsx' ? 'blob' : 'json',
    }),
  exportFitPack: (candidateId, format = 'pdf') =>
    axios.get(
      `${API_URL}/ai-hiring/candidate-fit/career-trajectory/candidate/${encodeURIComponent(candidateId)}/fit-pack/export`,
      { params: { format }, responseType: 'blob' }
    ),
  getConfig: () => axios.get(`${API_URL}/ai-hiring/candidate-fit/career-trajectory/config`),
  updateConfig: (body) => axios.put(`${API_URL}/ai-hiring/candidate-fit/career-trajectory/config`, body),
  exportTraining: (params = { format: 'csv', limit: 200 }) =>
    axios.get(`${API_URL}/ai-hiring/candidate-fit/career-trajectory/reports/training-export`, {
      params,
      responseType: params.format === 'csv' ? 'blob' : 'json',
    }),
  trainMlCalibration: (limit = 200, labelSource = 'trajectory') =>
    axios.post(`${API_URL}/ai-hiring/candidate-fit/career-trajectory/ml/train-calibration`, null, {
      params: { limit, label_source: labelSource },
    }),
  getFairnessSummary: (params = {}) =>
    axios.get(`${API_URL}/ai-hiring/candidate-fit/career-trajectory/fairness/summary`, { params }),
  getAnalyzeJob: (jobId) =>
    axios.get(
      `${API_URL}/ai-hiring/candidate-fit/career-trajectory/analyze-jobs/${encodeURIComponent(jobId)}`
    ),
  analyzeTextBackground: (body) =>
    axios.post(`${API_URL}/ai-hiring/candidate-fit/career-trajectory/analyze-text`, body),
};

export const phase2FitApi = {
  simulate: (body) => axios.post(`${API_URL}/ai-hiring/candidate-fit/phase2/simulate`, body),
  getByCandidate: (candidateId) =>
    axios.get(`${API_URL}/ai-hiring/candidate-fit/phase2/candidate/${encodeURIComponent(candidateId)}`),
  getReport: (reportId) =>
    axios.get(`${API_URL}/ai-hiring/candidate-fit/phase2/report/${encodeURIComponent(reportId)}`),
  exportReport: (reportId, format = 'json') =>
    axios.get(`${API_URL}/ai-hiring/candidate-fit/phase2/report/${encodeURIComponent(reportId)}/export`, {
      params: { format },
      responseType: format === 'pdf' || format === 'csv' || format === 'xlsx' ? 'blob' : 'json',
    }),
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
  careerTrajectory: careerTrajectoryApi,
  phase2Fit: phase2FitApi,
};
