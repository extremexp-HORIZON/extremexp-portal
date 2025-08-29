import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface FeatureCard {
  id: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  onClick?: () => void;
}

interface FeatureSectionProps {
  title: string;
  cards: FeatureCard[];
  collapsible?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export const FeatureSection: React.FC<FeatureSectionProps> = ({
  title,
  cards,
  collapsible = false,
  collapsed = false,
  onToggleCollapse,
  className = ''
}) => {
  return (
    <div className={`bg-white border border-blue-200 rounded-lg p-4 mb-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {collapsible && (
          <button
            onClick={onToggleCollapse}
            className="z-10 flex items-center text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
          >
            <span className="mr-1">Collapse</span>
            {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          </button>
        )}
      </div>
      
      {!collapsed && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {cards.map((card) => {
            const IconComponent = card.icon;
            return (
              <div
                key={card.id}
                onClick={card.onClick}
                className={`
                  bg-blue-500 hover:bg-blue-600 transition-colors duration-200
                  rounded-lg p-6 text-white text-center space-y-3
                  min-h-[140px] flex flex-col items-center justify-center
                  ${card.onClick ? 'cursor-pointer' : ''}
                `}
              >
                <IconComponent size={32} className="text-white" />
                <div>
                  <h3 className="font-medium text-sm leading-tight mb-1">
                    {card.title}
                  </h3>
                  {card.description && (
                    <p className="text-xs opacity-90">
                      {card.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};