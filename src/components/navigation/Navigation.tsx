'use client';

import type { SelectOption } from '@/components/ui';
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
    label: army.name + (army.disabled ? ' (Coming Soon)' : ''),
    disabled: army.disabled,
  }));

  return (
    <select
      value={selectedArmyId}
      onChange={(e) => onArmyChange(e.target.value)}
      disabled={disabled}
      className="select-dark text-accent-400 font-semibold text-sm"
    >
      {options.map(opt => (
        <option
          key={opt.value}
          value={opt.value}
          disabled={opt.disabled}
          className="bg-gray-900 text-white"
        >
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// ============================================================================
// Mode Segmented Control Component
// ============================================================================

interface ModeSegmentedControlProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  canPlay?: boolean;
}

function ModeSegmentedControl({
  mode,
  onModeChange,
  canPlay = true,
}: ModeSegmentedControlProps) {
  return (
    <div className="segmented-control w-52">
      <div
        onClick={() => onModeChange('build')}
        className={`segmented-control-item ${mode === 'build' ? 'active' : ''}`}
      >
        Build
      </div>
      <div
        onClick={() => canPlay && onModeChange('play')}
        className={`segmented-control-item ${mode === 'play' ? 'active' : ''} ${!canPlay ? 'opacity-40 cursor-not-allowed' : ''}`}
        title={!canPlay ? 'Fix points limit to enable Play Mode' : undefined}
      >
        Play
      </div>
    </div>
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
// Main Navigation Component
// ============================================================================

interface NavigationProps {
  // Army selection
  armies: AvailableArmy[];
  selectedArmyId: string;
  onArmyChange: (armyId: string) => void;

  // Mode toggle
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  canPlay?: boolean;

  // Quick reference panel
  showReferencePanel?: boolean;
  onToggleReferencePanel?: () => void;

  // Loading state
  isLoading?: boolean;
}

export function Navigation({
  armies,
  selectedArmyId,
  onArmyChange,
  mode,
  onModeChange,
  canPlay = true,
  showReferencePanel = false,
  onToggleReferencePanel,
  isLoading = false,
}: NavigationProps) {
  return (
    <nav className="nav-blur sticky top-0 z-50 shrink-0">
      <div className="max-w-7xl mx-auto px-4">
        <div className="h-14 flex items-center justify-between">
          {/* Left: Army Selector */}
          <div className="flex items-center gap-3">
            <ArmySelector
              armies={armies}
              selectedArmyId={selectedArmyId}
              onArmyChange={onArmyChange}
              disabled={isLoading || mode === 'play'}
            />
          </div>

          {/* Center: Mode Segmented Control */}
          <ModeSegmentedControl
            mode={mode}
            onModeChange={onModeChange}
            canPlay={canPlay}
          />

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
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

// Re-export ModeToggle for backward compatibility (used by PlayMode header)
export { ModeSegmentedControl as ModeToggle };
