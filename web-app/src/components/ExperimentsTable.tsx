import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createExperimentExperimentsPostMutation,
  deleteExperimentExperimentsExperimentIdDeleteMutation,
  listExperimentsExperimentsGetOptions,
  listExperimentsExperimentsGetQueryKey,
  updateExperimentExperimentsExperimentIdPatchMutation,
} from "../client/@tanstack/react-query.gen"
import type { ExperimentRead } from "../client/types.gen"
import { useState, useMemo, useEffect } from "react"
import Pagination, { PAGE_SIZE } from "./Pagination"
import { useSearchFilterStore, createNameFilter } from "../stores/useSearchFilterStore"

const ACTION_ICONS = [
  {
    label: "Run experiment",
    action: "run",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
  },
  {
    label: "View code",
    action: "view_code",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    label: "Target metrics",
    action: "metrics",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <circle cx="12" cy="12" r="6"></circle>
        <circle cx="12" cy="12" r="2"></circle>
      </svg>
    ),
  },
  {
    label: "Rename",
    action: "edit",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
  },
  {
    label: "Duplicate",
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

// function WorkflowThumbnail() {
//   return (
//     <div className="flex h-12 w-20 flex-col justify-center gap-1 rounded-md border border-base-300 bg-base-200 px-3 py-2">
//       <span className="h-1 rounded bg-base-300" />
//       <span className="h-1 rounded bg-base-300" />
//       <span className="flex items-center gap-1">
//         <span className="h-6 w-6 rounded-md border border-base-300" />
//         <span className="h-1 flex-1 rounded bg-base-300" />
//       </span>
//     </div>
//   )
// }

function ActionIconButton({
  label,
  icon,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      className="inline-flex size-8 items-center justify-center rounded-md text-info transition hover:bg-info/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info/60 cursor-pointer"
      aria-label={label}
      onClick={onClick}
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
  const [currentPage, setCurrentPage] = useState(1)

  const { data: experiments, isLoading, error } = useQuery({
    ...listExperimentsExperimentsGetOptions(),
  })

  // Get filter from global store
  const filterText = useSearchFilterStore((state) => state.filterText)

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

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [filterText])

  // Paginate filtered experiments
  const paginatedExperiments = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE
    return filteredExperiments.slice(startIndex, startIndex + PAGE_SIZE)
  }, [filteredExperiments, currentPage])

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
                <span className="flex items-center gap-2">
                  Name
                  <FilterIcon />
                </span>
              </th>
              <th className="w-44">
                <span className="flex items-center gap-2">
                  Created Time
                  <FilterIcon />
                  <SortIcon />
                </span>
              </th>
              <th className="w-44">
                <span className="flex items-center gap-2">
                  Last updated Time
                  <FilterIcon />
                  <SortIcon />
                </span>
              </th>
              {/* <th>
                <span className="flex items-center gap-2">
                  Linked workflow
                  <SortIcon />
                </span>
              </th> */}
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
                  <td className="text-sm text-neutral-700">
                    {new Date(experiment.created_at).toLocaleString()}
                  </td>
                  <td className="text-sm text-neutral-700">
                    {new Date(experiment.updated_at).toLocaleString()}
                  </td>
                  {/* <td>
                  <WorkflowThumbnail />
                </td> */}
                  <td>
                    <div className="flex justify-end gap-1.5">
                      {ACTION_ICONS.map((icon) => (
                        <ActionIconButton
                          key={icon.label}
                          {...icon}
                          onClick={() => handleAction(icon.action, experiment)}
                        />
                      ))}
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
