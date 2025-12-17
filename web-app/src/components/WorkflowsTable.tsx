import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  deleteWorkflowWorkflowsWorkflowIdDeleteMutation,
  listWorkflowsWorkflowsGetOptions,
  listWorkflowsWorkflowsGetQueryKey,
  updateWorkflowWorkflowsWorkflowIdPatchMutation,
  createWorkflowWorkflowsPostMutation,
} from "../client/@tanstack/react-query.gen"
import type { WorkflowRead } from "../client/types.gen"
import { useState, useMemo, useEffect } from "react"
import Pagination, { PAGE_SIZE } from "./Pagination"
import { useSearchFilterStore, createNameFilter } from "../stores/useSearchFilterStore"

const ACTION_ICONS = [
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

export default function WorkflowsTable() {
  const queryClient = useQueryClient()
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowRead | null>(null)
  const [deletingWorkflow, setDeletingWorkflow] = useState<WorkflowRead | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const { data: workflows, isLoading, error } = useQuery({
    ...listWorkflowsWorkflowsGetOptions(),
  })

  // Get filter from global store
  const filterText = useSearchFilterStore((state) => state.filterText)

  const updateMutation = useMutation({
    ...updateWorkflowWorkflowsWorkflowIdPatchMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listWorkflowsWorkflowsGetQueryKey() })
      setEditingWorkflow(null)
    },
  })

  const deleteMutation = useMutation({
    ...deleteWorkflowWorkflowsWorkflowIdDeleteMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listWorkflowsWorkflowsGetQueryKey() })
      setDeletingWorkflow(null)
    },
  })

  const duplicateMutation = useMutation({
    ...createWorkflowWorkflowsPostMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listWorkflowsWorkflowsGetQueryKey() })
    },
  })

  // Filter workflows by name using the global search filter
  const filteredWorkflows = useMemo(() => {
    if (!workflows) return []
    const nameFilter = createNameFilter(filterText)
    return workflows.filter((wf) => nameFilter(wf.name))
  }, [workflows, filterText])

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [filterText])

  // Paginate filtered workflows
  const paginatedWorkflows = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE
    return filteredWorkflows.slice(startIndex, startIndex + PAGE_SIZE)
  }, [filteredWorkflows, currentPage])

  const handleAction = (action: string, workflow: WorkflowRead) => {
    switch (action) {
      case "delete":
        setDeletingWorkflow(workflow)
        break
      case "edit":
        setEditingWorkflow(workflow)
        break
      case "duplicate": {
        const existingNames = workflows?.map((w) => w.name) ?? []
        const newName = generateUniqueCopyName(workflow.name, existingNames)
        duplicateMutation.mutate({
          body: {
            name: newName,
            graphical_model: workflow.graphical_model,
          },
        })
        break
      }
      default:
        console.log(`Action ${action} not implemented yet`)
    }
  }

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error loading workflows</div>

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-lg border border-base-200" data-tour="workflows-table">
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
              <th className="w-40 text-right">
                <span>Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {workflows?.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-neutral-500">
                  No workflows yet. Create one to get started.
                </td>
              </tr>
            ) : filteredWorkflows.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-neutral-500">
                  No workflows match your filter. Try adjusting your search.
                </td>
              </tr>
            ) : (
              paginatedWorkflows.map((workflow) => (
                <tr key={workflow.id}>
                  <td className="text-sm">
                    <button
                      type="button"
                      className="btn btn-link text-sm text-neutral"
                      onClick={() => setEditingWorkflow(workflow)}
                    >
                      {workflow.name}
                    </button>
                  </td>
                  <td className="text-sm text-neutral-700">
                    {new Date(workflow.created_at).toLocaleString()}
                  </td>
                  <td className="text-sm text-neutral-700">
                    {new Date(workflow.updated_at).toLocaleString()}
                  </td>
                  <td>
                    <div className="flex justify-end gap-1.5">
                      {ACTION_ICONS.map((icon) => (
                        <ActionIconButton
                          key={icon.label}
                          {...icon}
                          onClick={() => handleAction(icon.action, workflow)}
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
        totalItems={filteredWorkflows.length}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />

      {/* Rename Modal */}
      {editingWorkflow && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Rename Workflow</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                updateMutation.mutate({
                  path: { workflow_id: editingWorkflow.id },
                  body: { name: editingWorkflow.name },
                })
              }}
            >
              <fieldset className="fieldset mt-4">
                <legend className="fieldset-legend">Workflow Name</legend>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={editingWorkflow.name}
                  onChange={(e) =>
                    setEditingWorkflow({
                      ...editingWorkflow,
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
                    setEditingWorkflow(null)
                    updateMutation.reset()
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!editingWorkflow.name || updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingWorkflow && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Delete Workflow</h3>
            <p className="py-4">
              Are you sure you want to delete{" "}
              <span className="font-semibold">{deletingWorkflow.name}</span>?
              This action cannot be undone.
            </p>
            {deleteMutation.error && (
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
                  {(deleteMutation.error as Error & { detail?: string }).detail ||
                    (deleteMutation.error as Error & { message?: string }).message ||
                    "An error occurred"}
                </span>
              </div>
            )}
            <div className="modal-action">
              <button
                className="btn"
                onClick={() => {
                  setDeletingWorkflow(null)
                  deleteMutation.reset()
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-error"
                disabled={deleteMutation.isPending}
                onClick={() =>
                  deleteMutation.mutate({
                    path: { workflow_id: deletingWorkflow.id },
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
