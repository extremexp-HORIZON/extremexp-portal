import React, { useEffect, useState } from 'react';
import { useImmerReducer } from 'use-immer';
import { numberReducer, stringReducer, booleanReducer, rangeReducer, RangeValue } from '../../utils/reducers';
import { ICON_CODES, DEFAULT_RANGE, DEFAULT_BOOLEAN_OPTIONS } from '../../utils/constants';
import DropDown from '../editor/ConfigPanel/SupportComponents/DropDown';
import RangeSelector from '../editor/ConfigPanel/SupportComponents/RangeSelector';

export type ParameterType = 'number' | 'string' | 'boolean' | 'range';

interface ParameterTableProps {
  type: ParameterType;
  values: (number | string | boolean | RangeValue)[];
  onValueUpdated: (values: (number | string | boolean | RangeValue)[]) => void;
  className?: string;
}

export function ParameterTable({ type, values, onValueUpdated, className = '' }: ParameterTableProps) {
  const [selectedType, setSelectedType] = useState<'range' | 'number'>(type === 'range' ? 'range' : 'number');
  
  // Initialize state based on type
  const getInitialState = () => {
    switch (type) {
      case 'number':
        return values.filter(v => typeof v === 'number') as number[];
      case 'string':
        return values.filter(v => typeof v === 'string') as string[];
      case 'boolean':
        return values.filter(v => typeof v === 'boolean') as boolean[];
      case 'range':
        return values.filter(v => typeof v === 'object' && 'min' in v) as RangeValue[];
      default:
        return [];
    }
  };

  // use any types for the reducer to avoid complex union typing issues
  const reducer: any = type === 'range' ? rangeReducer : type === 'number' ? numberReducer : type === 'string' ? stringReducer : booleanReducer;
  const [state, dispatch] = useImmerReducer<any, any>(reducer as any, getInitialState() as any);

  const [rangeState, setRangeState] = useState<RangeValue[]>(
    type === 'range' ? (getInitialState() as RangeValue[]) : []
  );

  const handleTypeChange = (newType: string) => {
    const nt = newType as 'range' | 'number';
    setSelectedType(nt);
    // if switching to range and we don't have any ranges yet, initialize from numeric state
    if (nt === 'range' && rangeState.length === 0) {
      // map numeric state entries to simple ranges centered on the value
      const fromNumbers = (state as any[]).map((v) => ({
        min: typeof v === 'number' ? v : DEFAULT_RANGE.min,
        max: typeof v === 'number' ? v : DEFAULT_RANGE.max,
        step: DEFAULT_RANGE.step,
        minInclusive: true,
        maxInclusive: true
      }));
      setRangeState(fromNumbers as RangeValue[]);
    }
  };

  const addValue = () => {
    if (type === 'range' || selectedType === 'range') {
      const newRange: RangeValue = {
        min: DEFAULT_RANGE.min,
        max: DEFAULT_RANGE.max,
        step: DEFAULT_RANGE.step,
        minInclusive: true,
        maxInclusive: true
      };
      setRangeState(prev => [...prev, newRange]);
    } else {
      const defaultValue = type === 'boolean' ? false : type === 'string' ? 'New String' : 0;
      dispatch({ type: 'ADD', payload: defaultValue as any });
    }
  };

  const handleValueChange = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    if (type === 'number') {
      const parsed = parseInt(event.target.value, 10);
      dispatch({ type: 'UPDATE', payload: { index, value: isNaN(parsed) ? 0 : parsed } });
    } else if (type === 'string') {
      dispatch({ type: 'UPDATE', payload: { index, value: event.target.value } });
    }
  };

  const handleBooleanChange = (index: number, value: string) => {
    const boolValue = value === 'true';
    dispatch({ type: 'UPDATE', payload: { index, value: boolValue } });
  };

  const handleRangeChange = (index: number, range: RangeValue) => {
    setRangeState(prev => {
      const next = [...prev];
      // if index out of bounds, push
      if (index >= next.length) next.push(range);
      else next[index] = range;
      return next;
    });
  };

  // Update parent component when state changes
  useEffect(() => {
    if (type === 'range' || selectedType === 'range') {
      onValueUpdated(rangeState);
    } else {
      onValueUpdated(state as any);
    }
  }, [state, rangeState, type, selectedType, onValueUpdated]);

  const renderValueInput = (value: any, index: number) => {
    switch (type) {
      case 'boolean':
        return (
          <DropDown
            options={[...DEFAULT_BOOLEAN_OPTIONS] as string[]}
            value={String(value)}
            className="normal__dropdown"
            onOptionSelected={(val) => handleBooleanChange(index, val)}
          />
        );
      case 'range':
        return (
          <RangeSelector
            key={index}
            onRangeChange={(r) => handleRangeChange(index, r)}
          />
        );
      case 'string':
        return (
          <input 
            type="text"
            key={index}
            value={value}
            onChange={(event) => handleValueChange(index, event)}
          />
        );
      case 'number':
      default:
        return (
          <input
            type="number"
            key={index}
            style={{ width: '5em' }}
            value={value}
            onChange={(event) => handleValueChange(index, event)}
          />
        );
    }
  };

  const currentState = (type === 'range' || selectedType === 'range') ? rangeState : state;
  const showTypeSelector = type === 'number';

  return (
    <div className={className}>
      <table className="row">
        <tbody className="cell">
          <tr>
            <td className="property">value</td>
          </tr>
        </tbody>
        <tbody className="cell">
          <td className="value flexContainer">
            {showTypeSelector && (
              <DropDown
                options={['range', 'number']}
                value={selectedType}
                className="normal__dropdown"
                onOptionSelected={handleTypeChange}
              />
            )}
            <span className="clickable iconfont" onClick={addValue}>
              {ICON_CODES.ADD}
            </span>
          </td>
        </tbody>
      </table>

  {currentState.map((value: any, index: number) => (
        <table className="row sub-row" key={`${type}-${index}`}>
          <tbody className="cell">
            <tr>
              <td className="property">{`${type}-${index + 1}`}</td>
            </tr>
          </tbody>
          <tbody className="cell">
            <tr>
              <td className="value">
                {renderValueInput(value, index)}
              </td>
            </tr>
          </tbody>
        </table>
      ))}
    </div>
  );
}