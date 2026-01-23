'use client';

import { Stepper, Badge } from '@/components/ui';

interface CommandPointsControlProps {
  points: number;
  onPointsChange: (points: number) => void;
  maxPoints?: number;
  className?: string;
}

export function CommandPointsControl({
  points,
  onPointsChange,
  maxPoints = 20,
  className = '',
}: CommandPointsControlProps) {
  return (
    <div className={`bg-gray-700/30 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">
          Command Points
        </span>
        <Badge variant={points > 0 ? 'accent' : 'default'} size="sm">
          {points} CP
        </Badge>
      </div>

      <div className="flex items-center justify-center">
        <Stepper
          value={points}
          min={0}
          max={maxPoints}
          onChange={onPointsChange}
          size="md"
        />
      </div>

      <div className="flex justify-center gap-2 mt-3">
        <QuickAdjustButton
          label="-1"
          onClick={() => onPointsChange(Math.max(0, points - 1))}
          disabled={points <= 0}
          variant="decrease"
        />
        <QuickAdjustButton
          label="-2"
          onClick={() => onPointsChange(Math.max(0, points - 2))}
          disabled={points <= 0}
          variant="decrease"
        />
        <QuickAdjustButton
          label="+1"
          onClick={() => onPointsChange(Math.min(maxPoints, points + 1))}
          disabled={points >= maxPoints}
          variant="increase"
        />
        <QuickAdjustButton
          label="+2"
          onClick={() => onPointsChange(Math.min(maxPoints, points + 2))}
          disabled={points >= maxPoints}
          variant="increase"
        />
      </div>

      <p className="text-center text-xs text-gray-500 mt-3">
        Gain 1 CP at the start of each Command Phase
      </p>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

interface QuickAdjustButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant: 'increase' | 'decrease';
}

function QuickAdjustButton({
  label,
  onClick,
  disabled = false,
  variant,
}: QuickAdjustButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        px-3 py-1 text-xs font-medium rounded transition-colors
        ${variant === 'increase'
          ? 'bg-green-900/50 text-green-400 hover:bg-green-900/70 border border-green-700/50'
          : 'bg-red-900/50 text-red-400 hover:bg-red-900/70 border border-red-700/50'}
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
    >
      {label}
    </button>
  );
}
