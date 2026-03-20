import {
  queryOptions,
  type DefaultError,
  type QueryClient,
} from '@tanstack/react-query';
import { fetchExperiment, fetchExperiments } from './api';
import type { DALExperiment } from './types';

/**
 * Query key factory for DAL experiments
 */
export const dalExperimentsKeys = {
  all: ['dal-experiments'] as const,
  list: () => [...dalExperimentsKeys.all, 'list'] as const,
  detail: (id: string) => [...dalExperimentsKeys.all, 'detail', id] as const,
};

/**
 * Query options for fetching all DAL experiments
 */
export const dalExperimentsListOptions = () =>
  queryOptions<DALExperiment[], DefaultError>({
    queryKey: dalExperimentsKeys.list(),
    queryFn: (context) => fetchExperiments({ signal: context.signal }),
  });

/**
 * Query options for fetching all DAL experiments with progressive cache updates
 */
export const dalExperimentsListProgressiveOptions = (queryClient: QueryClient) =>
  queryOptions<DALExperiment[], DefaultError>({
    queryKey: dalExperimentsKeys.list(),
    queryFn: async (context) => {
      const queryKey = dalExperimentsKeys.list();

      return fetchExperiments({
        signal: context.signal,
        onPage: (experiments) => {
          queryClient.setQueryData(queryKey, experiments);
        },
      });
    },
  });

/**
 * Query options for fetching a single DAL experiment by ID
 */
export const dalExperimentOptions = (experimentId: string) =>
  queryOptions<DALExperiment, DefaultError>({
    queryKey: dalExperimentsKeys.detail(experimentId),
    queryFn: () => fetchExperiment(experimentId),
    enabled: !!experimentId,
  });
