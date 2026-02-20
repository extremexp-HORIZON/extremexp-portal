import { externalLinks } from "./externalLinks"
import { resolveExternalLink } from "./externalLinkUtils"

export function buildUrl(baseUrl: string, params: Record<string, string | number | undefined>): string {
  return resolveExternalLink(baseUrl, params)
}

export function getExperimentIntentEditorUrl(experimentId: string | number): string {
  return buildUrl(externalLinks.experimentIntentUrl, { experimentId })
}

export function getExperimentGraphicalEditorUrl(experimentId: string | number): string {
  return buildUrl(externalLinks.experimentGraphicalEditorUrl, { experimentId })
}

export function getExperimentCodeEditorUrl(experimentId: string | number): string {
  return buildUrl(externalLinks.experimentCodeEditorUrl, { experimentId })
}

export function getExperimentScheduleUrl(experimentId: string | number): string {
  return buildUrl(externalLinks.experimentScheduleUrl, { experimentId })
}

export function getWorkflowCodeEditorUrl(workflowId: string | number): string {
  return buildUrl(externalLinks.workflowCodeEditorUrl, { workflowId })
}

export function getVisualizationUrl(experimentId: string | number): string {
  return buildUrl(externalLinks.visualizationUrl, { experimentId })
}

export function getGamificationUrl(experimentId: string | number): string {
  return buildUrl(externalLinks.gamificationUrl, { experimentId })
}

export function getExperimentCardUrl(experimentId: string | number): string {
  return buildUrl(externalLinks.experimentCardUrl, { experimentId })
}