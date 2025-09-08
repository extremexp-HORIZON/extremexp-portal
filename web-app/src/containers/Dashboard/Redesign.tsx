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
    id: 'access-control',
    icon: Shield,
    title: 'Access control policy editor',
    description: '',
    onClick: () => console.log('Access control clicked')
  },
  {
    id: 'data-management',
    icon: Database,
    title: 'Data management, upload, annotate',
    description: '',
    onClick: () => console.log('Data management clicked')
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
  { key: 'lastUpdatedTime', label: 'Last updated Time', sortable: true },
  { key: 'linkedWorkflow', label: 'Linked workflow' },
  { key: 'actions', label: 'Action', width: 'w-80' }
];

const sampleData = [
  {
    name: 'Workflow 1',
    size: '200MB',
    createdTime: '2025-02-05 08:28:36',
    lastUpdatedTime: '2025-06-21 16:10:03',
    linkedWorkflow: 'workflow-1'
  },
  {
    name: 'Workflow 2',
    size: '1GB',
    createdTime: '2025-02-03 19:49:33',
    lastUpdatedTime: '2025-02-08 08:28:36',
    linkedWorkflow: 'workflow-2'
  },
  {
    name: 'Workflow 3',
    size: '300MB',
    createdTime: '2025-02-02 19:17:15',
    lastUpdatedTime: '2025-02-03 19:49:33',
    linkedWorkflow: 'workflow-3'
  },
  {
    name: 'Workflow 4',
    size: '750MB',
    createdTime: '2025-02-02 09:46:33',
    lastUpdatedTime: '2025-02-02 19:17:15',
    linkedWorkflow: 'workflow-4'
  },
  {
    name: 'Workflow 5',
    size: '150MB',
    createdTime: '2025-02-02 07:57:01',
    lastUpdatedTime: '2025-02-02 09:46:33',
    linkedWorkflow: 'workflow-5'
  }
];

function App() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [prepareCollapsed, setPrepareCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('experiments');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [tableData, setTableData] = useState(sampleData);
  const [sortedData, setSortedData] = useState(sampleData);

  // Update sorted data when table data or sorting changes
  React.useEffect(() => {
    let sorted = [...tableData];
    
    if (sortColumn) {
      sorted.sort((a, b) => {
        let aValue = a[sortColumn];
        let bValue = b[sortColumn];
        
        // Handle different data types
        if (sortColumn === 'size') {
          // Convert size strings to numbers for proper sorting
          aValue = parseInt(aValue.replace(/[^\d]/g, ''));
          bValue = parseInt(bValue.replace(/[^\d]/g, ''));
        } else if (sortColumn === 'createdTime' || sortColumn === 'lastUpdatedTime') {
          // Convert date strings to Date objects for proper sorting
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        }
        
        if (aValue < bValue) {
          return sortDirection === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortDirection === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    setSortedData(sorted);
  }, [tableData, sortColumn, sortDirection]);

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
    
    const newData = tableData.filter(row => !selectedRows.includes(row[rowIdKey]));
    setTableData(newData);
    setSelectedRows([]);
    
    // Reset to first page if current page would be empty
    const newTotalPages = Math.ceil(newData.length / 5);
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(1);
    }
  };

  const totalPages = Math.ceil(sortedData.length / 5);
  const itemsPerPage = 5;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, startIndex + itemsPerPage);
  const rowIdKey = 'name';

  const defineActions = [
    {
      label: 'Create new experiment definition',
      variant: 'primary' as const,
      onClick: () => console.log('Create new experiment clicked')
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        {showWelcome && (
          <WelcomeBanner
            title="Welcome to ExtremeXP – an interactive platform for data scientists and domain experts to define, run, and evaluate machine learning experiments."
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
        )}

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
            sortedData={paginatedData}
            selectedRows={selectedRows}
            onRowSelect={handleRowSelect}
            onSelectAll={handleSelectAll}
            rowIdKey={rowIdKey}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
          />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={sortedData.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </TabbedSection>

        {/* Bulk Actions */}
        {/* {selectedRows.length > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {selectedRows.length} item{selectedRows.length > 1 ? 's' : ''} selected
              </span>
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                onClick={handleDelete}
              >
                Delete Selected
              </Button>
            </div>
          </div>
        )} */}
      </div>
    </div>
  );
}
export default Redesign;