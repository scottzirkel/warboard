'use client';

import { Button, Badge } from '@/components/ui';
import type { Unit } from '@/types';

interface RosterUnitRowProps {
  unit: Unit;
  onAdd: (unit: Unit) => void;
  isSelected?: boolean;
  className?: string;
}

export function RosterUnitRow({
  unit,
  onAdd,
  isSelected = false,
  className = '',
}: RosterUnitRowProps) {
  // Get model count options from points
  const modelCounts = Object.keys(unit.points).map(Number).sort((a, b) => a - b);
  const minCount = modelCounts[0];
  const maxCount = modelCounts[modelCounts.length - 1];
  const minPoints = unit.points[String(minCount)];

  // Check if unit is a Character
  const isCharacter = unit.keywords.includes('Character');

  return (
    <div
      className={`
        px-4 py-2 flex items-center justify-between gap-2
        hover:bg-gray-700/30 transition-colors
        ${isSelected ? 'bg-accent-500/10 border-l-2 border-accent-500' : ''}
        ${className}
      `}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-200 truncate">{unit.name}</span>
          {isCharacter && (
            <Badge variant="purple" size="sm">
              Character
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{minPoints} pts</span>
          {minCount !== maxCount && (
            <span className="text-gray-600">
              ({minCount}-{maxCount} models)
            </span>
          )}
          {minCount === maxCount && (
            <span className="text-gray-600">
              ({minCount} {minCount === 1 ? 'model' : 'models'})
            </span>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onAdd(unit)}
        className="shrink-0 text-accent-400 hover:text-accent-300 hover:bg-accent-500/10"
        aria-label={`Add ${unit.name}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      </Button>
    </div>
  );
}
