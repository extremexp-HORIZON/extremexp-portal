import React from 'react';
import { ChevronUp, ChevronDown, File, Check, Play, Edit, Code, Link, Copy, X } from 'lucide-react';
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
  sortedData?: DataRow[];
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
  sortedData,
  selectedRows = [],
  onRowSelect,
  onSelectAll,
  rowIdKey = 'name',
  sortColumn,
  sortDirection = 'asc',
  onSort,
  className = ''
}) => {
  const displayData = sortedData || data;

  const handleSort = (columnKey: string) => {
    if (onSort) {
      onSort(columnKey);
    }
  };

  const isAllSelected = displayData.length > 0 && selectedRows.length === displayData.length;
  const isIndeterminate = selectedRows.length > 0 && selectedRows.length < displayData.length;

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

  const getSortIcon = (columnKey: string) => {
    if (sortColumn !== columnKey) {
      return <ChevronDown size={14} className="opacity-30" />;
    }
    return sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-green-50">
            <tr>
              {(onRowSelect || onSelectAll) && (
                <th className="px-4 py-3 text-left w-12">
                  {onSelectAll && (
                    <div className="flex items-center">
                      <button
                        onClick={handleSelectAll}
                        className={`
                          w-4 h-4 rounded border-2 flex items-center justify-center transition-colors
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
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider ${
                    column.width ? column.width : ''
                  }`}
                >
                  {column.sortable ? (
                    <button
                      onClick={() => handleSort(column.key)}
                      className="flex items-center space-x-1 hover:text-gray-800 transition-colors group"
                    >
                      <span>{column.label}</span>
                      {getSortIcon(column.key)}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayData.map((row, index) => {
              const isSelected = selectedRows.includes(row[rowIdKey]);
              return (
                <tr
                  key={row[rowIdKey] || index}
                  className={`hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-blue-50' : 'bg-white'
                  }`}
                >
                  {onRowSelect && (
                    <td className="px-4 py-4 whitespace-nowrap w-12">
                      <div className="flex items-center">
                        <button
                          onClick={() => handleRowSelect(row[rowIdKey])}
                          className={`
                            w-4 h-4 rounded border-2 flex items-center justify-center transition-colors
                            ${isSelected
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-gray-300 hover:border-blue-400'
                            }
                          `}
                        >
                          {isSelected && <Check size={12} />}
                        </button>
                      </div>
                    </td>
                  )}
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-4 whitespace-nowrap text-sm">
                      {column.key === 'thumbnail' ? (
                        <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                          <File size={16} className="text-gray-400" />
                        </div>
                      ) : column.key === 'linkedWorkflow' ? (
                        <div className="w-12 h-8 bg-blue-100 rounded flex items-center justify-center">
                          <div className="w-8 h-6 bg-blue-200 rounded-sm"></div>
                        </div>
                      ) : column.key === 'actions' ? (
                        <div className="flex items-center space-x-1">
                          <button className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors" title="Run">
                            <Play size={16} />
                          </button>
                          <button className="p-1.5 text-gray-500 hover:bg-gray-50 rounded transition-colors" title="Edit">
                            <Edit size={16} />
                          </button>
                          <button className="p-1.5 text-gray-500 hover:bg-gray-50 rounded transition-colors" title="Code">
                            <Code size={16} />
                          </button>
                          <button className="p-1.5 text-gray-500 hover:bg-gray-50 rounded transition-colors" title="Link">
                            <Link size={16} />
                          </button>
                          <button className="p-1.5 text-gray-500 hover:bg-gray-50 rounded transition-colors" title="Copy">
                            <Copy size={16} />
                          </button>
                          <button className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-900">{row[column.key]}</span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};