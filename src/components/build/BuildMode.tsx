'use client';

import { ReactNode } from 'react';
import type { ValidationError } from '@/types';

interface BuildModeProps {
  // Points Summary
  listName: string;
  currentPoints: number;
  pointsLimit: number;
  detachmentName?: string;
  formatName?: string;
  onNameChange?: (name: string) => void;
  // Validation
  validationErrors: ValidationError[];
  // Panels
  leftPanel: ReactNode;
  middlePanel: ReactNode;
  rightPanel: ReactNode;
  className?: string;
}

export function BuildMode({
  listName,
  currentPoints,
  pointsLimit,
  detachmentName,
  formatName,
  onNameChange,
  validationErrors,
  leftPanel,
  middlePanel,
  rightPanel,
  className = '',
}: BuildModeProps) {
  // Points status for color coding (matching Alpine.js logic)
  // Alpine: warning when 1-10 pts over, error when >10 over
  const percentage = pointsLimit > 0 ? (currentPoints / pointsLimit) * 100 : 0;
  const over = currentPoints - pointsLimit;
  const pointsStatus = over > 10 ? 'error' : over > 0 ? 'warning' : 'ok';

  return (
    <div className={`h-full flex flex-col gap-4 max-w-7xl mx-auto w-full px-4 py-4 ${className}`}>
      {/* Points Summary Bar */}
      <div className="card-depth p-4 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={listName}
              onChange={(e) => onNameChange?.(e.target.value)}
              placeholder="List Name"
              className="w-full bg-transparent border-none text-white font-medium text-lg focus:outline-none placeholder:text-white/40"
            />
            <div className="flex items-center gap-2 mt-1">
              <span className="badge badge-accent">{detachmentName || 'No Detachment'}</span>
              <span className="badge badge-purple">{formatName || 'Standard'}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div
              className={`text-3xl font-bold ${
                pointsStatus === 'ok' ? 'text-accent-400' :
                pointsStatus === 'warning' ? 'text-yellow-400' :
                'text-red-400'
              }`}
            >
              {currentPoints}
            </div>
            <div className="text-sm text-white/50">of {pointsLimit} pts</div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-2 bg-black/30 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              pointsStatus === 'error' ? 'bg-red-500' :
              pointsStatus === 'warning' ? 'bg-yellow-500' :
              'progress-accent'
            }`}
            style={{ width: `${Math.min(100, percentage)}%` }}
          />
        </div>
      </div>

      {/* List Validation Errors (if any) */}
      {validationErrors.length > 0 && (
        <div className="card-depth p-4 border border-red-500/50 shrink-0">
          <div className="flex items-start gap-3">
            <div className="text-red-400 text-lg">!</div>
            <div className="flex-1">
              <div className="text-sm font-medium text-red-400 mb-1">List Requirements</div>
              <ul className="space-y-1">
                {validationErrors.map((error, idx) => (
                  <li key={idx} className="text-xs text-white/70">{error.message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Three-column grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        {/* Left Panel - Army List */}
        <div className="card-depth p-4 flex flex-col min-h-0 overflow-hidden">
          {leftPanel}
        </div>

        {/* Middle Panel - Unit Roster */}
        <div className="card-depth p-4 flex flex-col min-h-0 overflow-hidden">
          {middlePanel}
        </div>

        {/* Right Panel - Unit Details */}
        <div className="card-depth p-4 flex flex-col min-h-0 overflow-y-auto scroll-smooth">
          {rightPanel}
        </div>
      </div>
    </div>
  );
}
