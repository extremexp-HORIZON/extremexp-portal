import { useState } from 'react';
import type { HyperParameter } from '../../types/experiments';

interface ParameterControlsProps {
  param: HyperParameter;
  taskId: string;
  onParamChange: (taskId: string, paramName: string, newValue: number | string | boolean) => void;
}

export function ParameterControls({ param, taskId, onParamChange }: ParameterControlsProps) {
  // Use local state for this specific parameter only
  const [localValue, setLocalValue] = useState<number | string | boolean | (string | number | boolean)[]>(
    param.values && param.values.length > 0 ? param.values[0] : (param.default ?? false)
  );

  const isInteger = param.type === 'integer' || param.type === 'number';
  const isArray = param.type === 'array';
  const isBlob = param.type === 'blob';
  
  console.log(`Parameter ${param.name} (${param.type}) - Local value:`, localValue);

  // Simple handlers for different parameter types
  const handleValueChange = (newValue: number | string | boolean | (string | number | boolean)[]) => {
    console.log(`Parameter ${param.name} changed to:`, newValue);
    setLocalValue(newValue);
    param.values = Array.isArray(newValue) ? newValue : [newValue];
    onParamChange(taskId, param.name, newValue as number | string | boolean);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
          {param.name}
          <span className="text-xs text-gray-400 font-normal px-2 py-1 bg-gray-200 rounded">
            {param.type}
          </span>
          {param.range && (
            <span className="text-xs text-blue-600 font-normal">
              [{param.range[0]} - {param.range[1]}]
            </span>
          )}
        </label>
      </div>


      {/* Blob: true/false options only */}
      {isBlob && (
        <div className="space-y-2">
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={String(localValue)}
            onChange={e => {
              const val = e.target.value === 'true';
              handleValueChange(val);
            }}
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
          <div className="text-xs text-gray-500">
            Current value: {String(localValue)}
          </div>
        </div>
      )}

      {/* Simple input for other parameter types */}
      {!isBlob && !isArray && (
        <div className="space-y-2">
          <input
            type={isInteger ? "number" : "text"}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={String(localValue)}
            onChange={e => {
              const newValue = e.target.value;
              if (isInteger) {
                const num = Number(newValue);
                if (!isNaN(num)) {
                  handleValueChange(num);
                }
              } else {
                handleValueChange(newValue);
              }
            }}
            placeholder={`Enter ${param.name.toLowerCase()}`}
          />
        </div>
      )}

      {/* Array: separate values by comma */}
      {isArray && (
        <div className="space-y-2">
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter values separated by commas (e.g., 1, 2, 3)"
            value={Array.isArray(localValue) ? localValue.join(', ') : String(localValue)}
            onChange={e => {
              const arrayValues = e.target.value.split(',').map(v => v.trim()).filter(v => v !== '');
              handleValueChange(arrayValues as (string | number | boolean)[]);
            }}
          />
        </div>
      )}
    </div>
  );
}