import type { Task } from '../../types/experiments';
import { ParameterControls } from './ParameterControls';

interface TaskCardProps {
  task: Task;
  stepId: string;
  onSelectTask: (stepId: string, taskId: string) => void;
  onParamChange: (taskId: string, paramName: string, newValues: (number | string | boolean)[]) => void;
}

export function TaskCard({ task, stepId, onSelectTask, onParamChange }: TaskCardProps) {
  const handleSelectTask = () => {
    console.log('TaskCard - Radio clicked:', { stepId, taskId: task.id, taskName: task.name });
    onSelectTask(stepId, task.id);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors" style={{ width: "3.5rem"}}>
      <div className="flex items-center mb-4">
        <input
          type="radio"
          name={`task-${stepId}`}
          checked={task.selected}
          onChange={() => {}}
          onClick={handleSelectTask}
          className="mr-3 w-4 h-4 text-blue-600 focus:ring-blue-500"
        />
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{task.name}</h4>
          {task.description && (
            <p className="text-sm text-gray-600 mt-1">{task.description}</p>
          )}
          {task.implementationRef && (
            <p className="text-xs text-gray-500 mt-1">
              Implementation: {task.implementationRef}
            </p>
          )}
        </div>
      </div>

      {task.hyperParameters && task.hyperParameters.length > 0 && (
        <div className="w-100 border-t border-gray-200 pt-4">
          <h5 className="text-sm font-medium text-gray-700 mb-3">
            Hyperparameters ({task.hyperParameters.length})
          </h5>
          {task.hyperParameters.map((param: any) => (
            <ParameterControls
              key={param.name}
              param={param}
              taskId={task.id}
              taskSelected={task.selected}
              onParamChange={(taskId, paramName, newValues) => onParamChange(taskId, paramName, newValues)}
            />
          ))}
        </div>
      )}
    </div>
  );
}