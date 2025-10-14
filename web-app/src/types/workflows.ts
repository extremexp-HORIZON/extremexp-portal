import { timeNow } from '../utils/timeToDate';
import { Node, Edge } from 'reactflow';
import type { ExperimentStep } from './experiments';

export interface Project {
  id_project: string;
  name: string;
  description: string;
  create_at: number;
  update_at: number;
}

export interface GraphicalModelType {
  nodes: Array<Node>;
  edges: Array<Edge>;
}

export interface WorkflowType {
  id_workflow: string;
  project_id: string;
  name: string;
  create_at: number;
  update_at: number;
  graphical_model: GraphicalModelType;
}

export interface ExperimentType {
  id_experiment: string;
  project_id: string;
  name: string;
  create_at: number;
  update_at: number;
  steps: ExperimentStep[];
}

export const defaultProject = {
  id_project: 'default',
  name: '',
  description: '',
  create_at: timeNow(),
  update_at: timeNow(),
};

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

export const defaultGraphicalModel = {
  nodes: initialNodes,
  edges: initialEdges,
};

export const defaultWorkflow = {
  id_workflow: '',
  project_id: '',
  name: '',
  create_at: NaN,
  update_at: NaN,
  graphical_model: defaultGraphicalModel,
};


 
export const defaultExperiment = {
  id_experiment: '',
  project_id: '',
  name: '',
  create_at: NaN,
  update_at: NaN,
  steps: [],
};
