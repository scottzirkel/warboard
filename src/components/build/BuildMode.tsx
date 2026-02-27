'use client';

import { ReactNode } from 'react';
import type { ValidationError, GameFormat } from '@/types';
import type { MobilePanel } from '@/stores/uiStore';

interface BuildModeProps {
  // Points Summary
  listName: string;
  currentPoints: number;
  pointsLimit: number;
  onNameChange?: (name: string) => void;
  // Interactive cost bar controls
  detachments: { id: string; name: string }[];
  selectedDetachment: string;
  onDetachmentChange: (id: string) => void;
  selectedFormat: GameFormat;
  onFormatChange: (format: GameFormat) => void;
  pointsOptions: number[];
  onPointsLimitChange: (limit: number) => void;
  // Validation
  validationErrors: ValidationError[];
  // Panels
  leftPanel: ReactNode;
  rosterPanel: ReactNode;
  // Mobile panel state
  mobilePanel?: MobilePanel;
  className?: string;
}

export function BuildMode({
  listName,
  currentPoints,
  pointsLimit,
  onNameChange,
  detachments,
  selectedDetachment,
  onDetachmentChange,
  selectedFormat,
  onFormatChange,
  pointsOptions,
  onPointsLimitChange,
  validationErrors,
  leftPanel,
  rosterPanel,
  mobilePanel = 'list',
  className = '',
}: BuildModeProps) {
  // Points status for color coding (matching Alpine.js logic)
  // Alpine: warning when 1-10 pts over, error when >10 over
  const percentage = pointsLimit > 0 ? (currentPoints / pointsLimit) * 100 : 0;
  const over = currentPoints - pointsLimit;
  const pointsStatus = over > 10 ? 'error' : over > 0 ? 'warning' : 'ok';

  return (
    <div className={`h-full flex flex-col gap-4 w-full px-4 py-4 ${className}`}>
      {/* Spacer for fixed points bar on mobile */}
      <div className="h-[120px] lg:hidden shrink-0" />

      {/* Points Summary Bar - fixed on mobile, static on desktop */}
      <div className="fixed lg:static top-14 left-0 right-0 z-40 px-4 lg:px-0 pb-2 lg:pb-0 bg-[#1c1c1e] lg:bg-transparent lg:shrink-0">
        <div className="card-depth p-4">
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
                <div className="relative inline-flex items-center">
                  <select
                    value={selectedDetachment}
                    onChange={(e) => onDetachmentChange(e.target.value)}
                    className="badge badge-accent appearance-none cursor-pointer pr-6 focus:outline-none"
                  >
                    {detachments.map(d => (
                      <option key={d.id} value={d.id} className="bg-gray-900 text-white">{d.name}</option>
                    ))}
                  </select>
                  <svg className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-60" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="relative inline-flex items-center">
                  <select
                    value={selectedFormat}
                    onChange={(e) => onFormatChange(e.target.value as GameFormat)}
                    className="badge badge-purple appearance-none cursor-pointer pr-6 focus:outline-none"
                  >
                    <option value="standard" className="bg-gray-900 text-white">Standard</option>
                    <option value="colosseum" className="bg-gray-900 text-white">Colosseum</option>
                  </select>
                  <svg className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-60" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
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
              <div className="text-sm text-white/50 flex items-center justify-end gap-1">
                of
                <select
                  value={pointsLimit}
                  onChange={(e) => onPointsLimitChange(Number(e.target.value))}
                  className="bg-transparent text-white/50 appearance-none cursor-pointer font-semibold focus:outline-none text-center"
                  style={{ width: `${String(pointsLimit).length + 1}ch` }}
                >
                  {pointsOptions.map(pts => (
                    <option key={pts} value={pts} className="bg-gray-900 text-white">{pts}</option>
                  ))}
                </select>
                pts
              </div>
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

      {/* Desktop: Two-column grid layout (hidden on mobile) */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_2fr] gap-4 flex-1 min-h-0">
        {/* Left Panel - Army List */}
        <div className="card-depth p-4 flex flex-col min-h-0 overflow-hidden">
          {leftPanel}
        </div>

        {/* Right Panel - Unit Roster (card grid) */}
        <div className="card-depth p-4 flex flex-col min-h-0 overflow-hidden">
          {rosterPanel}
        </div>
      </div>

      {/* Mobile: Single panel view */}
      <div className="flex lg:hidden flex-col flex-1 min-h-0">
        <div className="card-depth p-4 flex flex-col flex-1 min-h-0">
          {mobilePanel === 'roster' ? rosterPanel : leftPanel}
        </div>
      </div>
    </div>
  );
}
