import { useQuery } from '@tanstack/react-query';
import { dalExperimentsListOptions, useDALToken, type DALExperiment } from '../dal-client';
import DALTokenPrompt from './DALTokenPrompt';

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
    label: 'View run overview',
    path: 'M4 5a1 1 0 011-1h10a1 1 0 011 1v10H4V5zm-1 12h14v2H3v-2zm9-6H9v2h3v-2zm2-6h-2v2h2V5zM9 5H7v2h2V5z',
  },
  {
    label: 'Inspect run details',
    path: 'M5 3h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm0 2v10h10V5H5zm2 2h6v2H7V7zm0 4h6v2H7v-2z',
  },
  {
    label: 'Delete run',
    path: 'M6 7h12l-1 12H7L6 7zm5-3h2l1 1h5v2H4V5h5l1-1z',
  },
];

function FilterIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-3.5 text-neutral-400"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      viewBox="0 0 20 20"
    >
      <path
        d="M3 5h14M6 10h8M9 15h4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-3 text-neutral-400"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      viewBox="0 0 12 12"
    >
      <path
        d="M3 4l3-3 3 3M3 8l3 3 3-3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

function ActionIconButton({ label, path }: { label: string; path: string }) {
  return (
    <button
      type="button"
      className="join-item btn btn-ghost btn-circle btn-sm text-info hover:bg-info/10"
      aria-label={label}
    >
      <svg aria-hidden="true" className="size-4" viewBox="0 0 20 20" fill="currentColor">
        <path d={path} />
      </svg>
    </button>
  );
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
 * Format date string for display
 */
function formatDateTime(dateString: string | undefined): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return dateString;
  }
}

/**
 * Calculate duration between start and end dates
 */
function calculateDuration(start: string | undefined, end: string | undefined): string {
  if (!start) return '—';

  try {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();

    const diffMs = endDate.getTime() - startDate.getTime();
    if (diffMs < 0) return '—';

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } catch {
    return '—';
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
        <table className="table w-full">
          <thead className="bg-success/10 text-xs font-semibold uppercase tracking-wide text-neutral-600">
            <tr>
              <th className="w-12 text-center">#</th>
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
                <td className="text-center">
                  <div className="skeleton h-4 w-4 mx-auto" />
                </td>
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
  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-lg border border-base-200">
        <table className="table w-full">
          <thead className="bg-success/10 text-xs font-semibold uppercase tracking-wide text-neutral-600">
            <tr>
              <th className="w-12 text-center">#</th>
              <th>
                <span className="flex items-center gap-2">
                  Name
                  <FilterIcon />
                </span>
              </th>
              <th>
                <span className="flex items-center gap-2">
                  Status
                  <FilterIcon />
                </span>
              </th>
              <th>
                <span className="flex items-center gap-2">
                  Started Time
                  <FilterIcon />
                  <SortIcon />
                </span>
              </th>
              <th>
                <span className="flex items-center gap-2">
                  Duration
                  <SortIcon />
                </span>
              </th>
              <th>
                <span className="flex items-center gap-2">Progress</span>
              </th>
              <th>
                <span className="flex items-center gap-2">
                  Intent
                  <FilterIcon />
                </span>
              </th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody className="text-sm text-neutral-700">
            {experiments.map((experiment, index) => {
              const progress = getProgress(experiment);
              return (
                <tr key={experiment.id} className="hover:bg-base-200/60">
                  <td className="text-center text-neutral-500">{index + 1}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-link px-0 text-sm text-info no-underline text-left"
                    >
                      {experiment.name || experiment.id}
                    </button>
                  </td>
                  <td>
                    <StatusBadge status={experiment.status} />
                  </td>
                  <td>{formatDateTime(experiment.start)}</td>
                  <td>{calculateDuration(experiment.start, experiment.end)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <progress
                        className="progress progress-info w-24"
                        value={progress}
                        max={100}
                        aria-label={`${progress}% progress`}
                      />
                      <span className="text-xs font-semibold text-neutral-600">{progress}%</span>
                    </div>
                  </td>
                  <td>{experiment.intent || '—'}</td>
                  <td>
                    <div className="join justify-end">
                      {ACTION_ICONS.map((icon) => (
                        <ActionIconButton key={icon.label} {...icon} />
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination - commented out for now
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-neutral-500">1-{experiments.length} of {experiments.length} items</p>
        <div className="flex flex-wrap items-center gap-4">
          <div className="join">
            <button type="button" className="join-item btn btn-sm" aria-label="Previous page">
              «
            </button>
            <button type="button" className="join-item btn btn-sm btn-active">
              1
            </button>
            <button type="button" className="join-item btn btn-sm" aria-label="Next page">
              »
            </button>
          </div>
          <button type="button" className="btn btn-sm w-24 justify-between gap-2 normal-case">
            <span>10/page</span>
            <svg
              aria-hidden="true"
              className="size-4 text-neutral-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 20 20"
            >
              <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      */}

      {/* Simple count display */}
      <div className="flex justify-end">
        <p className="text-sm text-neutral-500">
          Showing {experiments.length} experiment{experiments.length !== 1 ? 's' : ''}
        </p>
      </div>
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
          <div
            role="tablist"
            aria-label="Define and run tabs"
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
        </header>

        <ExperimentsContent />
      </div>
    </section>
  );
}
