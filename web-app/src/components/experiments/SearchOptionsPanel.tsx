import { useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import type { SearchOption, HyperParameter } from '../../types/experiments';

interface SearchOptionsPanelProps {
  spaceId: string;
  nodeId: string;
  hyperParameters: HyperParameter[];
  searchOptions: SearchOption[];
  onUpdateSearchOptions: (nodeId: string, spaceId: string, options: SearchOption[]) => void;
}

export function SearchOptionsPanel({
  spaceId,
  nodeId,
  hyperParameters,
  searchOptions,
  onUpdateSearchOptions,
}: SearchOptionsPanelProps) {
  const [selectedParam, setSelectedParam] = useState<string | null>(null);
  const [inputType, setInputType] = useState<'range' | 'enumeration'>('range');
  const [rangeMin, setRangeMin] = useState<string>('');
  const [rangeMax, setRangeMax] = useState<string>('');
  const [enumValues, setEnumValues] = useState<string[]>(['']);

  const handleAddOption = () => {
    if (!selectedParam) return;

    const param = hyperParameters.find(p => p.id === selectedParam);
    if (!param) return;

    const newOption: SearchOption = {
      id: `option-${Date.now()}`,
      paramId: selectedParam,
      inputType,
      ...(inputType === 'range' 
        ? { min: Number(rangeMin), max: Number(rangeMax) }
        : { values: enumValues.map(v => Number(v)).filter(v => !isNaN(v)) }
      )
    };

    const updatedOptions = [...searchOptions, newOption];
    onUpdateSearchOptions(nodeId, spaceId, updatedOptions);

    // Reset form
    setSelectedParam(null);
    setInputType('range');
    setRangeMin('');
    setRangeMax('');
    setEnumValues(['']);
  };

  const handleRemoveOption = (optionId: string) => {
    const updatedOptions = searchOptions.filter(opt => opt.id !== optionId);
    onUpdateSearchOptions(nodeId, spaceId, updatedOptions);
  };

  const handleAddEnumValue = () => {
    setEnumValues([...enumValues, '']);
  };

  const handleRemoveEnumValue = (index: number) => {
    setEnumValues(enumValues.filter((_, i) => i !== index));
  };

  const handleEnumValueChange = (index: number, value: string) => {
    const newValues = [...enumValues];
    newValues[index] = value;
    setEnumValues(newValues);
  };


  return (
    <div className="tailwind-scope space-y-4 mt-4 border-t pt-4">
      <h4 className="font-medium text-gray-700">Search Options</h4>
      
      <div className="space-y-4">
        {searchOptions.map((option) => {
          const param = hyperParameters.find(p => p.id === option.paramId);
          if (!param) return null;

          return (
            <div key={option.id} className="flex items-center space-x-4 bg-gray-50 p-3 rounded-lg">
              <span className="font-medium text-gray-700">{param.name}</span>
              <div className="flex-1">
                {option.inputType === 'range' ? (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Range:</span>
                    <span>{option.min} - {option.max}</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Values:</span>
                    <span>{option.values?.join(', ')}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => handleRemoveOption(option.id)}
                className="text-gray-400 hover:text-red-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="space-y-4 bg-white p-4 rounded-lg border">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parameter
            </label>
            <select
              value={selectedParam || ''}
              onChange={(e) => setSelectedParam(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm"
            >
              <option value="">Select parameter...</option>
              {hyperParameters.map((param) => (
                <option key={param.id} value={param.id}>
                  {param.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Input Type
            </label>
            <select
              value={inputType}
              onChange={(e) => setInputType(e.target.value as 'range' | 'enumeration')}
              className="w-full rounded-md border-gray-300 shadow-sm"
            >
              <option value="range">Range</option>
              <option value="enumeration">Enumeration</option>
            </select>
          </div>
        </div>

        {selectedParam && inputType === 'range' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Value
              </label>
              <input
                type="number"
                value={rangeMin}
                onChange={(e) => setRangeMin(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Value
              </label>
              <input
                type="number"
                value={rangeMax}
                onChange={(e) => setRangeMax(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm"
              />
            </div>
          </div>
        )}

        {selectedParam && inputType === 'enumeration' && (
          <div className="space-y-2">
            {enumValues.map((value, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="number"
                  value={value}
                  onChange={(e) => handleEnumValueChange(index, e.target.value)}
                  className="flex-1 rounded-md border-gray-300 shadow-sm"
                  placeholder="Enter value"
                />
                <button
                  onClick={() => handleRemoveEnumValue(index)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              onClick={handleAddEnumValue}
              className="flex items-center text-sm text-blue-600 hover:text-blue-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Value
            </button>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleAddOption}
            disabled={!selectedParam}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Search Option
          </button>
        </div>
      </div>
    </div>
  );
}