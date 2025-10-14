import { Draft } from 'immer';

// Generic action types for common operations
export type AddAction<T> = {
  type: 'ADD';
  payload: T;
};

export type UpdateAction<T> = {
  type: 'UPDATE';
  payload: { index: number; value: T };
};

export type DeleteAction = {
  type: 'DELETE';
  payload: number; // index
};

export type GenericAction<T> = AddAction<T> | UpdateAction<T> | DeleteAction;

// Generic reducer factory
export function createArrayReducer<T>() {
  return (draft: Draft<T[]>, action: GenericAction<T>) => {
    switch (action.type) {
      case 'ADD':
        draft.push(action.payload as Draft<T>);
        break;
      case 'UPDATE':
        if (action.payload.index >= 0 && action.payload.index < draft.length) {
          draft[action.payload.index] = action.payload.value as Draft<T>;
        }
        break;
      case 'DELETE':
        if (action.payload >= 0 && action.payload < draft.length) {
          draft.splice(action.payload, 1);
        }
        break;
      default:
        break;
    }
  };
}

// Specific reducers for common types
export const numberReducer = createArrayReducer<number>();
export const stringReducer = createArrayReducer<string>();
export const booleanReducer = createArrayReducer<boolean>();

// Range-specific types and reducer
export interface RangeValue {
  min: number;
  max: number;
  step: number;
  minInclusive: boolean;
  maxInclusive: boolean;
}

export type RangeAction = 
  | { type: 'ADD_RANGE'; payload: RangeValue }
  | { type: 'UPDATE_RANGE'; payload: { index: number; value: RangeValue } }
  | { type: 'DELETE_RANGE'; payload: number };

export function rangeReducer(draft: Draft<RangeValue[]>, action: RangeAction) {
  switch (action.type) {
    case 'ADD_RANGE':
      draft.push(action.payload);
      break;
    case 'UPDATE_RANGE':
      if (action.payload.index >= 0 && action.payload.index < draft.length) {
        draft[action.payload.index] = action.payload.value;
      }
      break;
    case 'DELETE_RANGE':
      if (action.payload >= 0 && action.payload < draft.length) {
        draft.splice(action.payload, 1);
      }
      break;
    default:
      break;
  }
}