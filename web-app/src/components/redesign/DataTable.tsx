import React from 'react';
import { ChevronUp, ChevronDown, File, Check } from 'lucide-react';
import { Button } from './Button';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
}

interface DataRow {
  [key: string]: any;
}

interface DataTableProps {
  columns: Column[];
  data: DataRow[];
  selectedRows?: string[];
  onRowSelect?: (rowId: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  rowIdKey?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  className?: string;
}

export const DataTable: React.FC<DataTableProps> = ({
  columns,
  data,
  selectedRows = [],
  onRowSelect,
  onSelectAll,
  rowIdKey = 'name',
  sortColumn,
  sortDirection = 'asc',
  onSort,
  className = ''
}) => {
  const handleSort = (columnKey: string) => {
    if (onSort) {
      onSort(columnKey);
    }
  };

  const isAllSelected = data.length > 0 && selectedRows.length === data.length;
  const isIndeterminate = selectedRows.length > 0 && selectedRows.length < data.length;

  const handleSelectAll = () => {
    if (onSelectAll) {
      onSelectAll(!isAllSelected);
    }
  };

  const handleRowSelect = (rowId: string) => {
    if (onRowSelect) {
      const isSelected = selectedRows.includes(rowId);
      onRowSelect(rowId, !isSelected);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm  border border-gray-200 overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-green-50 border-b border-gray-200">
            <tr>
              {(onRowSelect || onSelectAll) && (
                <th className="px-6 py-3 text-left w-12">
                  {onSelectAll && (
                    <div className="flex items-center">
                      <button
                        onClick={handleSelectAll}
                        className={`
                          w-4 h-4  border-2 flex items-center justify-center transition-colors
                          ${isAllSelected 
                            ? 'bg-blue-600 border-blue-600 text-white' 
                            : isIndeterminate
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-gray-300 hover:border-blue-400'
                          }
                        `}
                      >
                        {(isAllSelected || isIndeterminate) && (
                          <Check size={12} />
                        )}
                      </button>
                    </div>
                  )}
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.width ? column.width : ''
                  }`}
                >
                  {column.sortable ? (
                    <button
                      onClick={() => handleSort(column.key)}
                      className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                    >
                      <span>{column.label}</span>
                      {sortColumn === column.key ? (
                        sortDirection === 'asc' ? (
                          <ChevronUp size={14} />
                        ) : (
                          <ChevronDown size={14} />
                        )
                      ) : (
                        <ChevronDown size={14} className="opacity-0 group-hover:opacity-50" />
                      )}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row, index) => (
              <tr
                key={row[rowIdKey] || index}
                className={`hover:bg-gray-50 transition-colors ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                }`}
              >
                {onRowSelect && (
                  <td className="px-6 py-4 whitespace-nowrap w-12">
                    <div className="flex items-center">
                      <button
                        onClick={() => handleRowSelect(row[rowIdKey])}
                        className={` z-10
                          w-4 h-4  border-2 flex items-center justify-center transition-colors
                          ${selectedRows.includes(row[rowIdKey])
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-gray-300 hover:border-blue-400'
                          }
                        `}
                      >
                        {selectedRows.includes(row[rowIdKey]) && (
                          <Check size={12} />
                        )}
                      </button>
                    </div>
                  </td>
                )}
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm">
                    {column.key === 'thumbnail' ? (
                      <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                        <File size={16} className="text-gray-400" />
                      </div>
                    ) : column.key === 'actions' ? (
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm">
                          Open in graphical editor
                        </Button>
                        <Button variant="ghost" size="sm">
                          Open in DSL editor
                        </Button>
                      </div>
                    ) : (
                      <span className="text-gray-900">{row[column.key]}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};