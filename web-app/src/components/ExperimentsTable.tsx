import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createExperimentExperimentsPostMutation,
  deleteExperimentExperimentsExperimentIdDeleteMutation,
  listExperimentsExperimentsGetOptions,
  listExperimentsExperimentsGetQueryKey,
  updateExperimentExperimentsExperimentIdPatchMutation,
} from "../client/@tanstack/react-query.gen"
import type { ExperimentRead } from "../client/types.gen"
import { useState, useMemo, useCallback } from "react"
import Pagination, { PAGE_SIZE } from "./Pagination"
import { useSearchFilterStore, createNameFilter } from "../stores/useSearchFilterStore"
import { useSortStore, sortItems } from "../stores/useSortStore"
import SortableHeader from "./SortableHeader"
import TimeDisplay from "./TimeDisplay"
import { useResettablePagination } from "../hooks"
import {
  getExperimentIntentEditorUrl,
  getExperimentGraphicalEditorUrl,
  getExperimentCodeEditorUrl,
  getExperimentScheduleUrl,
  type ExternalToolId,
} from "../config"
import { ExternalLinkButton } from "./ExternalLinkButton"
import { isActionDisabled } from "./experimentActions"

/** Context key for experiments table sorting */
const SORT_CONTEXT = "experiments"

/** Map action names to external tool IDs */
const ACTION_TO_TOOL_ID: Record<string, ExternalToolId> = {
  schedule: "experiment-schedule",
  code_editor: "experiment-code-editor",
  graphical_editor: "experiment-graphical-editor",
}

const ACTION_ICONS = [
  {
    label: "Intent editor",
    action: "intent_editor",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <circle cx="12" cy="12" r="6"></circle>
        <circle cx="12" cy="12" r="2"></circle>
      </svg>
    ),
  },
  {
    label: "DSL editor",
    action: "code_editor",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    label: "Graphical editor",
    action: "graphical_editor",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
      </svg>
    ),
  },
  {
    label: "Run",
    action: "schedule",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
  },
  {
    label: "Copy",
    action: "duplicate",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    ),
  },
  {
    label: "Delete",
    action: "delete",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
    ),
  },
]

function ActionIconButton({
  label,
  icon,
  onClick,
  toolId,
  params,
  externalUrl,
  disabled = false,
}: {
  label: string
  icon: React.ReactNode
  onClick?: () => void
  toolId?: ExternalToolId
  params?: Record<string, string | number>
  externalUrl?: string
  disabled?: boolean
}) {
  const baseClassName = "inline-flex size-8 items-center justify-center rounded-md transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info/60"
  const enabledClassName = `${baseClassName} text-info hover:bg-info/10 cursor-pointer`
  const disabledClassName = `${baseClassName} text-neutral-400 cursor-not-allowed`
  const className = disabled ? disabledClassName : enabledClassName

  if (toolId && externalUrl && !disabled) {
    return (
      <ExternalLinkButton
        toolId={toolId}
        params={params}
        externalUrl={externalUrl}
        className={className}
        aria-label={label}
        title={label}
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
      title={label}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      <span className="size-4 [&>svg]:size-full">
        {icon}
      </span>
    </button>
  )
}

function generateUniqueCopyName(baseName: string, existingNames: string[]): string {
  // Remove existing " (copy)" or " (copy N)" suffix to get the base
  const baseWithoutCopy = baseName.replace(/ \(copy( \d+)?\)$/, "")

  const copyName = `${baseWithoutCopy} (copy)`
  if (!existingNames.includes(copyName)) {
    return copyName
  }

  let counter = 2
  while (existingNames.includes(`${baseWithoutCopy} (copy ${counter})`)) {
    counter++
  }
  return `${baseWithoutCopy} (copy ${counter})`
}

export default function ExperimentsTable() {
  const queryClient = useQueryClient()
  const [editingExperiment, setEditingExperiment] = useState<ExperimentRead | null>(null)
  const [deletingExperiment, setDeletingExperiment] = useState<ExperimentRead | null>(null)
  const filterText = useSearchFilterStore((state) => state.filterText)
  const sortConfig = useSortStore((state) => state.sorts[SORT_CONTEXT])
  const resetKey = useMemo(
    () => `${filterText}::${sortConfig?.key ?? ""}::${sortConfig?.direction ?? ""}`,
    [filterText, sortConfig?.key, sortConfig?.direction],
  )
  const [currentPage, setCurrentPage] = useResettablePagination(resetKey)
  const toggleSort = useSortStore((state) => state.toggleSort)

  const { data: experiments, isLoading, error } = useQuery({
    ...listExperimentsExperimentsGetOptions(),
  })

  // Handler for sort toggle
  const handleSort = useCallback(
    (key: string) => toggleSort(SORT_CONTEXT, key),
    [toggleSort]
  )

  const updateMutation = useMutation({
    ...updateExperimentExperimentsExperimentIdPatchMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listExperimentsExperimentsGetQueryKey() })
      setEditingExperiment(null)
    },
  })

  const deleteMutation = useMutation({
    ...deleteExperimentExperimentsExperimentIdDeleteMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listExperimentsExperimentsGetQueryKey() })
      setDeletingExperiment(null)
    },
  })

  const duplicateMutation = useMutation({
    ...createExperimentExperimentsPostMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listExperimentsExperimentsGetQueryKey() })
    },
  })

  // Filter experiments by name using the global search filter
  const filteredExperiments = useMemo(() => {
    if (!experiments) return []
    const nameFilter = createNameFilter(filterText)
    return experiments.filter((exp) => nameFilter(exp.name))
  }, [experiments, filterText])

  // Sort filtered experiments
  const sortedExperiments = useMemo(
    () => sortItems(filteredExperiments, sortConfig),
    [filteredExperiments, sortConfig]
  )

  // Paginate sorted experiments
  const paginatedExperiments = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE
    return sortedExperiments.slice(startIndex, startIndex + PAGE_SIZE)
  }, [sortedExperiments, currentPage])

  /**
   * Get the external link info for an action
   */
  const getExternalLinkInfo = (action: string, experiment: ExperimentRead) => {
    const toolId = ACTION_TO_TOOL_ID[action]
    if (!toolId) return undefined

    const params = { experimentId: String(experiment.id) }
    let externalUrl: string

    switch (action) {
      case "intent_editor":
        externalUrl = getExperimentIntentEditorUrl(experiment.id)
        break
      case "graphical_editor":
        externalUrl = getExperimentGraphicalEditorUrl(experiment.id)
        break
      case "code_editor":
        externalUrl = getExperimentCodeEditorUrl(experiment.id)
        break
      case "schedule":
        externalUrl = getExperimentScheduleUrl(experiment.id)
        break
      default:
        return undefined
    }

    return { toolId, params, externalUrl }
  }

  const handleAction = (action: string, experiment: ExperimentRead) => {
    switch (action) {
      case "delete":
        setDeletingExperiment(experiment)
        break
      case "edit":
        setEditingExperiment(experiment)
        break
      case "duplicate": {
        const existingNames = experiments?.map((e) => e.name) ?? []
        const newName = generateUniqueCopyName(experiment.name, existingNames)
        duplicateMutation.mutate({
          body: {
            name: newName,
            steps: experiment.steps,
            graphical_model: experiment.graphical_model,
          },
        })
        break
      }
      // External link actions are handled via href, not onClick
      case "graphical_editor":
      case "code_editor":
      case "schedule":
        break
      default:
        console.log(`Action ${action} not implemented yet`)
    }
  }

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error loading experiments</div>

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-lg border border-base-200" data-tour="experiments-table">
        <table className="table table-compact w-full">
          <thead className="bg-success/10 text-xs font-medium uppercase tracking-wide text-neutral-600">
            <tr>
              <th className="w-auto">
                <SortableHeader
                  label="Name"
                  sortKey="name"
                  currentDirection={sortConfig?.key === "name" ? sortConfig.direction : null}
                  onSort={handleSort}
                />
              </th>
              <th className="w-44">
                <SortableHeader
                  label="Created Time"
                  sortKey="created_at"
                  currentDirection={sortConfig?.key === "created_at" ? sortConfig.direction : null}
                  onSort={handleSort}
                />
              </th>
              <th className="w-44">
                <SortableHeader
                  label="Last updated Time"
                  sortKey="updated_at"
                  currentDirection={sortConfig?.key === "updated_at" ? sortConfig.direction : null}
                  onSort={handleSort}
                />
              </th>
              <th className="w-56 text-right">
                <span>Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {experiments?.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-neutral-500">
                  No experiments yet. Create one to get started.
                </td>
              </tr>
            ) : filteredExperiments.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-neutral-500">
                  No experiments match your filter. Try adjusting your search.
                </td>
              </tr>
            ) : (
              paginatedExperiments.map((experiment) => (
                <tr key={experiment.id}>
                  <td className="text-sm">
                    <button
                      type="button"
                      className="btn btn-link text-sm text-neutral"
                      onClick={() => setEditingExperiment(experiment)}
                    >
                      {experiment.name}
                    </button>
                  </td>
                  <td>
                    <TimeDisplay time={experiment.created_at} />
                  </td>
                  <td>
                    <TimeDisplay time={experiment.updated_at} />
                  </td>
                  {/* <td>
                  <WorkflowThumbnail />
                </td> */}
                  <td>
                    <div className="flex justify-end gap-1.5">
                      {ACTION_ICONS.map((icon) => {
                        const linkInfo = getExternalLinkInfo(icon.action, experiment)
                        const disabled = isActionDisabled(icon.action, experiment)
                        return (
                          <ActionIconButton
                            key={icon.label}
                            label={icon.label}
                            icon={icon.icon}
                            toolId={linkInfo?.toolId}
                            params={linkInfo?.params}
                            externalUrl={linkInfo?.externalUrl}
                            disabled={disabled}
                            onClick={() => handleAction(icon.action, experiment)}
                          />
                        )
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

      {/* Rename Modal */}
      {editingExperiment && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Rename Experiment</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                updateMutation.mutate({
                  path: { experiment_id: editingExperiment.id },
                  body: { name: editingExperiment.name },
                })
              }}
            >
              <fieldset className="fieldset mt-4">
                <legend className="fieldset-legend">Experiment Name</legend>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={editingExperiment.name}
                  onChange={(e) =>
                    setEditingExperiment({
                      ...editingExperiment,
                      name: e.target.value,
                    })
                  }
                  autoFocus
                />
              </fieldset>
              {updateMutation.error && (
                <div role="alert" className="alert alert-error mt-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 shrink-0 stroke-current"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>
                    {(updateMutation.error as Error & { detail?: string }).detail ||
                      (updateMutation.error as Error & { message?: string }).message ||
                      "An error occurred"}
                  </span>
                </div>
              )}
              <div className="modal-action">
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setEditingExperiment(null)
                    updateMutation.reset()
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!editingExperiment.name || updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingExperiment && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Delete Experiment</h3>
            <p className="py-4">
              Are you sure you want to delete{" "}
              <span className="font-semibold">{deletingExperiment.name}</span>?
              This action cannot be undone.
            </p>
            <div className="modal-action">
              <button
                className="btn"
                onClick={() => setDeletingExperiment(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-error"
                onClick={() =>
                  deleteMutation.mutate({
                    path: { experiment_id: deletingExperiment.id },
                  })
                }
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
