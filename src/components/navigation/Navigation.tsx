'use client';

import { useState } from 'react';
import type { AppMode, GamePhase, PlayerTurn } from '@/types';
import { GAME_PHASES } from '@/types';
import type { MobilePanel } from '@/stores/uiStore';
import { NavMenu } from './NavMenu';

// ============================================================================
// Mode Toggle Button Component
// ============================================================================

interface ModeToggleButtonProps {
  mode: AppMode;
  onToggle: () => void;
  canPlay?: boolean;
}

function ModeToggleButton({
  mode,
  onToggle,
  canPlay = true,
}: ModeToggleButtonProps) {
  const isDisabled = mode === 'build' && !canPlay;
  const targetMode = mode === 'build' ? 'Play' : 'Build';

  return (
    <button
      onClick={isDisabled ? undefined : onToggle}
      className={`btn-ios btn-ios-sm ${mode === 'play' ? 'btn-ios-primary' : 'btn-ios-tinted'} ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      title={isDisabled ? 'Fix list errors to enable Play Mode' : `Switch to ${targetMode} Mode`}
    >
      {mode === 'build' ? (
        // Play icon - switch to Play mode
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm14.024-.983a1.125 1.125 0 010 1.966l-5.603 3.113A1.125 1.125 0 019 15.113V8.887c0-.857.921-1.4 1.671-.983l5.603 3.113z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        // Wrench icon - switch to Build mode
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </button>
  );
}

// ============================================================================
// Quick Reference Toggle Button
// ============================================================================

interface QuickRefButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

function QuickRefButton({ isOpen, onClick }: QuickRefButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`btn-ios btn-ios-sm ${isOpen ? 'btn-ios-primary' : 'btn-ios-tinted'}`}
      title="Quick Reference"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    </button>
  );
}

// ============================================================================
// Compact Stepper Component (for header use)
// ============================================================================

interface CompactStepperProps {
  label: string;
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  minValue?: number;
  maxValue?: number;
  accentColor?: boolean;
}

function CompactStepper({
  label,
  value,
  onIncrement,
  onDecrement,
  minValue = 0,
  maxValue = 99,
  accentColor = false,
}: CompactStepperProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-white/50 text-xs uppercase tracking-wide">{label}</span>
      <div className="flex items-center bg-white/5 rounded-lg">
        <button
          onClick={onDecrement}
          disabled={value <= minValue}
          className="w-6 h-6 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-l-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <span className="text-sm font-medium">-</span>
        </button>
        <span className={`w-6 text-center text-sm font-bold ${accentColor ? 'text-accent-400' : 'text-white'}`}>
          {value}
        </span>
        <button
          onClick={onIncrement}
          disabled={value >= maxValue}
          className="w-6 h-6 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-r-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <span className="text-sm font-medium">+</span>
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Phase Tracker Component
// ============================================================================

const PHASE_LABELS: Record<GamePhase, string> = {
  command: 'CMD',
  movement: 'MOV',
  shooting: 'SHT',
  charge: 'CHG',
  fight: 'FGT',
};

interface PhaseTrackerProps {
  currentPhase: GamePhase;
  playerTurn: PlayerTurn;
  onPhaseChange: (phase: GamePhase) => void;
  onAdvance: () => void;
  onToggleTurn: () => void;
}

function PhaseTracker({ currentPhase, playerTurn, onPhaseChange, onAdvance, onToggleTurn }: PhaseTrackerProps) {
  const isOpponentTurn = playerTurn === 'opponent';

  return (
    <div className="flex items-center gap-2">
      {/* Turn Indicator (clickable to toggle) */}
      <button
        onClick={onToggleTurn}
        className={`px-2 py-1 text-xs font-bold rounded transition-colors ${
          isOpponentTurn
            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
            : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
        }`}
        title={`${isOpponentTurn ? "Opponent's Turn" : "Your Turn"} (click to toggle)`}
      >
        {isOpponentTurn ? 'OPP' : 'YOU'}
      </button>

      {/* Phase Pills */}
      <div className={`flex items-center gap-0.5 rounded-lg p-0.5 ${isOpponentTurn ? 'bg-red-500/10' : 'bg-white/5'}`}>
        {GAME_PHASES.map((phase) => (
          <button
            key={phase}
            onClick={() => onPhaseChange(phase)}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              currentPhase === phase
                ? isOpponentTurn
                  ? 'bg-red-500 text-white'
                  : 'bg-accent-500 text-white'
                : isOpponentTurn
                  ? 'text-red-400/50 hover:text-red-400 hover:bg-red-500/20'
                  : 'text-white/50 hover:text-white hover:bg-white/10'
            }`}
            title={phase.charAt(0).toUpperCase() + phase.slice(1) + ' Phase'}
          >
            {PHASE_LABELS[phase]}
          </button>
        ))}
      </div>

      {/* Advance Button */}
      <button
        onClick={onAdvance}
        className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
        title="Advance to next phase"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

// ============================================================================
// Game State Bar (Play Mode Header)
// ============================================================================

interface GameStateBarProps {
  battleRound: number;
  onBattleRoundChange: (round: number) => void;
  commandPoints: number;
  onCommandPointsChange: (cp: number) => void;
  primaryVP: number;
  onPrimaryVPChange: (vp: number) => void;
  secondaryVP: number;
  onSecondaryVPChange: (vp: number) => void;
  currentPhase: GamePhase;
  playerTurn: PlayerTurn;
  onPhaseChange: (phase: GamePhase) => void;
  onAdvance: () => void;
  onToggleTurn: () => void;
  onReset: () => void;
}

function GameStateBar({
  battleRound,
  onBattleRoundChange,
  commandPoints,
  onCommandPointsChange,
  primaryVP,
  onPrimaryVPChange,
  secondaryVP,
  onSecondaryVPChange,
  currentPhase,
  playerTurn,
  onPhaseChange,
  onAdvance,
  onToggleTurn,
  onReset,
}: GameStateBarProps) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleResetClick = () => {
    setShowResetConfirm(true);
  };

  const handleConfirmReset = () => {
    onReset();
    setShowResetConfirm(false);
  };

  const handleCancelReset = () => {
    setShowResetConfirm(false);
  };

  return (
    <div className="flex items-center gap-4">
      {/* Reset Button */}
      {showResetConfirm ? (
        <div className="flex items-center gap-1">
          <button
            onClick={handleConfirmReset}
            className="px-2 py-1 text-xs font-medium rounded bg-red-500 hover:bg-red-600 text-white transition-colors"
            title="Confirm reset"
          >
            Reset?
          </button>
          <button
            onClick={handleCancelReset}
            className="px-2 py-1 text-xs font-medium rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Cancel"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={handleResetClick}
          className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          title="Reset game"
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
        </button>
      )}

      <div className="h-4 w-px bg-white/10" />

      {/* Round */}
      <CompactStepper
        label="R"
        value={battleRound}
        onDecrement={() => onBattleRoundChange(battleRound - 1)}
        onIncrement={() => onBattleRoundChange(battleRound + 1)}
        minValue={1}
        maxValue={5}
      />

      <div className="h-4 w-px bg-white/10" />

      {/* Command Points */}
      <CompactStepper
        label="CP"
        value={commandPoints}
        onDecrement={() => onCommandPointsChange(commandPoints - 1)}
        onIncrement={() => onCommandPointsChange(commandPoints + 1)}
        accentColor
      />

      <div className="h-4 w-px bg-white/10" />

      {/* Primary VP */}
      <CompactStepper
        label="1°"
        value={primaryVP}
        onDecrement={() => onPrimaryVPChange(primaryVP - 1)}
        onIncrement={() => onPrimaryVPChange(primaryVP + 1)}
      />

      {/* Secondary VP */}
      <CompactStepper
        label="2°"
        value={secondaryVP}
        onDecrement={() => onSecondaryVPChange(secondaryVP - 1)}
        onIncrement={() => onSecondaryVPChange(secondaryVP + 1)}
      />

      <div className="h-4 w-px bg-white/10" />

      {/* Phase Tracker */}
      <PhaseTracker
        currentPhase={currentPhase}
        playerTurn={playerTurn}
        onPhaseChange={onPhaseChange}
        onAdvance={onAdvance}
        onToggleTurn={onToggleTurn}
      />
    </div>
  );
}

// ============================================================================
// Main Navigation Component
// ============================================================================

interface NavigationProps {
  // Mode toggle
  mode: AppMode;
  onModeToggle: () => void;
  canPlay?: boolean;

  // Mobile panel switcher
  mobilePanel?: MobilePanel;
  onMobilePanelChange?: (panel: MobilePanel) => void;

  // Game state (Play mode)
  battleRound?: number;
  onBattleRoundChange?: (round: number) => void;
  commandPoints?: number;
  onCommandPointsChange?: (cp: number) => void;
  primaryVP?: number;
  onPrimaryVPChange?: (vp: number) => void;
  secondaryVP?: number;
  onSecondaryVPChange?: (vp: number) => void;
  currentPhase?: GamePhase;
  playerTurn?: PlayerTurn;
  onPhaseChange?: (phase: GamePhase) => void;
  onAdvance?: () => void;
  onToggleTurn?: () => void;
  onReset?: () => void;

  // Quick reference panel
  showReferencePanel?: boolean;
  onToggleReferencePanel?: () => void;

  // Nav menu actions
  onSave?: () => void;
  onLoad?: () => void;
  onImport?: () => void;
  onExport?: () => void;
  onClear?: () => void;
  onStartOver?: () => void;
  canExport?: boolean;
  canClear?: boolean;

  // Loading state
  isLoading?: boolean;
}

export function Navigation({
  mode,
  onModeToggle,
  canPlay = true,
  mobilePanel,
  onMobilePanelChange,
  battleRound = 1,
  onBattleRoundChange,
  commandPoints = 0,
  onCommandPointsChange,
  primaryVP = 0,
  onPrimaryVPChange,
  secondaryVP = 0,
  onSecondaryVPChange,
  currentPhase = 'command',
  playerTurn = 'player',
  onPhaseChange,
  onAdvance,
  onToggleTurn,
  onReset,
  showReferencePanel = false,
  onToggleReferencePanel,
  onSave,
  onLoad,
  onImport,
  onExport,
  onClear,
  onStartOver,
  canExport = false,
  canClear = false,
  isLoading = false,
}: NavigationProps) {
  const showGameState = mode === 'play' &&
    onBattleRoundChange &&
    onCommandPointsChange &&
    onPrimaryVPChange &&
    onSecondaryVPChange &&
    onPhaseChange &&
    onAdvance &&
    onToggleTurn &&
    onReset;

  return (
    <nav className="nav-blur fixed lg:sticky top-0 left-0 right-0 z-50 shrink-0 overflow-x-clip overflow-y-visible">
      <div className="px-2 lg:px-4">
        <div className="h-14 flex items-center justify-between gap-2 lg:gap-4">
          {/* Left: Mode Toggle + Mobile Panel Switcher */}
          <div className="flex items-center gap-3 shrink-0 min-w-0">
            <ModeToggleButton
              mode={mode}
              onToggle={onModeToggle}
              canPlay={canPlay}
            />
            {onMobilePanelChange && (
              <div className="flex lg:hidden items-center bg-white/10 rounded-lg overflow-hidden">
                {mode === 'play' ? (
                  <>
                    <button
                      onClick={() => onMobilePanelChange('roster')}
                      className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                        mobilePanel === 'roster'
                          ? 'bg-accent-500 text-white'
                          : 'text-white/60'
                      }`}
                    >
                      Game
                    </button>
                    <button
                      onClick={() => onMobilePanelChange('list')}
                      className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                        mobilePanel === 'list'
                          ? 'bg-accent-500 text-white'
                          : 'text-white/60'
                      }`}
                    >
                      Army
                    </button>
                    <button
                      onClick={() => onMobilePanelChange('details')}
                      className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                        mobilePanel === 'details'
                          ? 'bg-accent-500 text-white'
                          : 'text-white/60'
                      }`}
                    >
                      Unit
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => onMobilePanelChange('list')}
                      className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                        mobilePanel === 'list'
                          ? 'bg-accent-500 text-white'
                          : 'text-white/60'
                      }`}
                    >
                      Roster
                    </button>
                    <button
                      onClick={() => onMobilePanelChange('roster')}
                      className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                        mobilePanel === 'roster'
                          ? 'bg-accent-500 text-white'
                          : 'text-white/60'
                      }`}
                    >
                      Units
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Center: Game State (Play mode only, hidden on mobile) */}
          {showGameState && (
            <div className="hidden lg:flex flex-1 justify-center">
              <GameStateBar
                battleRound={battleRound}
                onBattleRoundChange={onBattleRoundChange}
                commandPoints={commandPoints}
                onCommandPointsChange={onCommandPointsChange}
                primaryVP={primaryVP}
                onPrimaryVPChange={onPrimaryVPChange}
                secondaryVP={secondaryVP}
                onSecondaryVPChange={onSecondaryVPChange}
                currentPhase={currentPhase}
                playerTurn={playerTurn}
                onPhaseChange={onPhaseChange}
                onAdvance={onAdvance}
                onToggleTurn={onToggleTurn}
                onReset={onReset}
              />
            </div>
          )}

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {isLoading && (
              <div className="flex items-center gap-2 text-gray-400">
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
            )}

            {onToggleReferencePanel && (
              <QuickRefButton
                isOpen={showReferencePanel}
                onClick={onToggleReferencePanel}
              />
            )}

            {onSave && onLoad && onImport && onExport && onClear && onStartOver && (
              <NavMenu
                onSave={onSave}
                onLoad={onLoad}
                onImport={onImport}
                onExport={onExport}
                onClear={onClear}
                onStartOver={onStartOver}
                canExport={canExport}
                canClear={canClear}
              />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
