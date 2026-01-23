'use client';

import type { ValidationError } from '@/types';

interface ValidationErrorsProps {
  errors: ValidationError[];
  className?: string;
}

const errorTypeIcons: Record<ValidationError['type'], string> = {
  points: '⚖️',
  format: '📋',
  leader: '👑',
  maxModels: '🔢',
};

const errorTypeColors: Record<ValidationError['type'], string> = {
  points: 'border-yellow-500/50 bg-yellow-500/10',
  format: 'border-red-500/50 bg-red-500/10',
  leader: 'border-purple-500/50 bg-purple-500/10',
  maxModels: 'border-orange-500/50 bg-orange-500/10',
};

export function ValidationErrors({ errors, className = '' }: ValidationErrorsProps) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {errors.map((error, index) => (
        <div
          key={`${error.type}-${index}`}
          className={`
            px-3 py-2 rounded-md border text-sm
            ${errorTypeColors[error.type]}
          `}
        >
          <span className="mr-2">{errorTypeIcons[error.type]}</span>
          <span className="text-gray-200">{error.message}</span>
        </div>
      ))}
    </div>
  );
}
