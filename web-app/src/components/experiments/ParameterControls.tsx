import { useState } from "react";
import type { HyperParameter } from "../../types/experiments";

import { Plus, Trash } from "lucide-react";

interface ParameterControlsProps {
  param: HyperParameter;
  taskId: string;
  taskSelected: boolean;
  onParamChange: (
    taskId: string,
    paramName: string,
    newValues: (number | string | boolean)[]
  ) => void;
}

export function ParameterControls(props: ParameterControlsProps) {
  const { param, taskId, taskSelected, onParamChange } = props;
  const [inputValue, setInputValue] = useState<any>("");
  const isInteger = param.type === "integer";
  const isString = param.type === "string";
  const isBoolean = param.type === "boolean";
  const isRange = param.type === "range";

  // Simple handlers for different parameter types
  const handleValueAdd = (e: any) => {
    let newValues = param.values as (number | string | boolean)[];
    if (newValues.includes(inputValue)){
      return;
    }
    newValues = newValues ? [...newValues, inputValue] : [inputValue];
    onParamChange(taskId, param.name, newValues);
    setInputValue("");
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
  };

  const handleValueDelete = (value: number | string | boolean) => () => {
    let newValues = param.values as (number | string | boolean)[];
    newValues = newValues.filter((v) => v !== value);
    onParamChange(taskId, param.name, newValues);
  }

  const handleValueChangeRange = (index: number) => (e: React.ChangeEvent<HTMLInputElement>) =>  {
    const newValue = Number(e.target.value);
    let newValues = param.values as number[] || [];

    if (newValue > newValues[1] && index === 0) {
      // Min cannot be greater than Max
      return;
    }
    if (newValue < newValues[0] && index === 1) {
      // Max cannot be less than Min
      return;
    }
    newValues[index] = Number(e.target.value);
    onParamChange(taskId, param.name, newValues as (number | string | boolean)[]);
  };

  return (
    <div className="py-3 flex-row space-y-2">
      <div className="flex flex-col gap-y-2">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
          {param.name}
          <span className="text-xs text-gray-400 font-normal px-1 py-1 bg-gray-200 rounded">
            {param.type}
          </span>
        </label>
        {(isInteger || isString) && (
          <div className="flex justify-between">
            <div className="flex items-center w-5/6 gap-x-2">
              <input
                type={isInteger ? "number" : "text"}
                className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                value={inputValue}
                disabled={!taskSelected}
                onChange={handleValueChange}
                placeholder={`Add new value`}
              />
            </div>
          
            <button
            type="button"
            className="hover:text-blue-500 transition-colors duration-200 hover:bg-blue-50 rounded-md p-1"
            onClick={handleValueAdd}
            >
            <Plus className="w-4 h-4" />
            </button>
        </div>
        )}
        <div className="flex flex-row gap-1 flex-wrap">
          {!isRange &&
            param.values?.map((value) => (
              <div
                className={`flex justify-center border-2 rounded-md w-max px-2 ${taskSelected ? 'bg-white' : 'bg-gray-100'}`}
                key={`${param.name}-value-${String(value)}`}
              >
                <span key={String(value)} className="text-sm text-gray-600">
                  {String(value)}
                </span>
                <button
                  type="button"
                  className={`ml-2 ${taskSelected ? 'hover:text-red-500' : 'text-gray-400 cursor-not-allowed'}`}
                  disabled={!taskSelected}
                  onClick={handleValueDelete(value)}
                >
                  <Trash className="w-3 h-3"/>
                </button>
              </div>
            ))}
          {isRange && param.values && (
            <div className="flex flex-col justify-center gap-y-1">
              <div className="w-full flex items-center gap-x-3">
                <span>Min:</span>
                <input
                  type={"number"}
                  className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  value={param.values[0] as number}
                  disabled={!taskSelected}
                  onChange={handleValueChangeRange(0)}
                  placeholder={`Value`}
                />
              </div>
              <div className="w-full flex items-center gap-x-3">
                <span>Max:</span>
                <input
                  type={"number"}
                  className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  value={param.values[1] as number}
                  disabled={!taskSelected}
                  onChange={handleValueChangeRange(1)}
                  placeholder={`Value`}
                />
              </div>
              <div className="w-full flex items-center gap-x-3">
                <span>Step:</span>
                <input
                  type={"number"}
                  className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  value={param.values[2] as number}
                  disabled={!taskSelected}
                  onChange={handleValueChangeRange(2)}
                  placeholder={`Value`}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
