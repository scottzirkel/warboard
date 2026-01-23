'use client';

import { Card, Badge } from '@/components/ui';
import type { Unit, ListUnit } from '@/types';

interface PlayUnitCardProps {
  unit: Unit;
  listUnit: ListUnit;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  // Wound tracking
  currentWounds: number;
  maxWounds: number;
  modelsAlive: number;
  totalModels: number;
  // Attached leader info
  attachedLeaderName?: string;
  attachedLeaderUnit?: Unit;
  attachedLeaderListUnit?: ListUnit;
  leaderCurrentWounds?: number;
  leaderMaxWounds?: number;
  leaderModelsAlive?: number;
  leaderTotalModels?: number;
  // Enhancement info
  enhancementName?: string;
  // Points
  unitPoints?: number;
  className?: string;
}

export function PlayUnitCard({
  unit,
  listUnit: _listUnit,
  index: _index,
  isSelected,
  onSelect,
  currentWounds,
  maxWounds,
  modelsAlive,
  totalModels,
  attachedLeaderName,
  attachedLeaderUnit,
  attachedLeaderListUnit: _attachedLeaderListUnit,
  leaderCurrentWounds = 0,
  leaderMaxWounds = 0,
  leaderModelsAlive = 0,
  leaderTotalModels = 0,
  enhancementName,
  unitPoints,
  className = '',
}: PlayUnitCardProps) {
  const hasAttachedLeader = !!attachedLeaderName && !!attachedLeaderUnit;

  // Combined model count (unit + leader)
  const combinedModelsAlive = modelsAlive + leaderModelsAlive;
  const combinedTotalModels = totalModels + leaderTotalModels;

  // Combined wounds (unit + leader)
  const combinedCurrentWounds = currentWounds + leaderCurrentWounds;
  const combinedMaxWounds = maxWounds + leaderMaxWounds;

  // Determine unit status
  const isDestroyed = combinedCurrentWounds <= 0;
  const isDamaged = combinedModelsAlive < combinedTotalModels;

  // Combined unit name (matches Alpine's getCombinedUnitName)
  const displayName = hasAttachedLeader
    ? `${unit.name} + ${attachedLeaderName}`
    : unit.name;

  return (
    <Card
      selected={isSelected}
      hoverable
      onClick={onSelect}
      className={`
        ${isDestroyed ? 'opacity-50' : ''}
        ${className}
      `}
    >
      <div className="list-row">
        <div className="flex-1 min-w-0">
          {/* Combined Unit Name */}
          <div className="font-semibold truncate">{displayName}</div>

          {/* Models and Enhancement */}
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`text-xs ${isDamaged ? 'text-red-400' : 'text-white/50'}`}
            >
              {combinedModelsAlive}/{combinedTotalModels} models
            </span>
            {enhancementName && (
              <Badge variant="accent" size="sm">{enhancementName}</Badge>
            )}
          </div>

          {/* Leader Indicator (matches Alpine: shows both combined name AND leader indicator) */}
          {hasAttachedLeader && (
            <div className="text-xs text-purple-400 mt-0.5">
              + {attachedLeaderName}
            </div>
          )}
        </div>

        {/* Right Side: Points and Wounds */}
        <div className="text-right shrink-0">
          {unitPoints !== undefined && (
            <div className="text-sm text-accent-400 font-semibold">{unitPoints} pts</div>
          )}
          <div className="text-xs text-white/40 mt-1">
            W: {combinedCurrentWounds}/{combinedMaxWounds}
          </div>
        </div>

        {/* Chevron */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-white/30 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Card>
  );
}
