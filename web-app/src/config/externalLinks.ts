/**
 * External Links Configuration
 *
 * This file contains all external tool links and configuration variables for the web-app.
 * Links can be overridden using VITE_* environment variables.
 *
 * ## Environment Variable Overrides
 *
 * All links can be overridden by setting the corresponding VITE_* environment variable.
 * The variable name is the uppercase version of the config key with VITE_ prefix.
 *
 * ### Experiment Editor Links (require experiment ID as query parameter)
 * - VITE_EXPERIMENT_GRAPHICAL_EDITOR_URL - Graphical experiment editor
 * - VITE_EXPERIMENT_CODE_EDITOR_URL - Code-based experiment editor
 * - VITE_EXPERIMENT_SCHEDULE_URL - Experiment scheduling tool
 *
 * ### Workflow Editor Links (require workflow ID as query parameter)
 * - VITE_WORKFLOW_CODE_EDITOR_URL - Code-based workflow editor
 *
 * ### Observe & Analyze Links (require experiment ID as query parameter)
 * - VITE_GAMIFICATION_URL - Gamification dashboard
 * - VITE_EXPERIMENT_CARD_URL - Experiment card view
 *
 * ### Management Links (no parameters)
 * - VITE_ACCESS_CONTROL_POLICY_EDITOR_URL - Access control policy editor
 * - VITE_DATA_MANAGEMENT_UPLOAD_ANNOTATE_URL - Data management upload/annotate tool
 *
 * ### Footer Links
 * - VITE_PROJECT_PAGE_URL - Project homepage (default: https://extremexp.eu/)
 * - VITE_PRIVACY_POLICY_URL - Privacy policy page
 *
 * ## Usage Example
 *
 * In your .env.local file:
 * ```
 * VITE_EXPERIMENT_GRAPHICAL_EDITOR_URL=https://my-editor.example.com/graphical
 * VITE_GAMIFICATION_URL=https://gamification.example.com
 * ```
 */

// =============================================================================
// Default Placeholder Values
// =============================================================================

const PLACEHOLDER_BASE = "https://placeholder.extremexp.eu"

const defaults = {
  // Experiment Editor Links
  experimentGraphicalEditorUrl: `${PLACEHOLDER_BASE}/experiment/graphical-editor`,
  experimentCodeEditorUrl: `${PLACEHOLDER_BASE}/experiment/code-editor`,
  experimentScheduleUrl: `${PLACEHOLDER_BASE}/experiment/schedule`,

  // Workflow Editor Links
  workflowCodeEditorUrl: `${PLACEHOLDER_BASE}/workflow/code-editor`,

  // Observe & Analyze Links
  gamificationUrl: `${PLACEHOLDER_BASE}/gamification`,
  experimentCardUrl: `${PLACEHOLDER_BASE}/experiment-card`,

  // Management Links
  accessControlPolicyEditorUrl: `${PLACEHOLDER_BASE}/access-control/policy-editor`,
  dataManagementUploadAnnotateUrl: `${PLACEHOLDER_BASE}/data-management/upload-annotate`,

  // Footer Links
  projectPageUrl: "https://extremexp.eu/",
  privacyPolicyUrl: `${PLACEHOLDER_BASE}/privacy-policy`,
} as const

// =============================================================================
// Configuration with Environment Variable Overrides
// =============================================================================

/**
 * External links configuration object.
 * Values are loaded from environment variables if available, otherwise defaults are used.
 */
export const externalLinks = {
  // Experiment Editor Links
  experimentGraphicalEditorUrl:
    import.meta.env.VITE_EXPERIMENT_GRAPHICAL_EDITOR_URL || defaults.experimentGraphicalEditorUrl,
  experimentCodeEditorUrl:
    import.meta.env.VITE_EXPERIMENT_CODE_EDITOR_URL || defaults.experimentCodeEditorUrl,
  experimentScheduleUrl:
    import.meta.env.VITE_EXPERIMENT_SCHEDULE_URL || defaults.experimentScheduleUrl,

  // Workflow Editor Links
  workflowCodeEditorUrl:
    import.meta.env.VITE_WORKFLOW_CODE_EDITOR_URL || defaults.workflowCodeEditorUrl,

  // Observe & Analyze Links
  gamificationUrl:
    import.meta.env.VITE_GAMIFICATION_URL || defaults.gamificationUrl,
  experimentCardUrl:
    import.meta.env.VITE_EXPERIMENT_CARD_URL || defaults.experimentCardUrl,

  // Management Links
  accessControlPolicyEditorUrl:
    import.meta.env.VITE_ACCESS_CONTROL_POLICY_EDITOR_URL || defaults.accessControlPolicyEditorUrl,
  dataManagementUploadAnnotateUrl:
    import.meta.env.VITE_DATA_MANAGEMENT_UPLOAD_ANNOTATE_URL || defaults.dataManagementUploadAnnotateUrl,

  // Footer Links
  projectPageUrl:
    import.meta.env.VITE_PROJECT_PAGE_URL || defaults.projectPageUrl,
  privacyPolicyUrl:
    import.meta.env.VITE_PRIVACY_POLICY_URL || defaults.privacyPolicyUrl,
} as const

// =============================================================================
// URL Builder Utilities
// =============================================================================

/**
 * Safely builds a URL with query parameters.
 * Handles encoding and validates the base URL.
 *
 * @param baseUrl - The base URL to append parameters to
 * @param params - Key-value pairs of query parameters
 * @returns The complete URL with encoded query parameters
 *
 * @example
 * buildUrl("https://example.com/editor", { experimentId: "exp-123" })
 * // Returns: "https://example.com/editor?experimentId=exp-123"
 */
export function buildUrl(baseUrl: string, params: Record<string, string | number | undefined>): string {
  try {
    const url = new URL(baseUrl)

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value))
      }
    }

    return url.toString()
  } catch {
    // If URL parsing fails, fall back to simple string concatenation
    const queryString = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join("&")

    if (!queryString) return baseUrl
    return `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}${queryString}`
  }
}

// =============================================================================
// Pre-configured URL Builders
// =============================================================================

/**
 * Builds the URL for the experiment graphical editor.
 * @param experimentId - The experiment identifier
 */
export function getExperimentGraphicalEditorUrl(experimentId: string | number): string {
  return buildUrl(externalLinks.experimentGraphicalEditorUrl, { experimentId })
}

/**
 * Builds the URL for the experiment code editor.
 * @param experimentId - The experiment identifier
 */
export function getExperimentCodeEditorUrl(experimentId: string | number): string {
  return buildUrl(externalLinks.experimentCodeEditorUrl, { experimentId })
}

/**
 * Builds the URL for the experiment schedule tool.
 * @param experimentId - The experiment identifier
 */
export function getExperimentScheduleUrl(experimentId: string | number): string {
  return buildUrl(externalLinks.experimentScheduleUrl, { experimentId })
}

/**
 * Builds the URL for the workflow code editor.
 * @param workflowId - The workflow identifier
 */
export function getWorkflowCodeEditorUrl(workflowId: string | number): string {
  return buildUrl(externalLinks.workflowCodeEditorUrl, { workflowId })
}

/**
 * Builds the URL for the gamification dashboard.
 * @param experimentId - The experiment identifier
 */
export function getGamificationUrl(experimentId: string | number): string {
  return buildUrl(externalLinks.gamificationUrl, { experimentId })
}

/**
 * Builds the URL for the experiment card view.
 * @param experimentId - The experiment identifier
 */
export function getExperimentCardUrl(experimentId: string | number): string {
  return buildUrl(externalLinks.experimentCardUrl, { experimentId })
}

// =============================================================================
// Type Definitions
// =============================================================================

export type ExternalLinksConfig = typeof externalLinks
