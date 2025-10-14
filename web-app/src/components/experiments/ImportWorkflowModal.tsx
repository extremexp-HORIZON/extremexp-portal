import { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, FileJson, FileX } from 'lucide-react';
import type { SavedWorkflow } from '../../types/experiments';
import { WorkflowsResponseType } from '../../types/requests';
import useRequest from '../../hooks/useRequest';
import { message } from '../../utils/message';
import { useLocation } from 'react-router-dom';

interface ImportWorkflowModalProps {
  onClose: () => void;
  onImport: (workflow: SavedWorkflow) => void;
}

export function ImportWorkflowModal({ onClose, onImport }: ImportWorkflowModalProps) {
  const [step, setStep] = useState(1);
  const [selectedWorkflow, setSelectedWorkflow] = useState<SavedWorkflow | null>(null);
  const [workflows, setWorkflows] = useState<SavedWorkflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const projID = useLocation().pathname.split('/')[3];

  const { request: workflowsRequest } = useRequest<WorkflowsResponseType>();

  const getWorkflows = useCallback(() => {
    setIsLoading(true);
    workflowsRequest({
      url: `work/projects/${projID}/workflows`,
    })
      .then((data) => {
        if (data.data.workflows) {
          const mappedWorkflows = data.data.workflows.map((workflow) => {
            const nodes = workflow.graphical_model.nodes;
            const edges = workflow.graphical_model.edges;

            // Build a map for quick lookup
            const nodeMap = Object.fromEntries(nodes.map((n: any) => [n.id, n]));

            // Build adjacency and reverse adjacency for ordering
            const nextMap: Record<string, string | null> = {};
            const prevMap: Record<string, string | null> = {};
            edges.forEach((edge: any) => {
              if (nodeMap[edge.source] && nodeMap[edge.target]) {
                nextMap[edge.source] = edge.target;
                prevMap[edge.target] = edge.source;
              }
            });

            // Find the first node (no incoming edge)
            let firstNode = nodes.find((n: any) => !prevMap[n.id]);
            if (!firstNode && nodes.length > 0) firstNode = nodes[0];

            // Order nodes by walking the graph
            const orderedNodes: any[] = [];
            let current = firstNode;
            while (current) {
              orderedNodes.push(current);
              const nextId = nextMap[current.id];
              current = nextId ? nodeMap[nextId] : null;
            }

            return {
              id: workflow.id_workflow,
              name: workflow.name,
              description: `Created: ${new Date(workflow.create_at * 1000).toLocaleString()}`,
              createdAt: new Date(workflow.create_at * 1000).toISOString(),
              steps: orderedNodes
                .filter((node: any) => {
                  const nodeType = node.type?.toLowerCase?.();
                  return nodeType !== 'start' && nodeType !== 'end';
                })
                .map((node: any) => ({
                  id: node.id,
                  name:
                    (Array.isArray(node.data?.variants) && node.data.variants[0]?.name) ||
                    node.data?.name ||
                    node.type ||
                    'Unnamed Step',
                  type: node.type || 'unknown',
                  tasks: Array.isArray(node.data?.variants)
                    ? node.data.variants
                        .filter((variant: any) => {
                          const vType = variant.type?.toLowerCase?.();
                          return vType !== 'start' && vType !== 'end';
                        })
                        .map((variant: any) => ({
                          id: variant.id_task,
                          name: variant.name,
                          type: 'algorithm',
                          implementationRef: variant.implementationRef,
                          description: variant.description,
                          hyperParameters: (variant.parameters || []).map((param: any) => {
                            const paramValues = Array.isArray(param.values) ? param.values : [];
                            const isNumericType = param.type === 'integer' || param.type === 'real';
                            
                            return {
                              name: param.name,
                              type: param.type,
                              default: paramValues[0] ?? 0,
                              values: paramValues,
                              inputType: param.type === 'categorical' ? 'enumeration' : 
                                        isNumericType && paramValues.length > 1 ? 'range' : undefined,
                              ...(param.type === 'categorical' 
                                ? { options: paramValues.map(String) }
                                : isNumericType 
                                  ? { range: paramValues.length > 1 
                                      ? [Math.min(...paramValues), Math.max(...paramValues)]
                                      : undefined 
                                    }
                                  : {}
                              ),
                            };
                          }),
                          selected: true,
                        }))
                    : [],
                })),
            };
          });
          setWorkflows(mappedWorkflows);
        }
        setIsLoading(false);
      })
      .catch((error) => {
        message(error.response?.data?.message || error.message);
        setIsLoading(false);
      });
  }, [workflowsRequest, projID]);

  // Fetch workflows when the modal is opened
  useEffect(() => {
    getWorkflows();
  }, [getWorkflows]);

  const handleWorkflowSelect = (workflow: SavedWorkflow) => {
    setSelectedWorkflow(workflow);
    setStep(2);
  };

  const handleImport = () => {
    if (!selectedWorkflow) return;

    onImport(selectedWorkflow);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl my-4">
        <div className="flex flex-col h-[calc(100vh-2rem)]">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <h3 className="text-xl font-semibold">Import Workflow</h3>
                <div className="flex items-center ml-4 text-sm text-gray-500">
                  <span className={step === 1 ? 'text-blue-600 font-medium' : ''}>
                    Select Workflow
                  </span>
                  <ChevronRight className="w-4 h-4 mx-2" />
                  <span className={step === 2 ? 'text-blue-600 font-medium' : ''}>
                    Review Tasks
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {step === 1 ? (
              isLoading ? (
                <div className="flex flex-col items-center justify-center h-full py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                  <h3 className="text-lg font-medium text-gray-900">Loading workflows...</h3>
                  <p className="text-sm text-gray-500 mt-2">Please wait while we fetch available workflows.</p>
                </div>
              ) : workflows.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {workflows.map((workflow) => (
                    <div
                      key={workflow.id}
                      onClick={() => handleWorkflowSelect(workflow)}
                      className="border rounded-sm p-4 m-4 hover:border-blue-500 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start">
                        <FileJson className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
                        <div className="ml-3">
                          <h4 className="font-medium text-gray-900">{workflow.name}</h4>
                          <p className="text-sm text-gray-500 mt-1">{workflow.description || 'No description available'}</p>
                          <div className="mt-2 text-xs text-gray-400">
                          {workflow.steps?.length || 0} tasks
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-12">
                  <FileX className="w-12 h-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No workflows found</h3>
                  <p className="text-sm text-gray-500 mt-2">There are no workflows available to import.</p>
                </div>
              )
            ) : (
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">{selectedWorkflow?.name}</h4>
                  <p className="text-sm text-gray-500">{selectedWorkflow?.description}</p>
                </div>

                <div className="m-6">
                  {selectedWorkflow?.steps.map((step, index) => (
                    <div key={step.id} className="border rounded-lg my-4 overflow-hidden">
                      <div className="bg-gray-50 p-4 border-b">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3">
                            {index + 1}
                          </div>
                          <h5 className="font-medium text-gray-900">
                            {step.name}
                          </h5>
                        </div>
                      </div>
                      <div className="p-4 space-y-4">
                        {step.tasks.map((task) => (
                          <div key={task.id} className="rounded-lg border bg-white overflow-hidden">
                            <div className="p-4 border-b bg-gray-50">
                              <div className="font-medium text-gray-800">
                                {task.name}
                              </div>
                              {/* Additional info */}
                              <div className="text-sm text-gray-500 mt-1">
                                <div>
                                  <span className="font-semibold">Type:</span> {task.type}
                                </div>
                                {task.implementationRef && (
                                  <div>
                                    <span className="font-semibold">Implementation:</span> {task.implementationRef}
                                  </div>
                                )}
                                {task.description && (
                                  <div>
                                    <span className="font-semibold">Description:</span> {task.description}
                                  </div>
                                )}
                                {task.hyperParameters && task.hyperParameters.length > 0 && (
                                  <div className="mt-2">
                                    <span className="font-semibold">Hyperparameters:</span>
                                    <ul className="list-disc ml-5">
                                      {task.hyperParameters.map((param, idx) => (
                                        <li key={idx}>
                                          <span className="font-medium">{param.name}</span>
                                          {param.type === 'categorical' && param.options && (
                                            <>: [Options: {param.options.join(', ')}]</>
                                          )}
                                          {param.type === 'number' && param.range && (
                                            <>: [Range: {param.range[0]} - {param.range[1]}]</>
                                          )}
                                          {param.default !== undefined && (
                                            <> (Default: {param.default})</>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t">
            <div className="flex justify-end space-x-3">
              {step === 2 && (
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
              )}
              <button
                onClick={step === 1 ? onClose : handleImport}
                disabled={
                  step === 2 &&
                  (!selectedWorkflow ||
                    !selectedWorkflow.steps ||
                    selectedWorkflow.steps.length === 0 ||
                    selectedWorkflow.steps.every((step) => !step.tasks || step.tasks.length === 0))
                }
                className={`px-4 py-2 rounded-lg ${
                  step === 1
                    ? 'border hover:bg-gray-50'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                } ${
                  step === 2 &&
                  (!selectedWorkflow ||
                    !selectedWorkflow.steps ||
                    selectedWorkflow.steps.length === 0 ||
                    selectedWorkflow.steps.every((step) => !step.tasks || step.tasks.length === 0))
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
              >
                {step === 1 ? 'Cancel' : 'Import Workflow'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}