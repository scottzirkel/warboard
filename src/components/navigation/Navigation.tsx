'use client';

import { Select, type SelectOption } from '@/components/ui';
import { ModeToggle } from '@/components/play';
import type { AppMode } from '@/types';

// ============================================================================
// Army Selector Component
// ============================================================================

export interface AvailableArmy {
  id: string;
  name: string;
  disabled?: boolean;
}

interface ArmySelectorProps {
  armies: AvailableArmy[];
  selectedArmyId: string;
  onArmyChange: (armyId: string) => void;
  disabled?: boolean;
}

export function ArmySelector({
  armies,
  selectedArmyId,
  onArmyChange,
  disabled = false,
}: ArmySelectorProps) {
  const options: SelectOption[] = armies.map(army => ({
    value: army.id,
    label: army.name,
    disabled: army.disabled,
  }));

  return (
    <Select
      value={selectedArmyId}
      onChange={(e) => onArmyChange(e.target.value)}
      options={options}
      disabled={disabled}
      size="sm"
      className="w-40"
    />
  );
}

// ============================================================================
// List Name Display Component
// ============================================================================

interface ListNameDisplayProps {
  name: string;
  totalPoints: number;
  pointsLimit: number;
}

function ListNameDisplay({ name, totalPoints, pointsLimit }: ListNameDisplayProps) {
  const isOverLimit = totalPoints > pointsLimit;

  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-200 font-medium truncate max-w-[200px]">
        {name || 'Unnamed List'}
      </span>
      <span className="text-sm">
        <span className={isOverLimit ? 'text-red-400 font-bold' : 'text-accent-400 font-bold'}>
          {totalPoints}
        </span>
        <span className="text-gray-500"> / {pointsLimit} pts</span>
      </span>
    </div>
  );
}

// ============================================================================
// Main Navigation Component
// ============================================================================

interface NavigationProps {
  // Army selection
  armies: AvailableArmy[];
  selectedArmyId: string;
  onArmyChange: (armyId: string) => void;

  // Mode toggle
  mode: AppMode;
  onModeToggle: () => void;
  canPlay?: boolean;

  // List info
  listName: string;
  totalPoints: number;
  pointsLimit: number;

  // Loading state
  isLoading?: boolean;
}

export function Navigation({
  armies,
  selectedArmyId,
  onArmyChange,
  mode,
  onModeToggle,
  canPlay = true,
  listName,
  totalPoints,
  pointsLimit,
  isLoading = false,
}: NavigationProps) {
  return (
    <nav className="nav-blur sticky top-0 z-50 border-b border-gray-700/50">
      <div className="px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          {/* Left: App title and army selector */}
          <div className="flex items-center gap-4">
            {/* App Title */}
            <div className="flex items-center gap-2">
              <svg
                className="w-6 h-6 text-accent-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <span className="text-lg font-bold text-gray-100 hidden sm:inline">
                Army Tracker
              </span>
            </div>

            {/* Army Selector */}
            <ArmySelector
              armies={armies}
              selectedArmyId={selectedArmyId}
              onArmyChange={onArmyChange}
              disabled={isLoading || mode === 'play'}
            />
          </div>

          {/* Center: List name and points */}
          <ListNameDisplay
            name={listName}
            totalPoints={totalPoints}
            pointsLimit={pointsLimit}
          />

          {/* Right: Mode toggle */}
          <div className="flex items-center gap-3">
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
                <span className="text-sm">Loading...</span>
              </div>
            )}

            <ModeToggle
              mode={mode}
              onToggle={onModeToggle}
              canPlay={canPlay}
              disabled={isLoading}
            />
          </div>
        </div>
      </div>
    </nav>
  );
}
