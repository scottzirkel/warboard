'use client';

import { ReactNode } from 'react';
import { PointsSummaryBar } from './PointsSummaryBar';
import { ValidationErrors } from './ValidationErrors';
import type { ValidationError } from '@/types';

interface BuildModeProps {
  listName: string;
  currentPoints: number;
  pointsLimit: number;
  validationErrors: ValidationError[];
  leftPanel: ReactNode;
  middlePanel: ReactNode;
  rightPanel: ReactNode;
  className?: string;
}

export function BuildMode({
  listName,
  currentPoints,
  pointsLimit,
  validationErrors,
  leftPanel,
  middlePanel,
  rightPanel,
  className = '',
}: BuildModeProps) {
  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Points Summary Bar at top */}
      <PointsSummaryBar
        name={listName}
        currentPoints={currentPoints}
        pointsLimit={pointsLimit}
      />

      {/* Validation Errors (if any) */}
      {validationErrors.length > 0 && (
        <div className="px-4 py-2 bg-gray-800/30 border-b border-gray-700/30">
          <ValidationErrors errors={validationErrors} />
        </div>
      )}

      {/* Three-column grid layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 overflow-hidden">
        {/* Left Panel - Army List */}
        <div className="flex flex-col min-h-0 overflow-hidden">
          {leftPanel}
        </div>

        {/* Middle Panel - Unit Roster */}
        <div className="flex flex-col min-h-0 overflow-hidden">
          {middlePanel}
        </div>

        {/* Right Panel - Unit Details */}
        <div className="flex flex-col min-h-0 overflow-hidden">
          {rightPanel}
        </div>
      </div>
    </div>
  );
}
