import React from 'react';
import './style.scss';
import { ParameterTable } from '../../../../shared/ParameterTable';

type RangeValue = {
  min: number;
  max: number;
  step: number;
  minInclusive: boolean;
  maxInclusive: boolean;
};

type TableProps = {
  onValueUpdated: (value: (string | number | boolean | any)[]) => void;
  numbers: (number | RangeValue)[];
};

const IntegerTable: React.FC<TableProps> = ({ numbers, onValueUpdated }) => {
  return (
    <ParameterTable
      type="number"
      values={numbers}
      onValueUpdated={onValueUpdated}
    />
  );
};

export default IntegerTable;
