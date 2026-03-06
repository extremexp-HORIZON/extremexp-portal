/**
 * DAL API Types - Experiment related types
 *
 * Based on the DAL API Postman collection responses
 */

/**
 * DAL Experiment (minimal structure from API response)
 */
export interface DALExperiment {
  id: string;
  name: string;
  status: string;
  workflow_ids: string[];
  start?: string;
  end?: string;
  model?: string;
  intent?: string;
  comment?: string;
  metadata?: Record<string, unknown>;
  modelJSON?: DALModelJSON;
}

/**
 * Parsed DSL model as JSON (when model attribute is present)
 */
export interface DALModelJSON {
  package: {
    name: string | null;
    components: Array<{
      workflow?: DALWorkflowComponent;
      assembledWorkflow?: unknown;
      experiment?: unknown;
    }>;
  };
  task?: unknown;
}

export interface DALWorkflowComponent {
  name: string;
  tasks: Array<{ name: string }>;
  data: Array<{
    name: string;
    output: boolean;
    input: boolean;
    assigned: boolean;
    values: unknown[];
  }>;
  operators: unknown[];
  dataConfigs: unknown[];
  taskConfigs: Array<{
    alias: { name: string };
    params: unknown[];
    implementations: Array<{
      workflow: unknown;
      filename: string;
    }>;
    dependencies: unknown[];
    subTaskConfigs: unknown[];
    metrics: unknown[];
  }>;
  nodeLinks: Array<{
    started: boolean;
    nodes: Array<{ name: string }>;
    ended: boolean;
  }>;
  dataLinks: unknown[];
  metrics: unknown[];
  conditionalLinks: unknown[];
}

/**
 * Response from GET /experiments/
 */
export interface DALExperimentsListResponse {
  experiments: Array<Record<string, DALExperiment>>;
}

/**
 * Response from paginated GET /experiments/
 */
export interface DALExperimentsPaginatedResponse extends DALExperimentsListResponse {
  prev?: string | null;
  next?: string | null;
  page?: number;
}

/**
 * Response from GET /experiments/:id
 */
export interface DALExperimentResponse {
  experiment: DALExperiment;
}
