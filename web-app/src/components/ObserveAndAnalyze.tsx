import { useQuery } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { dalExperimentsListOptions, useDALToken, type DALExperiment } from '../dal-client';
import DALTokenPrompt from './DALTokenPrompt';
import Pagination, { PAGE_SIZE } from './Pagination';
import { useSearchFilterStore, createNameFilter } from '../stores/useSearchFilterStore';
import { useSortStore, sortItems } from '../stores/useSortStore';
import SortableHeader from './SortableHeader';
import TimeDisplay from './TimeDisplay';
import DurationDisplay from './DurationDisplay';
import { useResettablePagination } from '../hooks';
import { externalLinks, getGamificationUrl, getExperimentCardUrl, type ExternalToolId } from '../config';
import { ExternalLinkButton } from './ExternalLinkButton';

/** Context key for DAL experiments table sorting */
const SORT_CONTEXT = "dalExperiments";

/** Map action names to external tool IDs */
const ACTION_TO_TOOL_ID: Record<string, ExternalToolId> = {
  gamification: "gamification",
  experiment_card: "experiment-card",
};

type ExperimentStatus = 'Completed' | 'Running' | 'Error' | 'Pending' | 'Unknown';

const STATUS_STYLES: Record<
  ExperimentStatus,
  { dotClass: string; textClass: string }
> = {
  Completed: {
    dotClass: 'bg-success',
    textClass: 'text-success',
  },
  Running: {
    dotClass: 'bg-info',
    textClass: 'text-info',
  },
  Error: {
    dotClass: 'bg-error',
    textClass: 'text-error',
  },
  Pending: {
    dotClass: 'bg-warning',
    textClass: 'text-warning',
  },
  Unknown: {
    dotClass: 'bg-neutral-400',
    textClass: 'text-neutral-400',
  },
};

const ACTION_ICONS = [
  {
    label: 'Gamification',
    action: 'gamification',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="21" x2="9" y2="9" />
      </svg>
    ),
  },
  {
    label: 'Experiment card',
    action: 'experiment_card',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="7" y1="8" x2="17" y2="8" />
        <line x1="7" y1="12" x2="17" y2="12" />
        <line x1="7" y1="16" x2="13" y2="16" />
      </svg>
    ),
  },
  {
    label: 'Delete run',
    action: 'delete',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
    ),
  },
];

function StatusBadge({ status }: { status: string }) {
  // Normalize status to our known statuses
  const normalizedStatus = normalizeStatus(status);
  const { dotClass, textClass } = STATUS_STYLES[normalizedStatus];

  return (
    <span className={`inline-flex items-center gap-2 text-sm font-medium ${textClass}`}>
      <span className={`size-2.5 rounded-full ${dotClass}`} aria-hidden="true" />
      {status || 'Unknown'}
    </span>
  );
}

function ActionIconButton({
  label,
  icon,
  onClick,
  toolId,
  params,
  externalUrl,
}: {
  label: string
  icon: React.ReactNode
  onClick?: () => void
  toolId?: ExternalToolId
  params?: Record<string, string | number>
  externalUrl?: string
}) {
  const className = "inline-flex size-8 items-center justify-center rounded-md text-info transition hover:bg-info/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info/60 cursor-pointer"

  if (toolId && externalUrl) {
    return (
      <ExternalLinkButton
        toolId={toolId}
        params={params}
        externalUrl={externalUrl}
        className={className}
        aria-label={label}
      >
        <span className="size-4 [&>svg]:size-full">
          {icon}
        </span>
      </ExternalLinkButton>
    )
  }

  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      onClick={onClick}
    >
      <span className="size-4 [&>svg]:size-full">
        {icon}
      </span>
    </button>
  )
}

/**
 * Normalize DAL status to our known status types
 */
function normalizeStatus(status: string | undefined): ExperimentStatus {
  if (!status) return 'Unknown';

  const normalized = status.toLowerCase();
  if (normalized === 'completed' || normalized === 'finished' || normalized === 'done') {
    return 'Completed';
  }
  if (normalized === 'running' || normalized === 'in_progress' || normalized === 'executing') {
    return 'Running';
  }
  if (normalized === 'error' || normalized === 'failed' || normalized === 'failure') {
    return 'Error';
  }
  if (normalized === 'pending' || normalized === 'queued' || normalized === 'waiting') {
    return 'Pending';
  }
  return 'Unknown';
}

/**
 * Calculate duration in milliseconds between start and end.
 * If end is missing, uses current time (matches display behavior).
 */
function calculateDurationMs(start: string | undefined, end: string | undefined): number | null {
  if (!start) return null;

  try {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();

    const startMs = startDate.getTime();
    const endMs = endDate.getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) return null;

    const diffMs = endMs - startMs;
    if (diffMs < 0) return null;

    return diffMs;
  } catch {
    return null;
  }
}

/**
 * Calculate progress percentage based on status
 */
function getProgress(experiment: DALExperiment): number {
  const status = normalizeStatus(experiment.status);
  if (status === 'Completed') return 100;
  if (status === 'Error') return 0;
  if (status === 'Pending') return 0;
  if (status === 'Running') return 50; // We don't have actual progress info from DAL
  return 0;
}

/**
 * Loading skeleton for the experiments table
 */
function ExperimentsTableSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-lg border border-base-200">
        <table className="table table-compact w-full">
          <thead className="bg-success/10 text-xs font-medium uppercase tracking-wide text-neutral-600">
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Started Time</th>
              <th>Duration</th>
              <th>Progress</th>
              <th>Intent</th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} className="animate-pulse">
                <td>
                  <div className="skeleton h-4 w-32" />
                </td>
                <td>
                  <div className="skeleton h-4 w-20" />
                </td>
                <td>
                  <div className="skeleton h-4 w-36" />
                </td>
                <td>
                  <div className="skeleton h-4 w-20" />
                </td>
                <td>
                  <div className="skeleton h-4 w-28" />
                </td>
                <td>
                  <div className="skeleton h-4 w-24" />
                </td>
                <td>
                  <div className="flex justify-end gap-1">
                    <div className="skeleton h-8 w-8 rounded-full" />
                    <div className="skeleton h-8 w-8 rounded-full" />
                    <div className="skeleton h-8 w-8 rounded-full" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Error display component
 */
function ExperimentsError({
  error,
  onRetry,
  onClearToken,
}: {
  error: Error;
  onRetry: () => void;
  onClearToken: () => void;
}) {
  // Check if it's likely an auth error (401/403)
  const isAuthError =
    error.message.includes('401') ||
    error.message.includes('403') ||
    error.message.includes('Unauthorized') ||
    error.message.includes('Forbidden');

  // Check if it's a timeout or network error
  const isNetworkError =
    error.message.includes('timeout') ||
    error.message.includes('TimeoutError') ||
    error.message.includes('network') ||
    error.message.includes('fetch');

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 px-4">
      <div className="rounded-full bg-error/20 p-4">
        <svg
          className="size-8 text-error"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
      </div>

      <div className="text-center">
        <h3 className="text-lg font-semibold text-neutral-900">
          {isAuthError
            ? 'Authentication Failed'
            : isNetworkError
              ? 'Connection Error'
              : 'Failed to Load Experiments'}
        </h3>
        <p className="mt-1 max-w-sm text-sm text-neutral-600">
          {isAuthError
            ? 'Your access token may be invalid or expired. Please try with a new token.'
            : isNetworkError
              ? 'Could not connect to the DAL server. Please check your network connection and try again.'
              : error.message || 'An unexpected error occurred while fetching experiments.'}
        </p>
      </div>

      <div className="flex gap-2">
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          <svg
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
          Retry
        </button>

        {isAuthError && (
          <button type="button" className="btn btn-outline" onClick={onClearToken}>
            <svg
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
              />
            </svg>
            Use Different Token
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Empty state when no experiments are found
 */
function ExperimentsEmpty() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 px-4">
      <div className="rounded-full bg-base-200 p-4">
        <svg
          className="size-8 text-neutral-400"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611l-.628.105a9 9 0 01-2.507 0l-.628-.105c-1.717-.293-2.3-2.379-1.067-3.611L19.8 15.3"
          />
        </svg>
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-neutral-900">No Experiments Found</h3>
        <p className="mt-1 text-sm text-neutral-600">
          There are no experiments available in the DAL at this time.
        </p>
      </div>
    </div>
  );
}

/**
 * Experiments table with real data
 */
function ExperimentsTable({ experiments }: { experiments: DALExperiment[] }) {
  // Get filter from global store
  const filterText = useSearchFilterStore((state) => state.filterText);

  // Get sort from global store
  const sortConfig = useSortStore((state) => state.sorts[SORT_CONTEXT]);
  const resetKey = useMemo(
    () => `${filterText}::${sortConfig?.key ?? ""}::${sortConfig?.direction ?? ""}`,
    [filterText, sortConfig?.key, sortConfig?.direction],
  );
  const [currentPage, setCurrentPage] = useResettablePagination(resetKey);
  const toggleSort = useSortStore((state) => state.toggleSort);

  // Handler for sort toggle
  const handleSort = useCallback(
    (key: string) => toggleSort(SORT_CONTEXT, key),
    [toggleSort]
  );

  // Filter experiments by name using the global search filter
  // Also add computed progress field for sorting
  const filteredExperiments = useMemo(() => {
    const nameFilter = createNameFilter(filterText);
    return experiments
      .filter((exp) => nameFilter(exp.name || exp.id))
      .map((exp) => ({
        ...exp,
        progress: getProgress(exp),
        durationMs: calculateDurationMs(exp.start, exp.end),
      }));
  }, [experiments, filterText]);

  // Sort filtered experiments
  const sortedExperiments = useMemo(
    () => sortItems(filteredExperiments, sortConfig),
    [filteredExperiments, sortConfig]
  );

  // Paginate sorted experiments
  const paginatedExperiments = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return sortedExperiments.slice(startIndex, startIndex + PAGE_SIZE);
  }, [sortedExperiments, currentPage]);

  /**
   * Get the external link info for an action
   */
  const getExternalLinkInfo = (action: string, experiment: DALExperiment) => {
    const toolId = ACTION_TO_TOOL_ID[action];
    if (!toolId) return undefined;

    const params = { experimentId: String(experiment.id) };
    let externalUrl: string;

    switch (action) {
      case "gamification":
        externalUrl = getGamificationUrl(experiment.id);
        break;
      case "experiment_card":
        externalUrl = getExperimentCardUrl(experiment.id);
        break;
      default:
        return undefined;
    }

    return { toolId, params, externalUrl };
  };

  /**
   * Handle non-link actions
   */
  const handleAction = (action: string, _experiment: DALExperiment) => {
    switch (action) {
      case "gamification":
      case "experiment_card":
        // Handled via href
        break;
      default:
        console.log(`Action ${action} not implemented yet`);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-lg border border-base-200">
        <table className="table table-compact w-full">
          <thead className="bg-success/10 text-xs font-medium uppercase tracking-wide text-neutral-600">
            <tr>
              <th>
                <SortableHeader
                  label="Name"
                  sortKey="name"
                  currentDirection={sortConfig?.key === "name" ? sortConfig.direction : null}
                  onSort={handleSort}
                />
              </th>
              <th>
                <SortableHeader
                  label="Status"
                  sortKey="status"
                  currentDirection={sortConfig?.key === "status" ? sortConfig.direction : null}
                  onSort={handleSort}
                />
              </th>
              <th>
                <SortableHeader
                  label="Started Time"
                  sortKey="start"
                  currentDirection={sortConfig?.key === "start" ? sortConfig.direction : null}
                  onSort={handleSort}
                />
              </th>
              <th>
                <SortableHeader
                  label="Duration"
                  sortKey="durationMs"
                  currentDirection={sortConfig?.key === "durationMs" ? sortConfig.direction : null}
                  onSort={handleSort}
                />
              </th>
              <th>
                <SortableHeader
                  label="Progress"
                  sortKey="progress"
                  currentDirection={sortConfig?.key === "progress" ? sortConfig.direction : null}
                  onSort={handleSort}
                />
              </th>
              <th>
                <SortableHeader
                  label="Intent"
                  sortKey="intent"
                  currentDirection={sortConfig?.key === "intent" ? sortConfig.direction : null}
                  onSort={handleSort}
                />
              </th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody className="text-sm text-neutral-700">
            {filteredExperiments.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-neutral-500">
                  No experiments match your filter. Try adjusting your search.
                </td>
              </tr>
            ) : (
              paginatedExperiments.map((experiment) => (
                <tr key={experiment.id} className="hover:bg-base-200/60">
                  <td>
                    <button
                      type="button"
                      className="btn btn-link text-sm text-neutral"
                    >
                      {experiment.name || experiment.id}
                    </button>
                  </td>
                  <td>
                    <StatusBadge status={experiment.status} />
                  </td>
                  <td>
                    <TimeDisplay time={experiment.start} />
                  </td>
                  <td>
                    <DurationDisplay start={experiment.start} end={experiment.end} />
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <progress
                        className="progress progress-info w-24"
                        value={experiment.progress}
                        max={100}
                        aria-label={`${experiment.progress}% progress`}
                      />
                      <span className="text-xs font-semibold text-neutral-600">{experiment.progress}%</span>
                    </div>
                  </td>
                  <td>{experiment.intent || '—'}</td>
                  <td>
                    <div className="flex justify-end gap-1.5">
                      {ACTION_ICONS.map((icon) => {
                        const linkInfo = getExternalLinkInfo(icon.action, experiment);
                        return (
                          <ActionIconButton
                            key={icon.label}
                            label={icon.label}
                            icon={icon.icon}
                            toolId={linkInfo?.toolId}
                            params={linkInfo?.params}
                            externalUrl={linkInfo?.externalUrl}
                            onClick={() => handleAction(icon.action, experiment)}
                          />
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        totalItems={filteredExperiments.length}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}

/**
 * Main content component that handles token state and data fetching
 */
function ExperimentsContent() {
  const [token, setToken, clearToken] = useDALToken();

  // Only fetch when we have a token
  const {
    data: experiments,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    ...dalExperimentsListOptions(),
    enabled: !!token,
    retry: 1, // Only retry once on failure
    staleTime: 30_000, // Consider data fresh for 30 seconds
  });

  // No token - show prompt
  if (!token) {
    return <DALTokenPrompt onTokenSet={setToken} />;
  }

  // Loading state
  if (isLoading) {
    return <ExperimentsTableSkeleton />;
  }

  // Error state
  if (isError && error) {
    return (
      <ExperimentsError
        error={error}
        onRetry={() => refetch()}
        onClearToken={clearToken}
      />
    );
  }

  // Empty state
  if (!experiments || experiments.length === 0) {
    return <ExperimentsEmpty />;
  }

  // Success - show table
  return <ExperimentsTable experiments={experiments} />;
}

export default function ObserveAndAnalyze() {
  return (
    <section
      className="card rounded-[20px] bg-base-100 shadow-sm"
      data-tour="observe-and-analyze"
    >
      <div className="card-body gap-3 p-6">
        <header className="flex flex-col gap-4">
          <h2 className="text-2xl font-semibold leading-tight text-neutral-900">
            Observe &amp; analyze
          </h2>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div
              role="tablist"
              aria-label="Observe and analyze tabs"
              className="tabs tabs-border"
            >
              <button
                key="experiments-tab"
                type="button"
                role="tab"
                aria-selected={true}
                aria-controls="experiments-panel"
                id="experiments-tab"
                className="tab px-7 tab-active text-blue-500"
              >
                Experiments
              </button>
            </div>
            <div className="flex gap-2">
              <ExternalLinkButton
                toolId="gamification"
                externalUrl={externalLinks.gamificationUrl}
                className="btn rounded-lg border-none bg-[#46A3FF] hover:bg-[#3B8EDB] text-white"
              >
                <svg
                  className="size-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="8" r="6" />
                  <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                </svg>
                Gamification
              </ExternalLinkButton>
              <ExternalLinkButton
                toolId="experiment-card"
                externalUrl={externalLinks.experimentCardUrl}
                className="btn rounded-lg border-none bg-[#46A3FF] hover:bg-[#3B8EDB] text-white"
              >
                <svg
                  className="size-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="3" y1="15" x2="21" y2="15" />
                  <line x1="12" y1="3" x2="12" y2="21" />
                </svg>
                Cards
              </ExternalLinkButton>
            </div>
          </div>
        </header>

        <ExperimentsContent />
      </div>
    </section>
  );
}
