import React, { useState } from 'react';
import { Database, Shield, Trash2 } from 'lucide-react';
import { WelcomeBanner } from '../../components/redesign/WelcomeBanner';
import { WorkflowSection } from '../../components/redesign/WorkflowSection';
import { FeatureSection } from '../../components/redesign/FeatureSection';
import { DataTable } from '../../components/redesign/DataTable';
import { Pagination } from '../../components/redesign/Pagination';
import { TabbedSection } from '../../components/redesign/TabbedSection';
import './redesign.scss';

const quickStartSteps = [
  { label: 'Upload your dataset' },
  { label: 'Define your experiment' },
  { label: 'Run' },
  { label: 'Monitor results' }
];

const prepareCards = [
  {
    id: 'data-management',
    icon: Database,
    title: 'Data management, upload,',
    description: 'metadata',
    onClick: () => console.log('Data management clicked')
  },
  {
    id: 'access-control',
    icon: Shield,
    title: 'Access control policy editor',
    description: '',
    onClick: () => console.log('Access control clicked')
  }
];

const defineTabs = [
  { id: 'experiments', label: 'Experiments definition' },
  { id: 'workflow', label: 'Workflow definition' }
];

const tableColumns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'size', label: 'Size', sortable: true },
  { key: 'createdTime', label: 'Created Time', sortable: true },
  { key: 'thumbnail', label: 'Thumbnail' },
  { key: 'actions', label: 'Action', width: 'w-80' }
];

const sampleData = [
  {
    name: 'Workflow 1',
    size: '200MB',
    createdTime: '2025-02-05 08:28:36',
  },
  {
    name: 'Workflow 2',
    size: '1GB',
    createdTime: '2025-02-03 19:49:33',
  },
  {
    name: 'Workflow 3',
    size: '300MB',
    createdTime: '2025-02-02 19:17:15',
  },
  {
    name: 'Workflow 4',
    size: '250MB',
    createdTime: '2025-02-02 09:46:33',
  },
  {
    name: 'Workflow 5',
    size: '150MB',
    createdTime: '2025-02-02 07:57:01',
  }
];

function Redesign() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [prepareCollapsed, setPrepareCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('experiments');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [tableData, setTableData] = useState(sampleData);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleRowSelect = (rowId: string, selected: boolean) => {
    if (selected) {
      setSelectedRows([...selectedRows, rowId]);
    } else {
      setSelectedRows(selectedRows.filter(id => id !== rowId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedRows(tableData.map(row => row.name));
    } else {
      setSelectedRows([]);
    }
  };

  const handleDelete = () => {
    if (selectedRows.length === 0) return;
    
    const newData = tableData.filter(row => !selectedRows.includes(row.name));
    setTableData(newData);
    setSelectedRows([]);
    
    // Reset to first page if current page would be empty
    const newTotalPages = Math.ceil(newData.length / 5);
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(1);
    }
  };

  const totalPages = Math.ceil(tableData.length / 5);

  const defineActions = [
    {
      label: 'Delete',
      variant: 'danger' as const,
      icon: Trash2,
      onClick: handleDelete
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-10xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        {/* {showWelcome && (
          <WelcomeBanner
            title="Welcome to ExtremeXP"
            description="– an interactive platform for data scientists and domain experts to define, run, and evaluate machine learning experiments."
            primaryAction={{
              label: 'Have a quick tour',
              onClick: () => console.log('Quick tour clicked')
            }}
            secondaryAction={{
              label: 'No longer appears',
              onClick: () => setShowWelcome(false)
            }}
            onClose={() => setShowWelcome(false)}
          />
        )} */}

        {/* Quick Start Section */}
        <WorkflowSection
          title="Quick start"
          steps={quickStartSteps}
        />

        {/* Prepare Section */}
        <FeatureSection
          title="Prepare"
          cards={prepareCards}
          collapsible={true}
          collapsed={prepareCollapsed}
          onToggleCollapse={() => setPrepareCollapsed(!prepareCollapsed)}
        />

        {/* Define & Run Section */}
        <TabbedSection
          title="Define & run"
          tabs={defineTabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          actions={defineActions}
        >
          <DataTable
            columns={tableColumns}
            data={tableData}
            selectedRows={selectedRows}
            onRowSelect={handleRowSelect}
            onSelectAll={handleSelectAll}
            rowIdKey="name"
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
          />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={tableData.length}
            itemsPerPage={5}
            onPageChange={setCurrentPage}
          />
        </TabbedSection>
      </div>
    </div>
  );
}


export default Redesign;