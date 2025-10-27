import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Database, 
  Brain, 
  Settings,
} from 'lucide-react';
import type { WorkflowStep as WorkflowStepType } from '../../types/experiments';
import { TaskCard } from './TaskCard';

interface WorkflowStepProps {
  step: WorkflowStepType;
  onRemove: (id: string) => void;
  onSelectTask: (stepId: string, taskId: string) => void;
  onParamChange: (taskId: string, paramName: string, newValues: (number | string | boolean)[]) => void;
}

const WorkflowStep = (props: WorkflowStepProps) => {
  const { step, onRemove, onSelectTask, onParamChange } = props;
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

  return (
    <div ref={setNodeRef} style={style} className="space-y-2">
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-200">
        <div className="flex items-center mb-4">
          {getStepIcon(step.type)}
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-lg">
              {step.name || 'Unnamed Step'}
            </h3>
            <p className="text-sm text-gray-500 capitalize">
              {step.type} step
            </p>
          </div>
        </div>

        {step.tasks && step.tasks.length > 0 ? (
          <div className="space-y-4">
            {step.tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                stepId={step.id}
                onSelectTask={onSelectTask}
                onParamChange={onParamChange}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Settings className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">No tasks available for this step</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkflowStep;