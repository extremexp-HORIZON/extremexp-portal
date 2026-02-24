import type { ExperimentRead } from "../client/types.gen"

// ============================================================================
// ACTION AVAILABILITY LOGIC
// ============================================================================
// These functions determine when action buttons should be disabled.
// Edit these functions to change the business logic for action availability.
// ============================================================================

/**
 * Checks if an experiment has any defined steps.
 *
 * Steps represent the code-based workflow definition. When steps are present,
 * the experiment was defined programmatically (via code editor).
 */
export function hasSteps(experiment: ExperimentRead): boolean {
  return Array.isArray(experiment.steps) && experiment.steps.length > 0
}

/**
 * Checks if an experiment has a non-empty graphical model.
 *
 * A graphical model is considered "non-empty" if it has at least one node.
 * Edges alone are not sufficient since they require nodes to connect.
 */
export function hasGraphicalModel(experiment: ExperimentRead): boolean {
  const model = experiment.graphical_model
  if (!model || typeof model !== "object") return false
  const nodes = (model as { nodes?: unknown[] }).nodes
  return Array.isArray(nodes) && nodes.length > 0
}

/**
 * Determines if the "Run/Schedule" action should be disabled.
 *
 * RULE: An experiment can only be run if it has some definition.
 * Either steps (code-based) OR a graphical model must be present.
 *
 * @returns true if the action should be DISABLED
 */
export function isScheduleDisabled(experiment: ExperimentRead): boolean {
  // Disable if the experiment has neither steps nor a graphical model
  return !hasSteps(experiment) && !hasGraphicalModel(experiment)
}

/**
 * Determines if the "Intent Editor" action should be disabled.
 *
 * RULE: If an experiment has steps defined (code-based definition),
 * opening the intent editor would cause confusion or data loss.
 * Users should use the code/graphical editors instead.
 *
 * @returns true if the action should be DISABLED
 */
export function isIntentEditorDisabled(experiment: ExperimentRead): boolean {
  // Disable if steps are present (experiment is code-defined)
  return hasSteps(experiment)
}

/**
 * Returns whether a specific action should be disabled for an experiment.
 *
 * Add new action disable rules here as the project evolves.
 *
 * @param action - The action identifier (e.g., "schedule", "intent_editor")
 * @param experiment - The experiment to check
 * @returns true if the action should be DISABLED, false otherwise
 */
export function isActionDisabled(action: string, experiment: ExperimentRead): boolean {
  switch (action) {
    case "schedule":
      return isScheduleDisabled(experiment)
    case "intent_editor":
      return isIntentEditorDisabled(experiment)
    default:
      // All other actions are always enabled
      return false
  }
}
