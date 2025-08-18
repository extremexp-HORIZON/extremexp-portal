import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  Plus,
  X,
  ChevronDown,
  Boxes,
  Loader,
  CheckCircle2,
  XCircle,
  Import,
  AlertCircle,
} from 'lucide-react';
import { WorkflowStep } from './WorkflowStep';
import { ImportWorkflowModal } from './ImportWorkflowModal';
import { ExperimentSave, ExperimentStep, ExperimentSpace } from '../../types/experiments';
import type { Node, SearchMethod, SavedWorkflow } from '../../types/experiments';
import '../../containers/Dashboard/experiments.scss'
import Header from '../editor/Header';
import { useLocation } from 'react-router-dom';
import { message } from '../../utils/message';
import useRequest from '../../hooks/useRequest';
import {
  TaskResponseType,
  ExperimentResponseType
} from '../../types/requests';


function ExperimentDesigner() {
  // --- State ---
  const { request: specificationRequest } = useRequest<ExperimentResponseType | TaskResponseType>();
  const [steps, setSteps] = useState<Node[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [experimentName, setExperimentName] = useState('');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedSpace, setSelectedSpace] = useState<string | null>(null);
  const [isAddingNode, setIsAddingNode] = useState(false);
  const [newStepName, setNewStepName] = useState('');
  const [isImportingWorkflow, setIsImportingWorkflow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Routing ---
  const projID = useLocation().pathname.split('/')[3];
  const experimentID = useLocation().pathname.split('/')[4];

  // --- Helpers ---
  // Extract steps from experiment object, supporting legacy and new formats
  const extractSteps = (experiment: any): Node[] => {
    if (Array.isArray(experiment.steps)) return applyWorkflowOverrides(experiment.steps);
    if (Array.isArray(experiment.graphical_model)) return applyWorkflowOverrides(experiment.graphical_model);
    return [];
  };

  // --- Effects ---
  // Load experiment on mount or when ID changes
  useEffect(() => {
    const url = `exp/projects/experiments/${experimentID}`;
    specificationRequest({ url })
      .then((data) => {
        if ('experiment' in data.data && data.data.experiment) {
          const experiment = data.data.experiment;
          setExperimentName(experiment.name || '');
          setSteps(extractSteps(experiment));
        } else {
          setExperimentName('');
          setSteps([]);
          message('Experiment data not found.');
        }
      })
      .catch((error) => {
        setExperimentName('');
        setSteps([]);
        message(error?.response?.data?.message || error.message || 'Failed to load experiment.');
      });
  }, [specificationRequest, projID, experimentID]);

  // --- DnD Sensors ---
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // --- Handlers ---
  // Save experiment: open modal

  // Removed unused handleSaveExperiment

  // Drag end: reorder steps
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSteps((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reorderedSteps = arrayMove(items, oldIndex, newIndex);
        return reorderedSteps.map((step, index) => ({
          ...step,
          executionOrder: index + 1
        }));
      });
    }
  };

  // Add a new step
  const handleAddNode = () => {
    if (steps.length >= 3) {
      setError('Maximum of 3 steps allowed');
      return;
    }
    const isNodeEmpty = steps.some(step => step.spaces.length === 0 || step.spaces.every(space => space.steps.length === 0));
    if (isNodeEmpty) {
      setError('Cannot add a new step while there are empty steps');
      return;
    }
    setError(null);
    setIsAddingNode(true);
    setNewStepName('');
  };

  // Create a new step
  const handleCreateNode = () => {
    if (!newStepName.trim()) return;
    const newStep: Node = {
      id: `step-${Date.now()}`,
      name: newStepName.trim(),
      type: 'container',
      spaces: [],
      collapsed: false,
      status: 'idle',
      executionOrder: steps.length + 1
    };
    setSteps([...steps, newStep]);
    setIsAddingNode(false);
    setNewStepName('');
  };

  // Add a space to a step
  const addSpace = (stepID: string) => {
    const step = steps.find(n => n.id === stepID);
    if (!step) return;
    const hasEmptySpace = step.spaces.some(space => space.steps.length === 0);
    if (hasEmptySpace) {
      setError('Cannot add new space while there is an empty space');
      return;
    }
    setError(null);
    setSteps(steps.map(step => step.id === stepID ? {
      ...step,
      spaces: [
        ...step.spaces,
        {
          id: `space-${Date.now()}`,
          name: 'New Space',
          steps: [],
          status: 'idle',
          gridSearchEnabled: true,
          searchMethod: 'grid'
        }
      ]
    } : step));
  };

  
  const removeNode = (stepID: string) => {
    setSteps(prevSteps => {
      const filteredSteps = prevSteps.filter(step => step.id !== stepID);
      return filteredSteps.map((step, index) => ({
        ...step,
        executionOrder: index + 1
      }));
    });
  };

  const removeSpace = (stepID: string, spaceId: string) => {
    setSteps(steps.map(step => {
      if (step.id === stepID) {
        return {
          ...step,
          spaces: step.spaces.filter(space => space.id !== spaceId)
        };
      }
      return step;
    }));
  };

  const removeStep = (stepId: string, spaceId: string, newStepId: string) => {
    setSteps(steps.map(step => {
      if (step.id === stepId) {
        return {
          ...step,
          spaces:  step.spaces.map(space => {
            if (space.id === spaceId) {
              return {
                ...space,
                steps: space.steps.filter(step => step.id !== newStepId)
              };
            }
            return space;
          })
        };
      }
      return step;
    }));
  };

  const toggleNodeCollapse = (nodeId: string) => {
    setSteps(steps.map(step => 
      step.id === nodeId ? { ...step, collapsed: !step.collapsed } : step
    ));
  };

  const toggleSpaceCollapse = (stepID: string, spaceId: string) => {
    setSteps(steps.map(step => {
      if (step.id === stepID) {
        return {
          ...step,
          spaces: step.spaces.map(space => 
            space.id === spaceId ? { ...space, collapsed: !space.collapsed } : space
          )
        };
      }
      return step;
    }));
  };

  const selectTask = (stepId: string, spaceId: string, newStepId: string, taskId: string) => {
    setSteps(steps.map(step => {
      if (step.id === stepId) {
        return {
          ...step,
          spaces: step.spaces.map(space => {
            if (space.id === spaceId) {
              return {
                ...space,
                steps: space.steps.map(step => {
                  if (step.id === newStepId) {
                    return {
                      ...step,
                      tasks: step.tasks.map(task => ({
                        ...task,
                        selected: task.id === taskId
                      }))
                    };
                  }
                  return step;
                })
              };
            }
            return space;
          })
        };
      }
      return step;
    }));
  };

  const toggleGridSearch = (stepID: string, spaceId: string) => {
    setSteps(steps.map(step => {
      if (step.id === stepID) {
        return {
          ...step,
          spaces: step.spaces.map(space => {
            if (space.id === spaceId) {
              return {
                ...space,
                gridSearchEnabled: !space.gridSearchEnabled
              };
            }
            return space;
          })
        };
      }
      return step;
    }));
  };

  const changeSearchMethod = (nodeId: string, spaceId: string, method: SearchMethod) => {
    setSteps(steps.map(step => {
      if (step.id === nodeId) {
        return {
          ...step,
          spaces: step.spaces.map(space => {
            if (space.id === spaceId) {
              return {
                ...space,
                searchMethod: method
              };
            }
            return space;
          })
        };
      }
      return step;
    }));
  };

  const handleImportWorkflow = (workflow: SavedWorkflow) => {
    if (!selectedNode || !selectedSpace) return;

    setSteps((prevNodes) =>
      prevNodes.map((step) => {
        if (step.id === selectedNode) {
          return {
            ...step,
            spaces: step.spaces.map((space) => {
              if (space.id === selectedSpace) {
                return {
                  ...space,
                  workflow_id: workflow.id, // <-- set the workflow_id here
                  steps: [
                    ...space.steps,
                    ...workflow.steps.map((step) => ({
                      ...step,
                      id: `${step.id}-${Date.now()}`,
                    })),
                  ],
                };
              }
              return space;
            }),
          };
        }
        return step;
      })
    );

    setIsImportingWorkflow(false);
  };

  const saveExperiment = async () => {
    const experimentToSave: ExperimentSave = {
      id: experimentID,
      name: experimentName,
      project_id: projID,
      created_at: Date.now(),
      updated_at: Date.now(),
      steps: steps.map((step): ExperimentStep => ({
        ...step,
        spaces: step.spaces.map((space): ExperimentSpace => ({
          ...space,
          steps: Array.isArray(space.steps) ? space.steps.map(wfStep => ({
            ...wfStep,
            tasks: Array.isArray(wfStep.tasks) ? wfStep.tasks.map(task => ({
              ...task,
              // This will include the current param.values for each hyperParameter
              hyperParameters: Array.isArray(task.hyperParameters)
                ? task.hyperParameters.map(param => ({
                    ...param,
                    // param.values is already up-to-date from WorkflowStep
                  }))
                : [],
            })) : [],
          })) : [],
        })),
      })),
    };

    await specificationRequest({
      url: `/exp/projects/${projID}/experiments/${experimentID}/update/`,
      method: "PUT",
      data: experimentToSave,
    })
      .then(() => {
        message("Experiment saved successfully");
        setIsSaving(false);
      })
      .catch((error) => {
        message(error.response?.data?.message || error.message);
      });
  };

  const getStatusIcon = (status: 'idle' | 'running' | 'completed' | 'error') => {
    switch (status) {
      case 'running':
        return <Loader className="w-4 h-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  function applyWorkflowOverrides(steps: Node[]): Node[] {
    return steps.map((step) => ({
      ...step,
      spaces: Array.isArray(step.spaces)
        ? step.spaces.map((space) => {
            const overrides = space.workflow_overrides || {};
            return {
              ...space,
              steps: Array.isArray(space.steps)
                ? space.steps.map((wfStep) => ({
                    ...wfStep,
                    tasks: Array.isArray(wfStep.tasks)
                      ? wfStep.tasks.map((task) => {
                          const override = overrides[task.id];
                          if (!override) return task;
                          return {
                            ...task,
                            selected: override.selected ?? task.selected,
                            hyperParameters: Array.isArray(task.hyperParameters)
                              ? task.hyperParameters.map((param) => {
                                  const paramOverride = override.hyperParameters?.find(
                                    (p: any) => p.name === param.name
                                  );
                                  return paramOverride
                                    ? { ...param, value: paramOverride.value }
                                    : param;
                                })
                              : task.hyperParameters,
                          };
                        })
                      : wfStep.tasks,
                  }))
                : space.steps,
            };
          })
        : step.spaces,
    }));
  }

  const handleParamChange = (stepId: string, taskId: string , paramName: string, newValue: string) => {
    setSteps(steps =>
      steps.map(step =>
        step.id === stepId
          ? {
              ...step,
              spaces: step.spaces.map(space => ({
                ...space,
                steps: space.steps.map(wfStep => ({
                  ...wfStep,
                  tasks: wfStep.tasks.map(task =>
                    task.id === taskId
                      ? {
                          ...task,
                          hyperParameters: task.hyperParameters.map(param =>
                            param.name === paramName
                              ? { ...param, value: newValue }
                              : param
                          ),
                        }
                      : task
                  ),
                })),
              })),
            }
          : step
      )
    );
  };

  return (
    <div className="flex h-screen bg-gray-100 w-[100vw]">

      <div className="flex-1 flex flex-col overflow-hidden">

        <div className="editor__top">
          {/* TODO: save as */}
        <Header onSave={saveExperiment} onSaveAs={saveExperiment} />
      </div>

        <main className="flex-1 overflow-auto bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
                <AlertCircle className="w-5 h-5 mr-2" />
                {error}
              </div>
            )}

            <div className="bg-gray-100 rounded-lg p-4 mb-6 border-2 border-dashed border-gray-300">
              <div className="flex items-center justify-center h-16">
                <button
                  onClick={handleAddNode}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                >
                  <Plus className="w-6 h-6" />
                  <span>Add Step</span>
                </button>
              </div>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={steps.map(step => step.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-6">
                  {Array.isArray(steps) && steps.map((step) => (
                    <div key={step.id} className="bg-white rounded-lg shadow-sm">
                      <div className="px-6 py-4 border-b border-gray-200 flex items-center">
                        <div className="flex items-center flex-1">
                          <div className="bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center mr-3">
                            {step.executionOrder}
                          </div>
                          <Boxes className="w-5 h-5 text-gray-500 mr-3" />
                          <h2 className="text-lg font-medium text-gray-900">{step.name}</h2>
                          {getStatusIcon(step.status)}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => addSpace(step.id)}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => toggleNodeCollapse(step.id)}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                          >
                            <ChevronDown className={`w-5 h-5 transform transition-transform ${step.collapsed ? '' : 'rotate-180'}`} />
                          </button>
                          <button
                            onClick={() => removeNode(step.id)}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-lg"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {!step.collapsed && (
                        <div className="p-6 space-y-4">
                          <div className="flex overflow-x-auto space-x-4 pb-4 snap-x">
                              {Array.isArray(step.spaces) && step.spaces.map((space) => (
                              <div key={space.id} className="border rounded-lg">
                                <div className="px-4 py-3 border-b flex items-center bg-gray-50">
                                  <div className="flex-1">
                                    <h3 className="text-md font-medium text-gray-700 flex items-center">
                                      {space.name}
                                      {getStatusIcon(space.status)}
                                      {space.executionTime && space.status === 'completed' && (
                                        <span className="ml-2 text-sm text-gray-500">
                                          ({space.executionTime}ms)
                                        </span>
                                      )}
                                    </h3>
                                    <div className="mt-2 flex items-center space-x-4">
                                      <div className="flex items-center space-x-2">
                                        <input
                                          type="checkbox"
                                          checked={space.gridSearchEnabled}
                                          onChange={() => toggleGridSearch(step.id, space.id)}
                                          className="rounded text-blue-600"
                                        />
                                        <label className="text-sm text-gray-600">Enable Search</label>
                                      </div>
                                      {space.gridSearchEnabled && (
                                        <select
                                          value={space.searchMethod || 'grid'}
                                          onChange={(e) => changeSearchMethod(step.id, space.id, e.target.value as SearchMethod)}
                                          className="text-sm border rounded px-2 py-1"
                                        >
                                          <option value="grid">Grid Search</option>
                                          <option value="random">Random Search</option>
                                          <option value="bayesian">Bayesian Optimization</option>
                                          <option value="evolutionary">Evolutionary Algorithm</option>
                                        </select>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    {!space.workflow_id && (
                                      <button
                                        onClick={() => {
                                          setSelectedNode(step.id);
                                          setSelectedSpace(space.id);
                                          setIsImportingWorkflow(true);
                                        }}
                                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                                        title="Import Workflow"
                                      >
                                        <Import className="w-4 h-4" />
                                      </button>
                                    )}
                                    
                                    <button
                                      onClick={() => toggleSpaceCollapse(step.id, space.id)}
                                      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                                    >
                                      <ChevronDown className={`w-4 h-4 transform transition-transform ${space.collapsed ? '' : 'rotate-180'}`} />
                                    </button>
                                    <button
                                      onClick={() => removeSpace(step.id, space.id)}
                                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                {!space.collapsed && (
                                  <div className="p-4 space-y-4">
                                    {Array.isArray(space.steps) && space.steps.map((step) => (
                                      <WorkflowStep
                                        key={step.id}
                                        step={step}
                                        onRemove={() => removeStep(step.id, space.id, step.id)}
                                        onSelectTask={(stepId, taskId) => selectTask(step.id, space.id, stepId, taskId)}
                                        onParamChange={handleParamChange}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </main>
      </div>

      {isAddingNode && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="p-6">
              <div className="modal-header">
                <h3 className="text-xl font-semibold">Create New Step</h3>
                <button
                  onClick={() => setIsAddingNode(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Step Name
                  </label>
                  <input
                    type="text"
                    value={newStepName}
                    onChange={(e) => setNewStepName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newStepName.trim()) {
                        handleCreateNode();
                      }
                    }}
                    placeholder="Enter step name"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setIsAddingNode(false)}
                    className="button-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateNode}
                    disabled={!newStepName.trim()}
                    className="button-primary"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isImportingWorkflow && selectedNode && selectedSpace && (
        <ImportWorkflowModal
          onClose={() => setIsImportingWorkflow(false)}
          onImport={handleImportWorkflow}
        />
      )}
      
      {isSaving && (
        <div className="modal-overlay">
          <div className="modal-content max-w-lg">
            <div className="p-6">
              <div className="modal-header">
                <h3 className="text-xl font-semibold">Save Experiment</h3>
                <button
                  onClick={() => setIsSaving(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Experiment Name
                </label>
                <input
                  type="text"
                  value={experimentName}
                  onChange={(e) => setExperimentName(e.target.value)}
                  placeholder="Enter experiment name"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setIsSaving(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveExperiment}
                  disabled={!experimentName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExperimentDesigner;