// Common constants used across the application
export const ICON_CODES = {
  ADD: '&#xed1b;',
  COMPOSITE: '&#xe601;',
} as const;

export const PARAMETER_TYPES = {
  INTEGER: 'integer',
  REAL: 'real', 
  STRING: 'string',
  BOOLEAN: 'boolean',
  ARRAY: 'array',
  BLOB: 'blob',
  CATEGORICAL: 'categorical',
  NUMBER: 'number',
} as const;

export const STEP_TYPES = {
  PREPROCESSING: 'preprocessing',
  ALGORITHM: 'algorithm',
  DATASET: 'dataset',
  EVALUATION: 'evaluation',
} as const;

export const INPUT_TYPES = {
  RANGE: 'range',
  ENUMERATION: 'enumeration',
  TEXT: 'text',
  NUMBER: 'number',
} as const;

export const DEFAULT_RANGE = {
  min: 0,
  max: 10,
  step: 1,
} as const;

export const DEFAULT_BOOLEAN_OPTIONS = ['true', 'false'] as const;