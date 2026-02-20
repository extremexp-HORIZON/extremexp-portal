import { useState } from "react"
import type { ComponentType } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import {
  createExperimentExperimentsPostMutation,
  listExperimentsExperimentsGetQueryKey,
  createWorkflowWorkflowsPostMutation,
  listWorkflowsWorkflowsGetQueryKey,
} from "../client/@tanstack/react-query.gen"
import { getExternalToolRoute } from "../config"
import DefineExperimentsTab from "./DefineExperimentsTab"
import WorkflowDefinitionTab from "./WorkflowDefinitionTab"

type TabId = "experiment-definition" | "workflow-definition"

type TabConfig = {
  id: TabId
  label: string
  Component: ComponentType
}

const TAB_CONFIG: TabConfig[] = [
  {
    id: "experiment-definition",
    label: "Experiment definition",
    Component: DefineExperimentsTab,
  },
  {
    id: "workflow-definition",
    label: "Workflow definition",
    Component: WorkflowDefinitionTab,
  },
]

export default function DefineAndRun() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabId>("experiment-definition")
  const queryClient = useQueryClient()
  const [isCreateExperimentModalOpen, setIsCreateExperimentModalOpen] = useState(false)
  const [isCreateWorkflowModalOpen, setIsCreateWorkflowModalOpen] = useState(false)
  const [newExperimentName, setNewExperimentName] = useState("")
  const [newWorkflowName, setNewWorkflowName] = useState("")

  const createExperimentMutation = useMutation({
    ...createExperimentExperimentsPostMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listExperimentsExperimentsGetQueryKey() })
      setIsCreateExperimentModalOpen(false)
      setNewExperimentName("")
    },
  })

  const createWorkflowMutation = useMutation({
    ...createWorkflowWorkflowsPostMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listWorkflowsWorkflowsGetQueryKey() })
      setIsCreateWorkflowModalOpen(false)
      setNewWorkflowName("")
    },
  })

  const handleCreateExperiment = async (mode: "create" | "create_and_edit") => {
    if (!newExperimentName || createExperimentMutation.isPending) {
      return
    }

    try {
      const createdExperiment = await createExperimentMutation.mutateAsync({
        body: { name: newExperimentName },
      })

      if (mode === "create_and_edit") {
        navigate(
          getExternalToolRoute("experiment-intent-editor", {
            experimentId: createdExperiment.id,
          }),
        )
      }
    } catch {
      // Error state is handled by createExperimentMutation.error
    }
  }

  return (
    <section className="card rounded-[20px] bg-base-100 shadow-sm" data-tour="define-and-run">
      <div className="card-body gap-3 p-6">
        <header className="flex flex-col gap-4">
          <h2 className="text-2xl font-semibold leading-tight text-neutral-900">Define &amp; run</h2>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div
              role="tablist"
              aria-label="Define and run tabs"
              className="tabs tabs-border"
            >
              {TAB_CONFIG.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === id}
                  aria-controls={`${id}-panel`}
                  id={`${id}-tab`}
                  className={`tab px-7 ${activeTab === id ? "tab-active text-blue-500" : ""}`}
                  onClick={() => setActiveTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            {activeTab === "experiment-definition" && (
              <button
                type="button"
                className="btn rounded-lg border-none bg-[#46A3FF] hover:bg-[#3B8EDB] text-white"
                data-tour="create-experiment"
                onClick={() => {
                  createExperimentMutation.reset()
                  setIsCreateExperimentModalOpen(true)
                }}
              >
                Create new experiment definition
              </button>
            )}
            {activeTab === "workflow-definition" && (
              <button
                type="button"
                className="btn rounded-lg border-none bg-[#46A3FF] hover:bg-[#3B8EDB] text-white"
                data-tour="create-workflow"
                onClick={() => {
                  createWorkflowMutation.reset()
                  setIsCreateWorkflowModalOpen(true)
                }}
              >
                Create new workflow definition
              </button>
            )}
          </div>
        </header>
        <div className="flex flex-col gap-4">
          {TAB_CONFIG.map(({ id, Component }) => (
            <div
              key={id}
              id={`${id}-panel`}
              role="tabpanel"
              aria-labelledby={`${id}-tab`}
              hidden={activeTab !== id}
            >
              <Component />
            </div>
          ))}
        </div>
      </div>

      {/* Create Experiment Modal */}
      {isCreateExperimentModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Create New Experiment</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void handleCreateExperiment("create")
              }}
            >
              <fieldset className="fieldset mt-4">
                <legend className="fieldset-legend">Experiment Name</legend>
                <input
                  type="text"
                  placeholder="Enter experiment name"
                  className="input input-bordered w-full"
                  value={newExperimentName}
                  onChange={(e) => setNewExperimentName(e.target.value)}
                  autoFocus
                />
              </fieldset>
              {createExperimentMutation.error && (
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
                    {(createExperimentMutation.error as Error & { detail?: string }).detail ||
                      (createExperimentMutation.error as Error).message ||
                      "An error occurred"}
                  </span>
                </div>
              )}
              <div className="modal-action">
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setIsCreateExperimentModalOpen(false)
                    createExperimentMutation.reset()
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!newExperimentName || createExperimentMutation.isPending}
                >
                  {createExperimentMutation.isPending ? "Creating..." : "Create"}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!newExperimentName || createExperimentMutation.isPending}
                  onClick={() => {
                    void handleCreateExperiment("create_and_edit")
                  }}
                >
                  {createExperimentMutation.isPending ? "Creating..." : "Create & Edit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Workflow Modal */}
      {isCreateWorkflowModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Create New Workflow</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (newWorkflowName) {
                  createWorkflowMutation.mutate({ body: { name: newWorkflowName } })
                }
              }}
            >
              <fieldset className="fieldset mt-4">
                <legend className="fieldset-legend">Workflow Name</legend>
                <input
                  type="text"
                  placeholder="Enter workflow name"
                  className="input input-bordered w-full"
                  value={newWorkflowName}
                  onChange={(e) => setNewWorkflowName(e.target.value)}
                  autoFocus
                />
              </fieldset>
              {createWorkflowMutation.error && (
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
                    {(createWorkflowMutation.error as Error & { detail?: string }).detail ||
                      (createWorkflowMutation.error as Error & { message?: string }).message ||
                      "An error occurred"}
                  </span>
                </div>
              )}
              <div className="modal-action">
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setIsCreateWorkflowModalOpen(false)
                    createWorkflowMutation.reset()
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!newWorkflowName || createWorkflowMutation.isPending}
                >
                  {createWorkflowMutation.isPending ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
