import { buildUrl } from "./externalLinkBuilders"
import { externalLinks } from "./externalLinks"

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

export interface ExternalToolConfig {
  id: ExternalToolId
  title: string
  routePath: string
  buildExternalUrl: (params?: Record<string, string>) => string
  requiredParams?: string[]
}

export const externalTools: Record<ExternalToolId, ExternalToolConfig> = {
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

  "workflow-code-editor": {
    id: "workflow-code-editor",
    title: "Workflow Code Editor",
    routePath: "workflow/:workflowId/code-editor",
    requiredParams: ["workflowId"],
    buildExternalUrl: (params) =>
      buildUrl(externalLinks.workflowCodeEditorUrl, { workflowId: params?.workflowId }),
  },

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

export function getExternalToolRoute(
  toolId: ExternalToolId,
  params?: Record<string, string | number>
): string {
  const tool = externalTools[toolId]
  let path = `/${tool.routePath}`

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      path = path.replace(`:${key}?`, String(value))
      path = path.replace(`:${key}`, String(value))
    }
  }

  path = path.replace(/\/:[^/]+\?/g, "")

  return path
}

export function findToolByRoute(pathname: string): ExternalToolConfig | undefined {
  if (pathname === "/") return undefined

  const relativePath = pathname.slice(1)

  for (const tool of Object.values(externalTools)) {
    const pattern = tool.routePath
      .replace(/\/:[^/]+\?/g, "(?:/([^/]+))?")
      .replace(/:[^/]+/g, "([^/]+)")

    const regex = new RegExp(`^${pattern}$`)
    if (regex.test(relativePath)) {
      return tool
    }
  }

  return undefined
}