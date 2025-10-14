import React from 'react';
import './style.scss';
import { ParameterTable } from '../../../../shared/ParameterTable';

type TableProps = {
  onStringsUpdated: (value: (string | number | boolean | any)[]) => void;
  strings: string[];
};

const StringTable: React.FC<TableProps> = ({ strings, onStringsUpdated }) => {
  return (
    <ParameterTable
      type="string"
      values={strings}
      onValueUpdated={onStringsUpdated}
    />
  );
};

export default StringTable;
