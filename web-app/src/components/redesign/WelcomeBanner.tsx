import React from 'react';
import { X } from 'lucide-react';

interface WelcomeBannerProps {
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
  className?: string;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  title,
  description,
  primaryAction,
  secondaryAction,
  onClose,
  className = ''
}) => {
  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 relative ${className}`}>
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-blue-400 hover:text-blue-600 transition-colors"
        >
          <X size={16} />
        </button>
      )}
      
      <div className="pr-8">
        <h3 className="font-medium text-blue-900 mb-2">{title}</h3>
        <p className="text-sm text-blue-700 mb-3">{description}</p>
        
        <div className="flex flex-wrap gap-2">
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-white border border-blue-200 rounded hover:bg-blue-50 transition-colors"
            >
              {secondaryAction.label}
            </button>
          )}
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
            >
              {primaryAction.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};