import { externalLinks } from "./externalLinks"
import { resolveExternalLink, type ExternalLinkParams } from "./externalLinkUtils"

type ExperimentLinkContext = Pick<ExternalLinkParams, "experimentName">
type WorkflowLinkContext = Pick<ExternalLinkParams, "workflowName">

export function buildUrl(baseUrl: string, params: ExternalLinkParams = {}): string {
  return resolveExternalLink(baseUrl, params)
}

export function getExperimentRunUrl(): string {
  return externalLinks.experimentRunUrl
}

export function getExperimentIntentEditorUrl(
  experimentId: string | number,
  context: ExperimentLinkContext = {}
): string {
  return buildUrl(externalLinks.experimentIntentUrl, { experimentId, ...context })
}

export function getExperimentGraphicalEditorUrl(
  experimentId: string | number,
  context: ExperimentLinkContext = {}
): string {
  return buildUrl(externalLinks.experimentGraphicalEditorUrl, { experimentId, ...context })
}

export function getExperimentCodeEditorUrl(
  experimentId: string | number,
  context: ExperimentLinkContext = {}
): string {
  return buildUrl(externalLinks.experimentCodeEditorUrl, { experimentId, ...context })
}

export function getWorkflowCodeEditorUrl(
  workflowId: string | number,
  context: WorkflowLinkContext = {}
): string {
  return buildUrl(externalLinks.workflowCodeEditorUrl, { workflowId, ...context })
}

export function getWorkflowGraphicalEditorUrl(
    workflowId: string | number,
    context: WorkflowLinkContext = {}
): string {
  return buildUrl(externalLinks.workflowGraphicalEditorUrl, { workflowId, ...context })
}

export function getVisualizationUrl(
  experimentId?: string | number,
  context: ExperimentLinkContext = {}
): string {
  return buildUrl(externalLinks.visualizationUrl, { experimentId, ...context })
}

export function getGamificationUrl(
  experimentId?: string | number,
  context: ExperimentLinkContext = {}
): string {
  return buildUrl(externalLinks.gamificationUrl, { experimentId, ...context })
}

export function getExperimentCardUrl(
  experimentId?: string | number,
  context: ExperimentLinkContext = {}
): string {
  return buildUrl(externalLinks.experimentCardUrl, { experimentId, ...context })
}
