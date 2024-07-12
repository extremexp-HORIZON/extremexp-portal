// TODO Orestis to update this schema if needed

export interface DatasetType {
  id_dataset: string;
  project_id: string;
  name: string;
  create_at: number;
  update_at: number;
}

export const defaultDataset = {
  id_dataset: '',
  project_id: '',
  name: '',
  create_at: NaN,
  update_at: NaN,
};
