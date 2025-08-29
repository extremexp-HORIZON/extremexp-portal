import React from 'react';
import { Trash2 } from 'lucide-react';
import { TabNavigation } from './TabNavigation';
import { Button } from './Button';

interface Tab {
  id: string;
  label: string;
}

interface TabbedSectionProps {
  title: string;
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: React.ReactNode;
  actions?: Array<{
    label: string;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    icon?: React.ComponentType<{ size?: number }>;
    onClick: () => void;
  }>;
  className?: string;
}

export const TabbedSection: React.FC<TabbedSectionProps> = ({
  title,
  tabs,
  activeTab,
  onTabChange,
  children,
  actions,
  className = ''
}) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {actions && actions.length > 0 && (
            <div className="flex space-x-2 z-10">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'primary'}
                  size="sm"
                  icon={action.icon}
                  onClick={action.onClick}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-6 py-4">
        <TabNavigation
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={onTabChange}
          className="mb-6"
        />
        {children}
      </div>
    </div>
  );
};