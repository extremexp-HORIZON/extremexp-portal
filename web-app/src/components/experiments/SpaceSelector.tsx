import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { Space, SavedWorkflow } from '../../types/experiments';

interface SpaceSelectorProps {
  spaces: Space[];
  onAddSpace: (name: string) => void;
  onSelectSpace: (spaceId: string) => void;
  onImportWorkflow: (spaceId: string, workflow: SavedWorkflow) => void;
}

const sampleWorkflows: SavedWorkflow[] = [
  {
    id: 'workflow-1',
    name: 'Image Classification',
    description: 'Basic image classification pipeline',
    createdAt: '2024-03-20',
    tasks: [
      {
        id: 'task-1',
        name: 'Feature Extraction',
        variants: [
          {
            id: 'variant-1',
            name: 'CNN Features',
            hyperParameters: [
              {
                name: 'layers',
                type: 'number',
                default: 3,
                range: [1, 5]
              }
            ]
          },
          {
            id: 'variant-2',
            name: 'SIFT Features',
            hyperParameters: [
              {
                name: 'keypoints',
                type: 'number',
                default: 100,
                range: [50, 500]
              }
            ]
          }
        ]
      },
      {
        id: 'task-2',
        name: 'Classification',
        variants: [
          {
            id: 'variant-3',
            name: 'Random Forest',
            hyperParameters: [
              {
                name: 'n_estimators',
                type: 'number',
                default: 100,
                range: [10, 1000]
              }
            ]
          },
          {
            id: 'variant-4',
            name: 'SVM',
            hyperParameters: [
              {
                name: 'C',
                type: 'number',
                default: 1.0,
                range: [0.1, 10.0]
              }
            ]
          }
        ]
      }
    ],
    steps: []
  }
];

export function SpaceSelector({ spaces, onAddSpace, onSelectSpace, onImportWorkflow }: SpaceSelectorProps) {
  const [showNewSpace, setShowNewSpace] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [selectedSpace, setSelectedSpace] = useState<string | null>(null);
  const [showWorkflowSelector, setShowWorkflowSelector] = useState(false);

  const handleAddSpace = () => {
    if (newSpaceName.trim()) {
      onAddSpace(newSpaceName);
      setNewSpaceName('');
      setShowNewSpace(false);
    }
  };

  const handleSpaceSelect = (spaceId: string) => {
    setSelectedSpace(spaceId);
    onSelectSpace(spaceId);
    setShowWorkflowSelector(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Spaces</h2>
        <button
          onClick={() => setShowNewSpace(true)}
          className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Space
        </button>
      </div>

      {showNewSpace && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Create New Space</h3>
              <button
                onClick={() => setShowNewSpace(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              value={newSpaceName}
              onChange={(e) => setNewSpaceName(e.target.value)}
              placeholder="Enter space name"
              className="w-full px-3 py-2 border rounded-lg mb-4"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowNewSpace(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSpace}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {spaces.map((space) => (
          <div
            key={space.id}
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              selectedSpace === space.id
                ? 'border-blue-500 bg-blue-50'
                : 'hover:border-gray-400'
            }`}
            onClick={() => handleSpaceSelect(space.id)}
          >
            <h3 className="font-medium text-gray-900">{space.name}</h3>
            {space.workflow ? (
              <p className="text-sm text-gray-600 mt-2">
                Using: {space.workflow.name}
              </p>
            ) : (
              <p className="text-sm text-gray-500 mt-2">No workflow selected</p>
            )}
          </div>
        ))}
      </div>

      {showWorkflowSelector && selectedSpace && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Select Workflow</h3>
              <button
                onClick={() => setShowWorkflowSelector(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {sampleWorkflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="border rounded-lg p-4 hover:border-blue-500 cursor-pointer"
                  onClick={() => {
                    onImportWorkflow(selectedSpace, workflow);
                    setShowWorkflowSelector(false);
                  }}
                >
                  <h4 className="font-medium text-gray-900">{workflow.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{workflow.description}</p>
                  
                  {workflow.tasks && (
                    <div className="mt-4">
                      <h5 className="font-medium text-gray-700 mb-2">Available Tasks</h5>
                      <div className="space-y-2">
                        {workflow.tasks.map((task) => (
                          <div key={task.id} className="bg-gray-50 p-3 rounded-lg">
                            <div className="font-medium text-gray-800">{task.name}</div>
                            <div className="mt-2 text-sm text-gray-600">
                              Variants: {task.variants.map((v: any) => v.name).join(', ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}