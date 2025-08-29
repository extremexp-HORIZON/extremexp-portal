import React from 'react';

interface StepIndicatorProps {
  steps: string[];
  className?: string;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, className = '' }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <h2 className="text-lg font-semibold text-gray-900">Quick start</h2>
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <span>{index + 1}. {step}</span>
            {index < steps.length - 1 && (
              <span className="text-blue-500 font-semibold">→</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};