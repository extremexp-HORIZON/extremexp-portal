import React from 'react';
import './style.scss';
import { ParameterTable } from '../../../../shared/ParameterTable';

type TableProps = {
  onValueUpdated: (value: (string | number | boolean | any)[]) => void;
  booleans: boolean[];
};

const BooleanTable: React.FC<TableProps> = ({ booleans, onValueUpdated }) => {
  return (
    <ParameterTable
      type="boolean"
      values={booleans}
      onValueUpdated={onValueUpdated}
    />
  );
};

export default BooleanTable;
