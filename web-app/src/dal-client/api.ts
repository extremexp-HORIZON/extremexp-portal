import { getDALClient } from './client';
import type {
  DALExperiment,
  DALExperimentResponse,
  DALExperimentsListResponse,
  DALExperimentsPaginatedResponse,
} from './types';

interface FetchExperimentsOptions {
  signal?: AbortSignal;
  onPage?: (experiments: DALExperiment[]) => void;
}

const flattenExperiments = (response: DALExperimentsListResponse): DALExperiment[] => {
  return response.experiments.map((experimentObj) => {
    const experiment = Object.values(experimentObj)[0];
    return experiment;
  });
};

const normalizeExperimentsPagePath = (nextPagePath: string): string => {
  if (nextPagePath.startsWith('?')) {
    return `experiments/${nextPagePath}`;
  }

  const withoutDomain = nextPagePath.startsWith('http://') || nextPagePath.startsWith('https://')
    ? new URL(nextPagePath).pathname + new URL(nextPagePath).search
    : nextPagePath;

  const withoutLeadingSlash = withoutDomain.replace(/^\//, '');
  const withoutApiPrefix = withoutLeadingSlash.replace(/^api\//, '');

  if (withoutApiPrefix.startsWith('experiments/')) {
    return withoutApiPrefix;
  }

  if (withoutApiPrefix.startsWith('experiments?')) {
    return withoutApiPrefix.replace(/^experiments\?/, 'experiments/?');
  }

  return withoutApiPrefix;
};

/**
 * Fetch all experiments from the DAL API
 *
 * @returns Array of experiments (flattened from the API's nested format)
 */
export const fetchExperiments = async (
  options: FetchExperimentsOptions = {},
): Promise<DALExperiment[]> => {
  const client = getDALClient();
  const allExperiments: DALExperiment[] = [];
  let path = 'experiments/';

  while (path) {
    const response = await client
      .get(path, { signal: options.signal })
      .json<DALExperimentsListResponse | DALExperimentsPaginatedResponse>();

    const pageExperiments = flattenExperiments(response);
    allExperiments.push(...pageExperiments);
    options.onPage?.([...allExperiments]);

    const nextPagePath =
      'next' in response && typeof response.next === 'string' ? response.next : undefined;
    path = nextPagePath ? normalizeExperimentsPagePath(nextPagePath) : '';
  }

  return allExperiments;
};

/**
 * Fetch a single experiment by ID from the DAL API
 *
 * @param experimentId - The experiment ID
 * @returns The experiment
 */
export const fetchExperiment = async (experimentId: string): Promise<DALExperiment> => {
  const client = getDALClient();
  const response = await client.get(`experiments/${experimentId}`).json<DALExperimentResponse>();
  return response.experiment;
};
