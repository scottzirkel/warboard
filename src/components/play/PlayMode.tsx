'use client';

import { ReactNode } from 'react';
import { Panel, Button, Badge } from '@/components/ui';
import type { ValidationError } from '@/types';

// ============================================================================
// Placeholder Panel Components (to be replaced by subsequent tasks)
// ============================================================================

interface PlaceholderPanelProps {
  title: string;
  description: string;
}

function PlaceholderPanel({ title, description }: PlaceholderPanelProps) {
  return (
    <Panel title={title}>
      <div className="p-4 text-center text-gray-500">
        <p className="text-sm">{description}</p>
        <p className="text-xs mt-2 text-gray-600">
          (Component to be implemented in future tasks)
        </p>
      </div>
    </Panel>
  );
}

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
      <div className="bg-gray-800/70 rounded-lg p-8 max-w-lg w-full border border-red-500/30">
        <div className="flex items-center gap-3 mb-4">
          <svg
            className="w-8 h-8 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="text-xl font-bold text-gray-100">
            Cannot Enter Play Mode
          </h2>
        </div>

        <p className="text-gray-400 mb-4">
          Your army list has validation errors that must be fixed before starting a game:
        </p>

        <ul className="space-y-2 mb-6">
          {errors.map((error, index) => (
            <li key={index} className="flex items-start gap-2">
              <Badge variant="error" size="sm">
                {error.type}
              </Badge>
              <span className="text-gray-300 text-sm">{error.message}</span>
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
// Play Mode Header Component
// ============================================================================

interface PlayModeHeaderProps {
  listName: string;
  totalPoints: number;
  pointsLimit: number;
  armyName: string;
  battleRound?: number;
  onModeToggle?: () => void;
}

function PlayModeHeader({
  listName,
  totalPoints,
  pointsLimit,
  armyName,
  battleRound,
  onModeToggle,
}: PlayModeHeaderProps) {
  return (
    <div className="shrink-0 px-4 py-3 bg-gray-800/50 border-b border-gray-700/50">
      <div className="flex items-center justify-between">
        {/* Left: List name and army */}
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-100">
            {listName || 'Unnamed List'}
          </h1>
          <span className="text-sm text-gray-400">{armyName}</span>
          {battleRound !== undefined && (
            <Badge variant="accent" size="sm">
              Round {battleRound}
            </Badge>
          )}
        </div>

        {/* Right: Points and mode toggle */}
        <div className="flex items-center gap-4">
          <span className="text-sm">
            <span className="text-accent-400 font-bold">{totalPoints}</span>
            <span className="text-gray-500"> / {pointsLimit} pts</span>
          </span>

          {onModeToggle && (
            <Button variant="secondary" size="sm" onClick={onModeToggle}>
              <svg
                className="w-4 h-4 mr-1.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Edit List
            </Button>
          )}
        </div>
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
  listName,
  totalPoints,
  pointsLimit,
  armyName,
  battleRound,
  leftPanel,
  middlePanel,
  rightPanel,
  onModeToggle,
  canPlay = true,
  validationErrors = [],
}: PlayModeProps) {
  // If there are validation errors and canPlay is false, show the gate
  if (!canPlay && validationErrors.length > 0) {
    return (
      <div className="h-full flex flex-col">
        <PlayModeHeader
          listName={listName}
          totalPoints={totalPoints}
          pointsLimit={pointsLimit}
          armyName={armyName}
          onModeToggle={onModeToggle}
        />
        <ValidationGate
          errors={validationErrors}
          onReturnToBuild={onModeToggle || (() => {})}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header Bar - Army Info */}
      <PlayModeHeader
        listName={listName}
        totalPoints={totalPoints}
        pointsLimit={pointsLimit}
        armyName={armyName}
        battleRound={battleRound}
        onModeToggle={onModeToggle}
      />

      {/* Three Column Grid */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
        {/* Left Panel - Army Overview */}
        <div className="overflow-hidden flex flex-col min-h-0">
          {leftPanel || (
            <PlaceholderPanel
              title="Army Overview"
              description="Unit list with wounds and models alive"
            />
          )}
        </div>

        {/* Middle Panel - Game State */}
        <div className="overflow-hidden flex flex-col min-h-0">
          {middlePanel || (
            <PlaceholderPanel
              title="Game State"
              description="Battle round, CP, Ka'tah, and stratagems"
            />
          )}
        </div>

        {/* Right Panel - Selected Unit Details */}
        <div className="overflow-hidden flex flex-col min-h-0">
          {rightPanel || (
            <PlaceholderPanel
              title="Selected Unit"
              description="Stats, weapons, and damage tracker"
            />
          )}
        </div>
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
    <div className="inline-flex rounded-lg bg-gray-800 p-1">
      <button
        onClick={() => mode === 'play' && onToggle()}
        className={`
          px-3 py-1.5 text-sm font-medium rounded-md transition-colors
          ${mode === 'build'
            ? 'bg-accent-500 text-gray-900'
            : 'text-gray-400 hover:text-gray-200'}
        `}
      >
        Build
      </button>
      <button
        onClick={() => mode === 'build' && onToggle()}
        disabled={isDisabled}
        className={`
          px-3 py-1.5 text-sm font-medium rounded-md transition-colors
          ${mode === 'play'
            ? 'bg-green-600 text-white'
            : 'text-gray-400 hover:text-gray-200'}
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        title={!canPlay && mode === 'build' ? 'Fix validation errors before playing' : undefined}
      >
        Play
      </button>
    </div>
  );
}
