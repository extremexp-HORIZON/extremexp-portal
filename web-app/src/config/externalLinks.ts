/**
 * External Links Configuration
 *
 * Keep this file simple:
 * 1) Set default URLs in DEFAULT_LINKS
 * 2) Override any URL using the VITE_* env var shown next to it
 * 3) Use template variables like {experimentId} or {workflowId} in defaults/env values
 *
 * Example override in .env.local:
 * VITE_EXPERIMENT_GRAPHICAL_EDITOR_URL=https://example.com/editor?experimentId={experimentId}
 */

// =============================================================================
// Default Placeholder Values
// =============================================================================

export const DEFAULT_LINKS = {
  // Management Links
  // VITE_ACCESS_CONTROL_POLICY_EDITOR_URL
  accessControlPolicyEditorUrl: `https://ddm.extremexp-icom.intracom-telecom.com/set-policies`,
  // VITE_DATA_MANAGEMENT_UPLOAD_ANNOTATE_URL
  dataManagementUploadAnnotateUrl: `https://ddm.extremexp-icom.intracom-telecom.com`,

  // Experiment Editor Links
  // VITE_EXPERIMENT_INTENT_EDITOR_URL
  experimentIntentUrl: `https://mlassetselection.essi.upc.edu/intent2Workflow/#/data-products?experimentId={experimentId}`,
  // VITE_EXPERIMENT_GRAPHICAL_EDITOR_URL
  experimentGraphicalEditorUrl: `https://placeholder.extremexp.eu/experiment/graphical-editor?experimentId={experimentId}`,
  // VITE_EXPERIMENT_CODE_EDITOR_URL
  experimentCodeEditorUrl: `https://ide.extremexp-icom.intracom-telecom.com/?folder=/home/user/workspace/&experimentId={experimentId}`,
  // VITE_EXPERIMENT_SCHEDULE_URL
  experimentScheduleUrl: `https://dal.extremexp-icom.intracom-telecom.com/experiments?experimentId={experimentId}`,

  // Workflow Editor Links
  // VITE_WORKFLOW_CODE_EDITOR_URL
  workflowCodeEditorUrl: `https://placeholder.extremexp.eu/workflow/code-editor?workflowId={workflowId}`,

  // Observe & Analyze Links
  // VITE_VISUALIZATION_URL
  visualizationUrl: `https://placeholder.extremexp.eu/visualization?experimentId={experimentId}`,
  // VITE_GAMIFICATION_URL
  gamificationUrl: `https://i4dxp.eu/game/iframe/?experimentId={experimentId}`,
  // VITE_EXPERIMENT_CARD_URL
  experimentCardUrl: `https://expcards.extremexp-icom.intracom-telecom.com/query_experiments_page?experimentId={experimentId}`,

  // Footer Links
  // VITE_PROJECT_PAGE_URL
  projectPageUrl: "https://extremexp.eu/",
  // VITE_PRIVACY_POLICY_URL
  privacyPolicyUrl: `https://placeholder.extremexp.eu/privacy-policy`,
} as const

// =============================================================================
// Configuration with Environment Variable Overrides
// =============================================================================

/**
 * External links configuration object.
 * Values are loaded from environment variables if available, otherwise defaults are used.
 */
export const externalLinks = {
  // Management Links
  accessControlPolicyEditorUrl:
    import.meta.env.VITE_ACCESS_CONTROL_POLICY_EDITOR_URL || DEFAULT_LINKS.accessControlPolicyEditorUrl,
  dataManagementUploadAnnotateUrl:
    import.meta.env.VITE_DATA_MANAGEMENT_UPLOAD_ANNOTATE_URL || DEFAULT_LINKS.dataManagementUploadAnnotateUrl,

  // Experiment Editor Links
  experimentIntentUrl:
    import.meta.env.VITE_EXPERIMENT_INTENT_EDITOR_URL || DEFAULT_LINKS.experimentIntentUrl,
  experimentGraphicalEditorUrl:
    import.meta.env.VITE_EXPERIMENT_GRAPHICAL_EDITOR_URL || DEFAULT_LINKS.experimentGraphicalEditorUrl,
  experimentCodeEditorUrl:
    import.meta.env.VITE_EXPERIMENT_CODE_EDITOR_URL || DEFAULT_LINKS.experimentCodeEditorUrl,
  experimentScheduleUrl:
    import.meta.env.VITE_EXPERIMENT_SCHEDULE_URL || DEFAULT_LINKS.experimentScheduleUrl,

  // Workflow Editor Links
  workflowCodeEditorUrl:
    import.meta.env.VITE_WORKFLOW_CODE_EDITOR_URL || DEFAULT_LINKS.workflowCodeEditorUrl,

  // Observe & Analyze Links
  visualizationUrl:
    import.meta.env.VITE_VISUALIZATION_URL || DEFAULT_LINKS.visualizationUrl,
  gamificationUrl:
    import.meta.env.VITE_GAMIFICATION_URL || DEFAULT_LINKS.gamificationUrl,
  experimentCardUrl:
    import.meta.env.VITE_EXPERIMENT_CARD_URL || DEFAULT_LINKS.experimentCardUrl,

  // Footer Links
  projectPageUrl:
    import.meta.env.VITE_PROJECT_PAGE_URL || DEFAULT_LINKS.projectPageUrl,
  privacyPolicyUrl:
    import.meta.env.VITE_PRIVACY_POLICY_URL || DEFAULT_LINKS.privacyPolicyUrl,
} as const

export type ExternalLinksConfig = typeof externalLinks
