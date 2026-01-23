'use client';

import { ReactNode } from 'react';
import { Button, Badge } from '@/components/ui';
import { useWakeLock } from '@/hooks';
import type { ValidationError } from '@/types';

// ============================================================================
// Validation Gate Component
// ============================================================================

interface ValidationGateProps {
  errors: ValidationError[];
  onReturnToBuild: () => void;
}

function ValidationGate({ errors, onReturnToBuild }: ValidationGateProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      <div className="card-depth p-8 max-w-lg w-full border border-red-500/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-red-400 text-2xl">!</div>
          <h2 className="text-xl font-bold text-gray-100">
            Cannot Enter Play Mode
          </h2>
        </div>

        <p className="text-white/60 mb-4">
          Your army list has validation errors that must be fixed before starting a game:
        </p>

        <ul className="space-y-2 mb-6">
          {errors.map((error, index) => (
            <li key={index} className="flex items-start gap-2">
              <Badge variant="error" size="sm">
                {error.type}
              </Badge>
              <span className="text-white/70 text-sm">{error.message}</span>
            </li>
          ))}
        </ul>

        <Button variant="primary" onClick={onReturnToBuild} className="w-full">
          Return to Build Mode
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Play Mode Layout Component
// ============================================================================

interface PlayModeProps {
  listName: string;
  totalPoints: number;
  pointsLimit: number;
  armyName: string;
  battleRound?: number;
  leftPanel?: ReactNode;
  middlePanel?: ReactNode;
  rightPanel?: ReactNode;
  onModeToggle?: () => void;
  canPlay?: boolean;
  validationErrors?: ValidationError[];
}

export function PlayMode({
  leftPanel,
  middlePanel,
  rightPanel,
  onModeToggle,
  canPlay = true,
  validationErrors = [],
}: PlayModeProps) {
  // Acquire wake lock to prevent screen sleep during gameplay
  const isPlayActive = canPlay && validationErrors.length === 0;
  useWakeLock(isPlayActive);

  // If there are validation errors and canPlay is false, show the gate
  if (!canPlay && validationErrors.length > 0) {
    return (
      <ValidationGate
        errors={validationErrors}
        onReturnToBuild={onModeToggle || (() => {})}
      />
    );
  }

  // Simple 3-column grid layout matching Alpine.js reference
  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
      {/* Left Panel - Army Overview */}
      <div className="lg:col-span-1 card-depth p-4 flex flex-col min-h-0 overflow-hidden">
        {leftPanel || (
          <div className="flex-1 flex items-center justify-center text-white/40">
            <p>No army overview available</p>
          </div>
        )}
      </div>

      {/* Middle Panel - Game State */}
      <div className="lg:col-span-1 card-depth p-4 flex flex-col min-h-0 overflow-y-auto scroll-smooth">
        {middlePanel || (
          <div className="flex-1 flex items-center justify-center text-white/40">
            <p>No game state available</p>
          </div>
        )}
      </div>

      {/* Right Panel - Selected Unit Details */}
      <div className="lg:col-span-1 card-depth p-4 flex flex-col min-h-0 overflow-y-auto scroll-smooth">
        {rightPanel || (
          <div className="flex-1 flex items-center justify-center text-white/40">
            <p>Select a unit from your army to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Mode Toggle Component (standalone, for use in navigation)
// ============================================================================

interface ModeToggleProps {
  mode: 'build' | 'play';
  onToggle: () => void;
  canPlay?: boolean;
  disabled?: boolean;
}

export function ModeToggle({
  mode,
  onToggle,
  canPlay = true,
  disabled = false,
}: ModeToggleProps) {
  const isDisabled = disabled || (mode === 'build' && !canPlay);

  return (
    <div className="segmented-control w-52">
      <div
        onClick={() => mode === 'play' && onToggle()}
        className={`segmented-control-item ${mode === 'build' ? 'active' : ''}`}
      >
        Build
      </div>
      <div
        onClick={() => mode === 'build' && !isDisabled && onToggle()}
        className={`
          segmented-control-item
          ${mode === 'play' ? 'active' : ''}
          ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}
        `}
        title={!canPlay && mode === 'build' ? 'Fix validation errors before playing' : undefined}
      >
        Play
      </div>
    </div>
  );
}
