import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Database, 
  Brain, 
  X, 
  Settings,
  Plus,
} from 'lucide-react';
import type { WorkflowStep as WorkflowStepType } from '../../types/experiments';

interface WorkflowStepProps {
  step: WorkflowStepType;
  onRemove: (id: string) => void;
  onSelectTask: (stepId: string, taskId: string) => void;
  onParamChange: (stepId: string, taskId: string, paramName: string, newValue: number) => void;
}

export function WorkflowStep({
  step,
  onSelectTask,
  onParamChange,
}: WorkflowStepProps) {
  const {
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'preprocessing':
        return <Settings className="w-5 h-5 text-purple-600 mr-3" />;
      case 'algorithm':
        return <Brain className="w-5 h-5 text-blue-600 mr-3" />;
      case 'dataset':
        return <Database className="w-5 h-5 text-green-600 mr-3" />;
      default:
        return <Settings className="w-5 h-5 text-gray-600 mr-3" />;
    }
  };

  const [parameterValues, setParameterValues] = React.useState<Record<string, {
    type: 'range' | 'enumeration';
    values: number[];
    range?: { min: number; max: number };
  }>>({});

  const handleParameterTypeChange = (
    taskId: string,
    paramName: string,
    paramType: string,
    type: 'range' | 'enumeration'
  ) => {
    // For integer parameters, force enumeration type
    if (paramType === 'integer') {
      type = 'enumeration';
    }

    // Update the actual param.values in the task object
    const task = step.tasks.find(t => t.id === taskId);
    if (task) {
      const param = task.hyperParameters?.find(p => p.name === paramName);
      if (param) {
        if (type === 'enumeration') {
          param.values = param.values && param.values.length > 0 ? [...param.values] : [0];
        } else {
          delete param.values;
        }
      }
    }

    setParameterValues(prev => {
      // Find the task and param for values
      const task = step.tasks.find(t => t.id === taskId);
      let values: number[] = [0];
      if (task) {
        const paramObj = task.hyperParameters?.find(p => p.name === paramName);
        if (paramObj && Array.isArray(paramObj.values) && paramObj.values.length > 0) {
          values = [...paramObj.values];
        } else if (paramObj && typeof paramObj.default === 'number') {
          values = [paramObj.default];
        }
      }
      return {
        ...prev,
        [`${taskId}-${paramName}`]: {
          type,
          values: type === 'enumeration' ? values : [],
          range: type === 'range' ? { min: 0, max: 1 } : undefined
        }
      };
    });
  };

  const handleRangeChange = (taskId: string, paramName: string, value: number, type: 'min' | 'max') => {
      setParameterValues(prev => {
        const prevRange = prev[`${taskId}-${paramName}`]?.range || { min: 0, max: 1 };
        const newRange = {
          min: type === 'min' ? value : prevRange.min,
          max: type === 'max' ? value : prevRange.max,
        };
        return {
          ...prev,
          [`${taskId}-${paramName}`]: {
            ...prev[`${taskId}-${paramName}`],
            range: newRange,
          }
        };
      });
    };

  const handleEnumerationChange = (taskId: string, paramName: string, index: number, value: number) => {
    setParameterValues(prev => {
      const values = [...(prev[`${taskId}-${paramName}`]?.values || [])];
      values[index] = value;

      // Update the actual param.values in the task object
      const task = step.tasks.find(t => t.id === taskId);
      if (task) {
        const param = task.hyperParameters?.find(p => p.name === paramName);
        if (param) {
          param.values = values;
          // Notify parent of change
          onParamChange(step.id, taskId, paramName, value);
        }
      }

      return {
        ...prev,
        [`${taskId}-${paramName}`]: {
          ...prev[`${taskId}-${paramName}`],
          values
        }
      };
    });
  };

  const addEnumerationValue = (taskId: string, paramName: string) => {
    setParameterValues(prev => {
      const oldValues = prev[`${taskId}-${paramName}`]?.values || [];
      const values = [...oldValues, 0];

      // Update the actual param.values in the task object
      const task = step.tasks.find(t => t.id === taskId);
      if (task) {
        const param = task.hyperParameters?.find(p => p.name === paramName);
        if (param) {
          param.values = values;
        }
      }

      return {
        ...prev,
        [`${taskId}-${paramName}`]: {
          ...prev[`${taskId}-${paramName}`],
          values
        }
      };
    });
  };

  const removeEnumerationValue = (taskId: string, paramName: string, index: number) => {
    setParameterValues(prev => {
      const oldValues = prev[`${taskId}-${paramName}`]?.values || [];
      const values = oldValues.filter((_, i) => i !== index);

      // Update the actual param.values in the task object
      const task = step.tasks.find(t => t.id === taskId);
      if (task) {
        const param = task.hyperParameters?.find(p => p.name === paramName);
        if (param) {
          param.values = values;
        }
      }

      return {
        ...prev,
        [`${taskId}-${paramName}`]: {
          ...prev[`${taskId}-${paramName}`],
          values
        }
      };
    });
  };

  const handleParamValueChange = (taskId: string, paramName: string, newValue: number) => {
    // Find the task and parameter and update its value
    const task = step.tasks.find(t => t.id === taskId);
    if (!task) return;
    const param = task.hyperParameters?.find(p => p.name === paramName);
    if (param) {
      // For range, update values[0] or values[1] if needed
      if (Array.isArray(param.values) && param.values.length > 0) {
        param.values[0] = newValue;
      } else {
        param.values = [newValue];
      }
      // Notify parent of change
      onParamChange(step.id, taskId, paramName, newValue);
    }
  };

  React.useEffect(() => {
    // Initialize parameterValues from param.values if present
    const initial: typeof parameterValues = {};
    step.tasks.forEach(task => {
      task.hyperParameters?.forEach(param => {
        const key = `${task.id}-${param.name}`;
        if (param.values && param.values.length > 0) {
          initial[key] = {
            type: 'enumeration',
            values: [...param.values],
          };
        } else if (typeof param.default === 'number') {
          initial[key] = {
            type: 'enumeration',
            values: [param.default],
          };
        }
      });
    });
    setParameterValues(initial);
    // Only run when step changes (e.g., on load)
    // eslint-disable-next-line
  }, [step]);

  return (
    <div ref={setNodeRef} style={style} className="space-y-2">
      <div className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-center mb-4">
          {getStepIcon(step.type)}
          <span className="flex-1 font-medium text-gray-700">{ !(step.tasks && step.tasks.length > 0 )&& step.name}</span>
        </div>

        {step.tasks && step.tasks.length > 0 && (
          <div className="ml-12 space-y-4">
            {step.tasks.map((task) => (
              <div key={task.id} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center mb-3">
                  <input
                    type="radio"
                    name={`task-${step.id}`}
                    checked={task.selected}
                    onChange={() => onSelectTask(step.id, task.id)}
                    className="mr-3"
                  />
                  <span className="font-medium text-gray-700">{task.name}</span>
                </div>

                {task.selected && task.hyperParameters && (
                  <div className="space-y-4">
                    {task.hyperParameters.map((param) => {
                      const paramKey = `${task.id}-${param.name}`;
                      const paramValue = parameterValues[paramKey];
                      const isInteger = param.type === 'number' || param.type === 'categorical';
                      
                      React.useEffect(() => {
                        if (
                          (isInteger || paramValue?.type === 'enumeration') &&
                          (!paramValue || !paramValue.values || paramValue.values.length === 0)
                        ) {
                          setParameterValues(prev => ({
                            ...prev,
                            [`${task.id}-${param.name}`]: {
                              ...(paramValue || { type: 'enumeration' }),
                              values: [typeof param.default === 'number' ? param.default : 0],
                            },
                          }));
                        }
                        // Only run on mount or when paramValue changes
                        // eslint-disable-next-line
                      }, [paramValue]);

                      return (
                        <div key={param.name} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-600">
                              {param.name}
                            </label>
                            {!isInteger && (
                              <div className="flex items-center space-x-2">
                                <label className="inline-flex items-center">
                                  <input
                                    type="radio"
                                    className="form-radio"
                                    name={`param-type-${task.id}-${param.name}`}
                                    checked={!paramValue || paramValue.type === 'range'}
                                    onChange={() => handleParameterTypeChange(task.id, param.name, param.type, 'range')}
                                  />
                                  <span className="ml-2 text-sm">Range</span>
                                </label>
                                <label className="inline-flex items-center">
                                  <input
                                    type="radio"
                                    className="form-radio"
                                    name={`param-type-${task.id}-${param.name}`}
                                    checked={paramValue?.type === 'enumeration'}
                                    onChange={() => handleParameterTypeChange(task.id, param.name, param.type, 'enumeration')}
                                  />
                                  <span className="ml-2 text-sm">Enumeration</span>
                                </label>
                              </div>
                            )}
                          </div>

                          {!isInteger && (!paramValue || paramValue.type === 'range') && (
                            <div className="parameter-control">
                              <div className="parameter-input-container">
                                <input
                                  type="number"
                                  className="parameter-input"
                                  value={paramValue?.range?.min ?? param.range?.[0] ?? 0}
                                  onChange={(e) => {
                                    handleRangeChange(task.id, param.name, Number(e.target.value), 'min');
                                    handleParamValueChange(task.id, param.name, Number(e.target.value));
                                  }}
                                />
                              </div>
                              <input
                                type="range"
                                className="parameter-range"
                                min={param.range?.[0] ?? 0}
                                max={param.range?.[1] ?? 1}
                                step={(param.range?.[1] ?? 1 - (param.range?.[0] ?? 0)) / 100}
                                value={paramValue?.range?.min ?? param.range?.[0] ?? 0}
                                onChange={(e) => handleRangeChange(task.id, param.name, Number(e.target.value), 'min')}
                              />
                              <div className="parameter-input-container">
                                <input
                                  type="number"
                                  className="parameter-input"
                                  value={paramValue?.range?.max ?? param.range?.[1] ?? 1}
                                  onChange={(e) => handleRangeChange(task.id, param.name, Number(e.target.value), 'max')}
                                />
                              </div>
                            </div>
                          )}

                          {(isInteger || paramValue?.type === 'enumeration') && (
                            <div className="space-y-2">
                              {(() => {
                                const paramKey = `${task.id}-${param.name}`;
                                const values = parameterValues[paramKey]?.values || [];

                                return values.map((value, index) => (
                                  <div key={index} className="flex items-center space-x-2">
                                    <input
                                      type="number"
                                      className="flex-1 px-2 py-1 border rounded text-sm"
                                      value={value}
                                      onChange={e => {
                                        const newValue = Number(e.target.value);
                                        handleEnumerationChange(task.id, param.name, index, newValue);
                                      }}
                                    />
                                    {values.length > 1 && (
                                      <button
                                        onClick={() => removeEnumerationValue(task.id, param.name, index)}
                                        className="text-gray-400 hover:text-red-500"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                ));
                              })()}
                              <button
                                onClick={() => addEnumerationValue(task.id, param.name)}
                                className="flex items-center text-sm text-blue-600 hover:text-blue-700"
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                Add Value
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}