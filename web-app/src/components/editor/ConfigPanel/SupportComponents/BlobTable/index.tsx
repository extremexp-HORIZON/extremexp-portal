import React from 'react';
import './style.scss';
import { ParameterTable } from '../../../../shared/ParameterTable';

type TableProps = {
  onBlobsUpdated: (value: (string | number | boolean | any)[]) => void;
  blobs: string[];
};

const BlobTable: React.FC<TableProps> = ({ blobs, onBlobsUpdated }) => {
  return (
    <ParameterTable
      type="string"
      values={blobs}
      onValueUpdated={onBlobsUpdated}
    />
  );
};

export default BlobTable;
