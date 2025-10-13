import React, { useState } from 'react';
import { Brain, Database, Settings, Search, Filter, ChevronDown, ChevronUp, Plus, Check } from 'lucide-react';
import type { WorkflowStep } from '../../types/experiments';

interface StepSelectorProps {
  algorithms: WorkflowStep[];
  datasets: WorkflowStep[];
  preprocessing: WorkflowStep[];
  onSelect: (item: WorkflowStep) => void;
}

export function StepSelector({ algorithms, datasets, preprocessing, onSelect }: StepSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    preprocessing: true,
    datasets: true,
    algorithms: true,
  });
  const [selectedStep, setSelectedStep] = useState<string | null>(null);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleStepSelect = (step: WorkflowStep) => {
    setSelectedStep(step.id);
    onSelect(step);
  };

  const filterSteps = (steps: WorkflowStep[]) => {
    if (!searchTerm) return steps;
    return steps.filter(step => 
      step.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      step.tasks?.some(task => 
        task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  };

  const renderStepList = (steps: WorkflowStep[], color: string, icon: React.ReactNode) => {
    const filteredSteps = filterSteps(steps);
    
    if (filteredSteps.length === 0) {
      return (
        <div className="text-center py-8 text-gray-400">
          <div className="text-4xl mb-2 opacity-50">{icon}</div>
          <p className="text-sm">
            {searchTerm ? 'No matching items found' : 'No items available'}
          </p>
          {!searchTerm && (
            <p className="text-xs mt-1 text-gray-300">
              Add items to get started
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {filteredSteps.map((step) => (
          <button
            key={step.id}
            onClick={() => handleStepSelect(step)}
            className={`w-full text-left px-4 py-3 rounded-lg border transition-all duration-200 group relative ${
              selectedStep === step.id
                ? `border-${color}-500 bg-${color}-50 shadow-sm`
                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h5 className={`font-medium truncate ${
                    selectedStep === step.id ? `text-${color}-900` : 'text-gray-900 group-hover:text-gray-700'
                  }`}>
                    {step.name}
                  </h5>
                  {selectedStep === step.id && (
                    <Check className={`w-4 h-4 text-${color}-600 flex-shrink-0`} />
                  )}
                </div>
                <div className="flex items-center space-x-3 mt-1">
                  <p className="text-sm text-gray-500">
                    {step.tasks?.length || 0} task{step.tasks?.length !== 1 ? 's' : ''}
                  </p>
                  {step.tasks && step.tasks.length > 0 && (
                    <div className="flex items-center space-x-1">
                      <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                      <span className="text-xs text-gray-400">
                        {step.tasks.filter((task: any) => task.selected).length} selected
                      </span>
                    </div>
                  )}
                </div>
                {step.tasks && step.tasks.length > 0 && (
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-1">
                      {step.tasks.slice(0, 3).map((task: any, index: number) => (
                        <span
                          key={index}
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            task.selected
                              ? `bg-${color}-100 text-${color}-800`
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {task.name}
                        </span>
                      ))}
                      {step.tasks.length > 3 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          +{step.tasks.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className={`w-2 h-2 rounded-full bg-${color}-500 transition-opacity ${
                selectedStep === step.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`} />
            </div>
          </button>
        ))}
      </div>
    );
  };

  const totalSteps = preprocessing.length + datasets.length + algorithms.length;
  const totalSelected = [...preprocessing, ...datasets, ...algorithms].reduce(
    (acc, step) => acc + (step.tasks?.filter((task: any) => task.selected).length || 0), 0
  );

  return (
    <div className="space-y-6">
      {/* Header with search and stats */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Workflow Steps</h3>
            <p className="text-sm text-gray-500">
              {totalSteps} steps available • {totalSelected} tasks selected
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search steps and tasks..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Steps Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pre-processing Section */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div 
            className="p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleSection('preprocessing')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Settings className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Pre-processing</h4>
                  <p className="text-sm text-gray-500">{preprocessing.length} steps</p>
                </div>
              </div>
              {expandedSections.preprocessing ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>
          
          {expandedSections.preprocessing && (
            <div className="p-4">
              {renderStepList(preprocessing, 'purple', <Settings className="w-8 h-8 mx-auto" />)}
            </div>
          )}
        </div>

        {/* Datasets Section */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div 
            className="p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleSection('datasets')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Database className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Datasets</h4>
                  <p className="text-sm text-gray-500">{datasets.length} steps</p>
                </div>
              </div>
              {expandedSections.datasets ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>
          
          {expandedSections.datasets && (
            <div className="p-4">
              {renderStepList(datasets, 'green', <Database className="w-8 h-8 mx-auto" />)}
            </div>
          )}
        </div>

        {/* Algorithms Section */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div 
            className="p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleSection('algorithms')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Brain className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Algorithms</h4>
                  <p className="text-sm text-gray-500">{algorithms.length} steps</p>
                </div>
              </div>
              {expandedSections.algorithms ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>
          
          {expandedSections.algorithms && (
            <div className="p-4">
              {renderStepList(algorithms, 'blue', <Brain className="w-8 h-8 mx-auto" />)}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Quick Actions</h4>
            <p className="text-sm text-gray-500">Common workflow operations</p>
          </div>
          <div className="flex items-center space-x-2">
            <button className="inline-flex items-center space-x-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors">
              <Plus className="w-4 h-4" />
              <span>Add Step</span>
            </button>
            <button className="inline-flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
              <Settings className="w-4 h-4" />
              <span>Configure</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}