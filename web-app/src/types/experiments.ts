export interface HyperParameter {
  id?: string;
  name: string;
  type: 'integer' | 'string' | 'boolean' | 'range';
  default?: number | string | boolean;
  range?: [number, number];
  options?: (string | number | boolean)[];
  values?: (number | string | boolean)[];
  inputType?: 'range' | 'enumeration' | 'text' | 'number';
}

export interface Task {
  id: string;
  name: string;
  type: 'dataset' | 'algorithm' | 'preprocessing' | 'evaluation';
  hyperParameters: HyperParameter[];
  selected: boolean;
  implementationRef?: string;
  description?: string;
  isAbstract?: boolean;
}

export interface Step {
  id: string;
  name: string;
  type: 'dataset' | 'algorithm' | 'preprocessing' | 'evaluation';
  tasks: Task[];
  subSteps?: Step[];
  collapsed?: boolean;
  hyperParameterTuningEnabled?: boolean;
  gridSearchEnabled?: boolean;
}

export interface SearchOption {
  id: string;
  paramId: string;
  min?: number;
  max?: number;
  values?: number[];
  inputType: 'range' | 'enumeration';
}

export interface Space {
  id: string;
  name: string;
  steps: Step[];
  collapsed?: boolean;
  status: 'idle' | 'running' | 'completed' | 'error';
  executionTime?: number;
  gridSearchEnabled?: boolean;
  searchMethod?: SearchMethod;
  searchOptions?: SearchOption[];
  workflow?: SavedWorkflow;
  workflow_id?: string;
  workflow_overrides?: Record<string, any>; // Add workflow_overrides property
}

export interface Node {
  id: string;
  name: string;
  type: 'container' | 'task';
  spaces: Space[];
  collapsed?: boolean;
  status: 'idle' | 'running' | 'completed' | 'error';
  executionOrder: number;
  data?: {
    variants: {
      id_task: string;
      name: string;
      implementationRef: string;
      isAbstract: boolean;
      parameters: {
        id: string;
        name: string;
        type: string;
        values: number[];
      }[];
      description: string;
    }[];
  };
}

export type SearchMethod = 'grid' | 'random' | 'bayesian' | 'evolutionary';

export interface WorkflowStep extends Step {
  onRemove?: (id: string) => void;
  onSelectTask?: (stepId: string, taskId: string) => void;
}

export interface SavedWorkflow {
  id: string;
  name: string;
  description: string;
  steps: Step[];
  createdAt: string;
  nodes?: Node[];
  tasks?: any[]; // Add tasks property for compatibility
}

export interface StepSelectorProps {
  algorithms: Step[];
  datasets: Step[];
  preprocessing: Step[];
  onSelect: (step: Step) => void;
  onClose?: () => void;
}

export interface ImportWorkflowModalProps {
  onClose: () => void;
  onImport: (workflow: SavedWorkflow) => void;
}

export interface ExperimentSave {
  name: string;
  create_at?: number;
  update_at?: number;
  steps: ExperimentStep[];
}

export interface ExperimentStep {
  id: string;
  name: string;
  type: string;
  executionOrder?: number;
  status?: 'idle' | 'running' | 'completed' | 'error';
  spaces: ExperimentSpace[];
}

export interface ExperimentSpace {
  id: string;
  name: string;
  status?: 'idle' | 'running' | 'completed' | 'error';
  searchMethod?: 'grid' | 'random' | 'bayesian' | 'evolutionary';
  workflow_id?: string; // Reference to imported workflow
  steps?: WorkflowStep[]; // Add steps property
}


export interface WorkflowTask {
  id: string;
  name: string;
  type: 'dataset' | 'algorithm' | 'preprocessing' | 'evaluation';
  selected: boolean;
  hyperParameters: HyperParameter[];
  implementationRef?: string;
  description?: string;
  isAbstract?: boolean;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'preprocessing' | 'algorithm' | 'dataset' | 'evaluation';
  tasks: WorkflowTask[];
  subSteps?: WorkflowStep[];
  collapsed?: boolean;
  hyperParameterTuningEnabled?: boolean;
  gridSearchEnabled?: boolean;
}
