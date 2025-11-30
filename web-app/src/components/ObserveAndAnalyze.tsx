const TABLE_ROWS = [
  {
    id: 1,
    name: "Exp_1_1_25-02-05",
    status: "Completed",
    startedTime: "2025-02-05 08:28:36",
    duration: "00:12:36",
    progress: 100,
    intent: "Regression",
    linkedDefinition: "Experiment 1",
  },
  {
    id: 2,
    name: "Exp_1_2_25-02-03",
    status: "Running",
    startedTime: "2025-02-03 19:49:33",
    duration: "00:25:07",
    progress: 28,
    intent: "Regression",
    linkedDefinition: "Experiment 4",
  },
  {
    id: 3,
    name: "Exp_2_1_25-02-02",
    status: "Error",
    startedTime: "2025-02-02 19:17:15",
    duration: "00:18:10",
    progress: 40,
    intent: "Classification",
    linkedDefinition: "Experiment 2",
  },
  {
    id: 4,
    name: "Exp_3_1_25-02-02",
    status: "Completed",
    startedTime: "2025-02-02 09:46:33",
    duration: "00:30:15",
    progress: 100,
    intent: "Regression",
    linkedDefinition: "Experiment 3",
  },
  {
    id: 5,
    name: "Exp_5_25-02-02",
    status: "Running",
    startedTime: "2025-02-02 07:57:01",
    duration: "00:17:15",
    progress: 50,
    intent: "Classification",
    linkedDefinition: "Experiment 5",
  },
]

type ExperimentStatus = (typeof TABLE_ROWS)[number]["status"]

const STATUS_STYLES: Record<
  ExperimentStatus,
  { dotClass: string; textClass: string }
> = {
  Completed: {
    dotClass: "bg-success",
    textClass: "text-success",
  },
  Running: {
    dotClass: "bg-info",
    textClass: "text-info",
  },
  Error: {
    dotClass: "bg-error",
    textClass: "text-error",
  },
}

const ACTION_ICONS = [
  {
    label: "View run overview",
    path: "M4 5a1 1 0 011-1h10a1 1 0 011 1v10H4V5zm-1 12h14v2H3v-2zm9-6H9v2h3v-2zm2-6h-2v2h2V5zM9 5H7v2h2V5z",
  },
  {
    label: "Inspect run details",
    path: "M5 3h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm0 2v10h10V5H5zm2 2h6v2H7V7zm0 4h6v2H7v-2z",
  },
  {
    label: "Delete run",
    path: "M6 7h12l-1 12H7L6 7zm5-3h2l1 1h5v2H4V5h5l1-1z",
  },
]

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
  )
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
  )
}

function StatusBadge({ status }: { status: ExperimentStatus }) {
  const { dotClass, textClass } = STATUS_STYLES[status]

  return (
    <span className={`inline-flex items-center gap-2 text-sm font-medium ${textClass}`}>
      <span className={`size-2.5 rounded-full ${dotClass}`} aria-hidden="true" />
      {status}
    </span>
  )
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
  )
}

export default function ObserveAndAnalyze() {
  return (
    <section className="card rounded-[20px] bg-base-100 shadow-sm" data-tour="observe-and-analyze">
      <div className="card-body gap-3 p-6">
        <header className="flex flex-col gap-4">
          <h2 className="text-2xl font-semibold leading-tight text-neutral-900">Observe &amp; analyze</h2>
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
              aria-controls={`experiments-panel`}
              id={`experiments-tab`}
              className={`tab px-7 tab-active text-blue-500`}
            >
              Experiments
            </button>
          </div>
        </header>

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
                    <span className="flex items-center gap-2">
                      Progress
                    </span>
                  </th>
                  <th>
                    <span className="flex items-center gap-2">
                      Intent
                      <FilterIcon />
                    </span>
                  </th>
                  <th>
                    <span className="flex items-center gap-2">
                      Linked experiment definition
                      <FilterIcon />
                    </span>
                  </th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm text-neutral-700">
                {TABLE_ROWS.map(
                  (
                    { id, name, status, startedTime, duration, progress, intent, linkedDefinition },
                    index,
                  ) => (
                    <tr key={id} className="hover:bg-base-200/60">
                      <td className="text-center text-neutral-500">{index + 1}</td>
                      <td>
                        <button type="button" className="btn btn-link px-0 text-sm text-info no-underline">
                          {name}
                        </button>
                      </td>
                      <td>
                        <StatusBadge status={status} />
                      </td>
                      <td>{startedTime}</td>
                      <td>{duration}</td>
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
                      <td>{intent}</td>
                      <td>{linkedDefinition}</td>
                      <td>
                        <div className="join justify-end">
                          {ACTION_ICONS.map((icon) => (
                            <ActionIconButton key={icon.label} {...icon} />
                          ))}
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-neutral-500">1-5 of 50 items</p>
            <div className="flex flex-wrap items-center gap-4">
              <div className="join">
                <button type="button" className="join-item btn btn-sm" aria-label="Previous page">
                  «
                </button>
                <button type="button" className="join-item btn btn-sm">
                  1
                </button>
                <button type="button" className="join-item btn btn-sm btn-disabled">
                  …
                </button>
                <button type="button" className="join-item btn btn-sm">5</button>
                <button type="button" className="join-item btn btn-sm btn-active">
                  6
                </button>
                <button type="button" className="join-item btn btn-sm">
                  7
                </button>
                <button type="button" className="join-item btn btn-sm">
                  8
                </button>
                <button type="button" className="join-item btn btn-sm btn-disabled">
                  …
                </button>
                <button type="button" className="join-item btn btn-sm">
                  50
                </button>
                <button type="button" className="join-item btn btn-sm" aria-label="Next page">
                  »
                </button>
              </div>
              <button type="button" className="btn btn-sm w-24 justify-between gap-2 normal-case">
                <span>5/page</span>
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
        </div>
      </div>
    </section>
  )
}
