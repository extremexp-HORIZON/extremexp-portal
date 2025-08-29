import React from 'react';

interface Step {
  label: string;
  completed?: boolean;
}

interface WorkflowSectionProps {
  title: string;
  steps: Step[];
  className?: string;
}

export const WorkflowSection: React.FC<WorkflowSectionProps> = ({ 
  title, 
  steps, 
  className = '' 
}) => {
  return (
    <div className={`bg-white border border-blue-200 rounded-lg p-4 mb-6 ${className}`}>
      <h2 className="text-lg font-semibold text-gray-900 mb-3">{title}</h2>
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <span className={`${step.completed ? 'text-green-600 font-medium' : ''}`}>
              {index + 1}. {step.label}
            </span>
            {index < steps.length - 1 && (
              <span className="text-blue-500 font-semibold">→</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};