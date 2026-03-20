/**
 * External Links Configuration
 *
 * Keep this file simple:
 * 1) Set default URLs in DEFAULT_LINKS
 * 2) Override any URL using the VITE_* env var shown next to it
 * 3) Use placeholders in the URL template, like {experimentId} or {workflowId}
 *
 * Example override in .env.local:
 * VITE_EXPERIMENT_GRAPHICAL_EDITOR_URL=https://example.com/editor?experimentId={experimentId}&name={experimentName}
 *
 * -----------------------------------------------------------------------------
 * PLACEHOLDER GUIDE (VERY IMPORTANT FOR URL CUSTOMIZATION)
 * -----------------------------------------------------------------------------
 * Use placeholders in curly braces, for example: {experimentId}
 *
 * Common placeholders that the app provides today:
 * - Experiment links: {experimentId}, {experimentName}
 * - Workflow links: {workflowId}, {workflowName}
 *
 * Only these placeholders are supported. Any other placeholder name will not be replaced.
 *
 * Missing values behavior:
 * - If a missing placeholder is in a query param (e.g. ?name={experimentName}),
 *   that query param is automatically removed.
 * - If a missing placeholder appears in the path/fragment, it stays unchanged.
 *
 * Example templates:
 * - https://tool.example/app?experimentId={experimentId}&name={experimentName}
 * - https://tool.example/workflows/{workflowId}?workflowName={workflowName}
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
  experimentGraphicalEditorUrl: `http://localhost:8001/editor/experiment/undefined/{experimentId}`,
  // VITE_EXPERIMENT_CODE_EDITOR_URL
  experimentCodeEditorUrl: `https://ide.extremexp-icom.intracom-telecom.com/?folder=/home/user/workspace/&experimentId={experimentId}`,
  // VITE_EXPERIMENT_SCHEDULE_URL
  experimentScheduleUrl: `https://dal.extremexp-icom.intracom-telecom.com/experiments?experimentId={experimentId}`,

  // Workflow Editor Links
  // VITE_WORKFLOW_CODE_EDITOR_URL
  workflowCodeEditorUrl: `https://placeholder.extremexp.eu/workflow/code-editor?workflowId={workflowId}`, // ⚠️ missing
  // VITE_EXPERIMENT_GRAPHICAL_EDITOR_URL
  workflowGraphicalEditorUrl: `http://localhost:8001/editor/workflow/undefined/{workflowId}`,

  // Observe & Analyze Links
  // VITE_VISUALIZATION_URL
  visualizationUrl: `https://vis.extremexp-icom.intracom-telecom.com/{experimentId}`,
  // VITE_GAMIFICATION_URL
  gamificationUrl: `https://i4dxp.eu/game/iframe/`,
  // VITE_EXPERIMENT_CARD_URL
  experimentCardUrl: `https://expcards.extremexp-icom.intracom-telecom.com/query_experiments_page?experimentId={experimentId}`,

  // Footer Links
  // VITE_PROJECT_PAGE_URL
  projectPageUrl: "https://extremexp.eu/",
  // VITE_PRIVACY_POLICY_URL
  privacyPolicyUrl: `https://extremexp.eu/privacy-policy`, // ⚠️ missing
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
  workflowGraphicalEditorUrl:
      import.meta.env.VITE_WORKFLOW_GRAPHICAL_EDITOR_URL || DEFAULT_LINKS.workflowGraphicalEditorUrl,

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
