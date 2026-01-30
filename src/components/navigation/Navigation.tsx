'use client';

import { useState } from 'react';
import type { AppMode, GamePhase, PlayerTurn } from '@/types';
import { GAME_PHASES } from '@/types';
import type { MobilePanel } from '@/stores/uiStore';

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
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ) : (
        // Wrench icon - switch to Build mode
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
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
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
    <nav className="nav-blur sticky top-0 z-50 shrink-0 overflow-x-hidden">
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
                <button
                  onClick={() => onMobilePanelChange('list')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    mobilePanel === 'list'
                      ? 'bg-accent-500 text-white'
                      : 'text-white/60'
                  }`}
                >
                  {mode === 'build' ? 'List' : 'Army'}
                </button>
                <button
                  onClick={() => onMobilePanelChange('roster')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    mobilePanel === 'roster'
                      ? 'bg-accent-500 text-white'
                      : 'text-white/60'
                  }`}
                >
                  {mode === 'build' ? 'Add' : 'Game'}
                </button>
                <button
                  onClick={() => onMobilePanelChange('details')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    mobilePanel === 'details'
                      ? 'bg-accent-500 text-white'
                      : 'text-white/60'
                  }`}
                >
                  {mode === 'build' ? 'Info' : 'Unit'}
                </button>
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
          </div>
        </div>
      </div>
    </nav>
  );
}
