'use client';

import { ReactNode, useState } from 'react';
import { Modal } from '@/components/ui';
import { GAME_FORMATS } from '@/types';
import type { ValidationError, GameFormat } from '@/types';
import type { MobilePanel } from '@/stores/uiStore';

type PickerType = 'detachment' | 'format' | null;

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

  const [activePicker, setActivePicker] = useState<PickerType>(null);
  const [customPointsInput, setCustomPointsInput] = useState(String(pointsLimit));

  const detachmentName = detachments.find(d => d.id === selectedDetachment)?.name ?? selectedDetachment;
  const formatConfig = GAME_FORMATS.find(f => f.id === selectedFormat);
  const formatLabel = formatConfig
    ? `${formatConfig.name} · ${pointsLimit} pts`
    : `${selectedFormat} · ${pointsLimit} pts`;

  const pickerTitle = activePicker === 'detachment' ? 'Detachment'
    : activePicker === 'format' ? 'Game Format'
    : '';

  const handleFormatSelect = (format: GameFormat) => {
    onFormatChange(format);
    if (format !== 'custom') {
      setActivePicker(null);
    }
  };

  const handleCustomPointsChange = (value: string) => {
    setCustomPointsInput(value);
    const num = parseInt(value, 10);
    if (!isNaN(num) && num > 0) {
      onPointsLimitChange(num);
    }
  };

  return (
    <div className={`h-full flex flex-col gap-2 lg:gap-4 w-full pb-4 lg:px-4 lg:py-4 ${className}`}>
      {/* Spacer for fixed points bar on mobile */}
      <div className="h-[130px] lg:hidden shrink-0" />

      {/* Points Summary Bar - fixed on mobile, static on desktop */}
      <div className="fixed lg:static top-14 left-0 right-0 z-40 px-2 lg:px-0 pb-2 lg:pb-0 bg-[#1c1c1e] lg:bg-transparent lg:shrink-0">
        <div className="card-depth p-4" style={{ background: '#2c2c2e' }}>
          {/* Row 1: List name + points */}
          <div className="flex items-start justify-between gap-4">
            <input
              type="text"
              value={listName}
              onChange={(e) => onNameChange?.(e.target.value)}
              placeholder="List Name"
              className="flex-1 min-w-0 bg-transparent border-none text-white font-medium text-lg focus:outline-none placeholder:text-white/40"
            />
            <div className="text-right shrink-0">
              <div
                className={`text-3xl font-bold leading-none ${
                  pointsStatus === 'ok' ? 'text-accent-400' :
                  pointsStatus === 'warning' ? 'text-yellow-400' :
                  'text-red-400'
                }`}
              >
                {currentPoints}
              </div>
            </div>
          </div>

          {/* Row 2: Tappable badges */}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => setActivePicker('detachment')}
              className="badge badge-accent py-1.5 px-3 text-sm cursor-pointer"
            >
              {detachmentName}
            </button>
            <button
              onClick={() => {
                setCustomPointsInput(String(pointsLimit));
                setActivePicker('format');
              }}
              className="badge badge-purple py-1.5 px-3 text-sm cursor-pointer"
            >
              {formatLabel}
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-2 h-2 bg-black/30 rounded-full overflow-hidden">
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
        <div className="card-depth p-4 border border-red-500/50 shrink-0 mx-2 lg:mx-0">
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

      {/* Mobile: Single panel view - px-2 matches nav and fixed bar */}
      <div className="flex lg:hidden flex-col flex-1 min-h-0 px-2">
        {mobilePanel === 'roster' ? rosterPanel : leftPanel}
      </div>

      {/* Picker Modal */}
      <Modal
        isOpen={activePicker !== null}
        onClose={() => setActivePicker(null)}
        title={pickerTitle}
        size="sm"
      >
        {activePicker === 'detachment' && (
          <div className="space-y-2">
            {detachments.map(d => (
              <button
                key={d.id}
                onClick={() => { onDetachmentChange(d.id); setActivePicker(null); }}
                className={`w-full p-3 rounded-xl text-sm font-medium text-left transition-all ${
                  selectedDetachment === d.id
                    ? 'bg-accent-500/20 text-accent-400 border border-accent-500/50'
                    : 'bg-white/5 text-white/60 border border-white/10 hover:border-white/20'
                }`}
              >
                {d.name}
              </button>
            ))}
          </div>
        )}

        {activePicker === 'format' && (
          <div className="space-y-2">
            {GAME_FORMATS.map(f => (
              <button
                key={f.id}
                onClick={() => handleFormatSelect(f.id)}
                className={`w-full p-3 rounded-xl text-sm font-medium text-left transition-all flex justify-between items-center ${
                  selectedFormat === f.id
                    ? 'bg-accent-500/20 text-accent-400 border border-accent-500/50'
                    : 'bg-white/5 text-white/60 border border-white/10 hover:border-white/20'
                }`}
              >
                <span>{f.name}</span>
                {f.points !== null && (
                  <span className="text-white/40 text-xs">{f.points} pts</span>
                )}
              </button>
            ))}

            {/* Custom points input */}
            {selectedFormat === 'custom' && (
              <div className="mt-3">
                <label className="text-xs text-white/50 uppercase tracking-wide block mb-2">Points Limit</label>
                <input
                  type="number"
                  min="1"
                  value={customPointsInput}
                  onChange={(e) => handleCustomPointsChange(e.target.value)}
                  className="w-full p-3 rounded-xl text-sm font-medium bg-white/5 text-white border border-white/10 focus:border-accent-500/50 focus:outline-none"
                  placeholder="Enter points limit"
                />
              </div>
            )}

            {/* Done button for custom */}
            {selectedFormat === 'custom' && (
              <button
                onClick={() => setActivePicker(null)}
                className="w-full mt-2 p-3 rounded-xl text-sm font-semibold bg-accent-500/20 text-accent-400 border border-accent-500/50"
              >
                Done
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
