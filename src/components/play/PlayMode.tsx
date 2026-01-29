'use client';

import { useState, ReactNode } from 'react';
import { Button, Badge } from '@/components/ui';
import { useWakeLock } from '@/hooks';
import type { ValidationError } from '@/types';
import type { MobilePanel } from '@/stores/uiStore';

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
  commandPoints?: number;
  primaryVP?: number;
  secondaryVP?: number;
  currentPhase?: string;
  playerTurn?: 'player' | 'opponent';
  // Game state callbacks
  onBattleRoundChange?: (round: number) => void;
  onCommandPointsChange?: (cp: number) => void;
  onPrimaryVPChange?: (vp: number) => void;
  onSecondaryVPChange?: (vp: number) => void;
  onToggleTurn?: () => void;
  onAdvance?: () => void;
  onReset?: () => void;
  leftPanel?: ReactNode;
  middlePanel?: ReactNode;
  rightPanel?: ReactNode;
  onModeToggle?: () => void;
  canPlay?: boolean;
  validationErrors?: ValidationError[];
  // Mobile panel state
  mobilePanel?: MobilePanel;
}

export function PlayMode({
  leftPanel,
  middlePanel,
  rightPanel,
  onModeToggle,
  canPlay = true,
  validationErrors = [],
  mobilePanel = 'list',
  battleRound = 1,
  commandPoints = 0,
  primaryVP = 0,
  secondaryVP = 0,
  currentPhase = 'command',
  playerTurn = 'player',
  onBattleRoundChange,
  onCommandPointsChange,
  onPrimaryVPChange,
  onSecondaryVPChange,
  onToggleTurn,
  onAdvance,
  onReset,
}: PlayModeProps) {
  // Reset confirmation state for mobile
  const [showResetConfirm, setShowResetConfirm] = useState(false);
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

  // Format phase name for display
  const phaseDisplay = currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1);

  return (
    <div className="lg:h-full flex flex-col gap-4 p-4">
      {/* Desktop: 3-column grid layout (hidden on mobile) */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_1.25fr_1.75fr] gap-4 flex-1 min-h-0">
        {/* Left Panel - Army Overview (narrower) */}
        <div className="card-depth p-4 flex flex-col min-h-0 overflow-hidden">
          {leftPanel || (
            <div className="flex-1 flex items-center justify-center text-white/40">
              <p>No army overview available</p>
            </div>
          )}
        </div>

        {/* Middle Panel - Game State */}
        <div className="card-depth p-4 flex flex-col min-h-0 overflow-y-auto scroll-smooth">
          {middlePanel || (
            <div className="flex-1 flex items-center justify-center text-white/40">
              <p>No game state available</p>
            </div>
          )}
        </div>

        {/* Right Panel - Selected Unit Details (wider) */}
        <div className="card-depth p-4 flex flex-col min-h-0 overflow-y-auto scroll-smooth">
          {rightPanel || (
            <div className="flex-1 flex items-center justify-center text-white/40">
              <p>Select a unit from your army to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: Single panel view */}
      <div className="flex lg:hidden flex-col gap-4">
        {mobilePanel === 'roster' ? (
          <>
            {/* Game State Controls - only on Game tab */}
            <div className="card-depth p-4 space-y-4">
              {/* Round & Turn Row */}
              <div className="flex items-center justify-between">
                {/* Round Stepper */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onBattleRoundChange?.(Math.max(1, battleRound - 1))}
                    className="w-10 h-10 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 flex items-center justify-center text-xl"
                  >
                    −
                  </button>
                  <div className="w-16 text-center">
                    <div className="text-xs text-white/50 uppercase">Round</div>
                    <div className="text-2xl text-white font-bold">{battleRound}</div>
                  </div>
                  <button
                    onClick={() => onBattleRoundChange?.(Math.min(5, battleRound + 1))}
                    className="w-10 h-10 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 flex items-center justify-center text-xl"
                  >
                    +
                  </button>
                </div>

                {/* Turn Toggle */}
                <button
                  onClick={onToggleTurn}
                  className={`px-4 py-2 rounded-lg text-base font-semibold transition-colors ${
                    playerTurn === 'player'
                      ? 'bg-accent-500 text-white'
                      : 'bg-red-500 text-white'
                  }`}
                >
                  {playerTurn === 'player' ? 'Your Turn' : 'Opponent'}
                </button>
              </div>

              {/* Phase Row */}
              <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                <div>
                  <div className="text-xs text-white/50 uppercase">Phase</div>
                  <div className="text-lg text-white font-semibold">{phaseDisplay}</div>
                </div>
                <button
                  onClick={onAdvance}
                  className="px-5 py-2.5 rounded-lg bg-accent-500 text-white font-semibold"
                >
                  Next Phase
                </button>
              </div>

              {/* CP & VP Row */}
              <div className="grid grid-cols-3 gap-3">
                {/* CP */}
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xs text-white/50 uppercase text-center mb-2">CP</div>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onCommandPointsChange?.(Math.max(0, commandPoints - 1))}
                      className="w-9 h-9 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 flex items-center justify-center text-lg"
                    >
                      −
                    </button>
                    <span className="text-2xl font-bold text-accent-400 w-8 text-center">{commandPoints}</span>
                    <button
                      onClick={() => onCommandPointsChange?.(commandPoints + 1)}
                      className="w-9 h-9 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 flex items-center justify-center text-lg"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Primary VP */}
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xs text-white/50 uppercase text-center mb-2">Primary</div>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onPrimaryVPChange?.(Math.max(0, primaryVP - 1))}
                      className="w-9 h-9 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 flex items-center justify-center text-lg"
                    >
                      −
                    </button>
                    <span className="text-2xl font-bold text-green-400 w-8 text-center">{primaryVP}</span>
                    <button
                      onClick={() => onPrimaryVPChange?.(primaryVP + 1)}
                      className="w-9 h-9 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 flex items-center justify-center text-lg"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Secondary VP */}
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xs text-white/50 uppercase text-center mb-2">Secondary</div>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onSecondaryVPChange?.(Math.max(0, secondaryVP - 1))}
                      className="w-9 h-9 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 flex items-center justify-center text-lg"
                    >
                      −
                    </button>
                    <span className="text-2xl font-bold text-blue-400 w-8 text-center">{secondaryVP}</span>
                    <button
                      onClick={() => onSecondaryVPChange?.(secondaryVP + 1)}
                      className="w-9 h-9 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 flex items-center justify-center text-lg"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Reset Game Button */}
              {onReset && (
                <div className="pt-2 border-t border-white/10">
                  {showResetConfirm ? (
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-white/60 text-sm">Reset game?</span>
                      <button
                        onClick={() => {
                          onReset();
                          setShowResetConfirm(false);
                        }}
                        className="px-4 py-2 rounded-lg bg-red-500 text-white font-semibold"
                      >
                        Yes, Reset
                      </button>
                      <button
                        onClick={() => setShowResetConfirm(false)}
                        className="px-4 py-2 rounded-lg bg-white/10 text-white font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowResetConfirm(true)}
                      className="w-full py-2 rounded-lg bg-white/5 text-white/50 font-medium flex items-center justify-center gap-2"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Reset Game
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Game Panel Content (stratagems, etc.) */}
            <div className="card-depth p-4">
              {middlePanel || (
                <div className="flex items-center justify-center text-white/40 py-8">
                  <p>No game state available</p>
                </div>
              )}
            </div>
          </>
        ) : mobilePanel === 'details' ? (
          rightPanel || (
            <div className="flex items-center justify-center text-white/40 py-8">
              <p>Select a unit from your army to view details</p>
            </div>
          )
        ) : (
          leftPanel || (
            <div className="flex items-center justify-center text-white/40 py-8">
              <p>No army overview available</p>
            </div>
          )
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
