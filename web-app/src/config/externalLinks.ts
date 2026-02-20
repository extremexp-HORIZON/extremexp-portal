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
 * - VITE_EXPERIMENT_INTENT_EDITOR_URL - Intent experiment editor
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
  // Management Links
  accessControlPolicyEditorUrl: `https://ddm.extremexp-icom.intracom-telecom.com/set-policies`,
  dataManagementUploadAnnotateUrl: `https://ddm.extremexp-icom.intracom-telecom.com`,

  // Experiment Editor Links
  experimentIntentUrl: `https://mlassetselection.essi.upc.edu/intent2Workflow/#/data-products`,
  experimentGraphicalEditorUrl: `${PLACEHOLDER_BASE}/experiment/graphical-editor`, // TBD
  experimentCodeEditorUrl: `https://ide.extremexp-icom.intracom-telecom.com/?folder=/home/user/workspace/`,
  experimentScheduleUrl: `https://dal.extremexp-icom.intracom-telecom.com/experiments`, // Documentation: https://app.swaggerhub.com/apis-docs/ExtremeXP/extremexp-dal/1.0.0

  // Workflow Editor Links
  workflowCodeEditorUrl: `${PLACEHOLDER_BASE}/workflow/code-editor`, // TBD

  // Observe & Analyze Links
  visualizationUrl: `${PLACEHOLDER_BASE}/visualization`, // TBD
  gamificationUrl: `https://i4dxp.eu/game/iframe/`,
  experimentCardUrl: `https://expcards.extremexp-icom.intracom-telecom.com/query_experiments_page`,

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
  // Management Links
  accessControlPolicyEditorUrl:
    import.meta.env.VITE_ACCESS_CONTROL_POLICY_EDITOR_URL || defaults.accessControlPolicyEditorUrl,
  dataManagementUploadAnnotateUrl:
    import.meta.env.VITE_DATA_MANAGEMENT_UPLOAD_ANNOTATE_URL || defaults.dataManagementUploadAnnotateUrl,

  // Experiment Editor Links
  experimentIntentUrl:
    import.meta.env.VITE_EXPERIMENT_INTENT_EDITOR_URL || defaults.experimentIntentUrl,
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
  visualizationUrl:
    import.meta.env.VITE_VISUALIZATION_URL || defaults.visualizationUrl,
  gamificationUrl:
    import.meta.env.VITE_GAMIFICATION_URL || defaults.gamificationUrl,
  experimentCardUrl:
    import.meta.env.VITE_EXPERIMENT_CARD_URL || defaults.experimentCardUrl,

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
 * Builds the URL for the experiment intent editor.
 * @param experimentId - The experiment identifier
 */
export function getExperimentIntentEditorUrl(experimentId: string | number): string {
  return buildUrl(externalLinks.experimentIntentUrl, { experimentId })
}

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
 * Builds the URL for the visualization dashboard.
 * @param experimentId - The experiment identifier
 */
export function getVisualizationUrl(experimentId: string | number): string {
  return buildUrl(externalLinks.workflowCodeEditorUrl, { experimentId })
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

// =============================================================================
// External Tool Route Configuration
// =============================================================================

/**
 * Enum of all external tool identifiers.
 * Used for type-safe routing and tool identification.
 */
export type ExternalToolId =
  | "access-control"
  | "data-management"
  | "experiment-intent-editor"
  | "experiment-graphical-editor"
  | "experiment-code-editor"
  | "experiment-schedule"
  | "workflow-code-editor"
  | "visualization"
  | "gamification"
  | "experiment-card"

/**
 * Configuration for an external tool route.
 */
export interface ExternalToolConfig {
  /** Unique identifier for the tool */
  id: ExternalToolId
  /** Display title shown in navbar */
  title: string
  /** Internal route path (e.g., "access-control" or "experiment/:experimentId/graphical-editor") */
  routePath: string
  /** Function to build the external URL */
  buildExternalUrl: (params?: Record<string, string>) => string
  /** Parameter names required for this tool (e.g., ["experimentId"]) */
  requiredParams?: string[]
}

/**
 * Registry of all external tools with their route configurations.
 */
export const externalTools: Record<ExternalToolId, ExternalToolConfig> = {
  // Management Tools (no params)
  "access-control": {
    id: "access-control",
    title: "Access Control Policy Editor",
    routePath: "access-control",
    buildExternalUrl: () => externalLinks.accessControlPolicyEditorUrl,
  },
  "data-management": {
    id: "data-management",
    title: "Data Management",
    routePath: "data-management",
    buildExternalUrl: () => externalLinks.dataManagementUploadAnnotateUrl,
  },

  // Experiment Tools (require experimentId)
  "experiment-intent-editor": {
    id: "experiment-intent-editor",
    title: "Intent Editor",
    routePath: "experiment/:experimentId/intent-editor",
    requiredParams: ["experimentId"],
    buildExternalUrl: (params) =>
      buildUrl(externalLinks.experimentIntentUrl, { experimentId: params?.experimentId }),
  },
  "experiment-graphical-editor": {
    id: "experiment-graphical-editor",
    title: "Graphical Editor",
    routePath: "experiment/:experimentId/graphical-editor",
    requiredParams: ["experimentId"],
    buildExternalUrl: (params) =>
      buildUrl(externalLinks.experimentGraphicalEditorUrl, { experimentId: params?.experimentId }),
  },
  "experiment-code-editor": {
    id: "experiment-code-editor",
    title: "Code Editor",
    routePath: "experiment/:experimentId/code-editor",
    requiredParams: ["experimentId"],
    buildExternalUrl: (params) =>
      buildUrl(externalLinks.experimentCodeEditorUrl, { experimentId: params?.experimentId }),
  },
  "experiment-schedule": {
    id: "experiment-schedule",
    title: "Schedule Experiment",
    routePath: "experiment/:experimentId/schedule",
    requiredParams: ["experimentId"],
    buildExternalUrl: (params) =>
      buildUrl(externalLinks.experimentScheduleUrl, { experimentId: params?.experimentId }),
  },

  // Workflow Tools (require workflowId)
  "workflow-code-editor": {
    id: "workflow-code-editor",
    title: "Workflow Code Editor",
    routePath: "workflow/:workflowId/code-editor",
    requiredParams: ["workflowId"],
    buildExternalUrl: (params) =>
      buildUrl(externalLinks.workflowCodeEditorUrl, { workflowId: params?.workflowId }),
  },

  // Observe & Analyze Tools (optional experimentId)
  visualization: {
    id: "visualization",
    title: "Visualization",
    routePath: "visualization/:experimentId?",
    buildExternalUrl: (params) =>
      params?.experimentId
        ? buildUrl(externalLinks.visualizationUrl, { experimentId: params.experimentId })
        : externalLinks.visualizationUrl,
  },
  gamification: {
    id: "gamification",
    title: "Gamification",
    routePath: "gamification/:experimentId?",
    buildExternalUrl: (params) =>
      params?.experimentId
        ? buildUrl(externalLinks.gamificationUrl, { experimentId: params.experimentId })
        : externalLinks.gamificationUrl,
  },
  "experiment-card": {
    id: "experiment-card",
    title: "Experiment Cards",
    routePath: "experiment-card/:experimentId?",
    buildExternalUrl: (params) =>
      params?.experimentId
        ? buildUrl(externalLinks.experimentCardUrl, { experimentId: params.experimentId })
        : externalLinks.experimentCardUrl,
  },
}

/**
 * Get the internal route path for an external tool.
 * @param toolId - The tool identifier
 * @param params - Route parameters (e.g., { experimentId: "123" })
 * @returns The internal route path (e.g., "/external/experiment/123/graphical-editor")
 */
export function getExternalToolRoute(
  toolId: ExternalToolId,
  params?: Record<string, string | number>
): string {
  const tool = externalTools[toolId]
  let path = `/${tool.routePath}`

  // Replace route parameters
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      path = path.replace(`:${key}?`, String(value))
      path = path.replace(`:${key}`, String(value))
    }
  }

  // Remove optional param placeholders that weren't provided
  path = path.replace(/\/:[^/]+\?/g, "")

  return path
}

/**
 * Find tool config by matching the current route path.
 * @param pathname - The current location pathname
 * @returns The matching tool config or undefined
 */
export function findToolByRoute(pathname: string): ExternalToolConfig | undefined {
  // Skip the root path
  if (pathname === "/") return undefined

  const relativePath = pathname.slice(1) // Remove leading slash

  for (const tool of Object.values(externalTools)) {
    // Convert route pattern to regex
    // Handle optional params - make the preceding slash optional too
    const pattern = tool.routePath
      .replace(/\/:[^/]+\?/g, "(?:/([^/]+))?") // Optional params with optional preceding slash
      .replace(/:[^/]+/g, "([^/]+)") // Required params

    const regex = new RegExp(`^${pattern}$`)
    if (regex.test(relativePath)) {
      return tool
    }
  }

  return undefined
}
