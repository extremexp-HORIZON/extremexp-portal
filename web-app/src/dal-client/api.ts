import { getDALClient } from './client';
import type { DALExperiment, DALExperimentResponse, DALExperimentsListResponse } from './types';

/**
 * Fetch all experiments from the DAL API
 *
 * @returns Array of experiments (flattened from the API's nested format)
 */
export const fetchExperiments = async (): Promise<DALExperiment[]> => {
  const client = getDALClient();
  const response = await client.get('experiments/').json<DALExperimentsListResponse>();

  // The API returns experiments as an array of { [id]: experiment } objects
  // We flatten this to a simple array of experiments
  return response.experiments.map((experimentObj) => {
    const experiment = Object.values(experimentObj)[0];
    return experiment;
  });
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
