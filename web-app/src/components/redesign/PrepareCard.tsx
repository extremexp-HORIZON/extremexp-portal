import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface PrepareCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

export const PrepareCard: React.FC<PrepareCardProps> = ({ 
  icon: Icon, 
  title, 
  description, 
  className = '' 
}) => {
  return (
    <div className={`
      bg-blue-500 hover:bg-blue-600 transition-colors duration-200
      rounded-lg p-6 text-white cursor-pointer
      flex flex-col items-center text-center space-y-3
      min-h-[140px] w-full max-w-[200px]
      ${className}
    `}>
      <Icon size={32} className="text-white" />
      <div>
        <h3 className="font-medium text-sm leading-tight">
          {title}
        </h3>
        <p className="text-xs mt-1 opacity-90">
          {description}
        </p>
      </div>
    </div>
  );
};