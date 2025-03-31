import { ExperimentType } from './experiment';
import { TaskType } from './task';

export type LoginResponseType = {
  access_token: string;
  expires_in: number;
  refresh_expires_in: number;
  refresh_token: string;
  token_type: string;
  id_token: string;
  "not-before-policy": number;
  session_state: string;
  scope: string;
};

export type RegisterResponseType = {
  id: string,
  createdTimestamp: number,
  username: string,
  enabled: boolean,
  totp: boolean,
  emailVerified: boolean,
  firstName: string,
  lastName: string,
  email: string,
  attributes: object[],
  disableableCredentialTypes: object[],
  requiredActions: object[],
  notBefore: number,
  access: object[],
};

export type ProjectsResponseType = {
  message: string;
  data: {
    projects: [];
  };
};

export type CreateProjectResponseType = {
  message: string;
  data: {
    id_project: string;
  };
};

export type UpdateProjectResponseType = {
  message: string;
};

export type DeleteProjectResponseType = {
  message: string;
};

export type ExperimentResponseType = {
  message: string;
  data: {
    experiment: ExperimentType;
  };
};

export type ExperimentsResponseType = {
  message: string;
  data: {
    experiments: Array<ExperimentType>;
  };
};

export type CreateExperimentResponseType = {
  message: string;
  data: {
    id_experiment: string;
  };
};

export type UpdateExperimentNameResponseType = {
  message: string;
};

export type UpdateGraphicalModelResponseType = {
  message: string;
};

export type DeleteExperimentResponseType = {
  message: string;
};

export type CategoriesResponseType = {
  message: string;
  data: {
    categories: [];
  };
};

export type CreateCategoryResponseType = {
  message: string;
  data: {
    id_category: string;
  };
};

export type UpdateCategoryResponseType = {
  message: string;
};

export type DeleteCategoryResponseType = {
  message: string;
};

export type TasksResponseType = {
  message: string;
  data: {
    tasks: Array<TaskType>;
  };
};

export type TaskResponseType = {
  message: string;
  data: {
    task: TaskType;
  };
};

export type CreateTaskResponseType = {
  message: string;
  data: {
    id_task: string;
  };
};

export type UpdateTaskInfoResponseType = {
  message: string;
};

export type DeleteTaskResponseType = {
  message: string;
};

export type ConvertorResponseType = {
  message: string;
  data: {
    json: object;
    xmi: string;
  };
};
