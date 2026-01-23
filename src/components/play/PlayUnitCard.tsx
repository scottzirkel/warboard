'use client';

import { Card, Badge, SimpleWoundBar } from '@/components/ui';
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
  className = '',
}: PlayUnitCardProps) {
  const hasAttachedLeader = !!attachedLeaderName && !!attachedLeaderUnit;
  const isCharacter = unit.keywords?.includes('Character') || false;

  // Combined model count (unit + leader)
  const combinedModelsAlive = modelsAlive + leaderModelsAlive;
  const combinedTotalModels = totalModels + leaderTotalModels;

  // Combined wounds (unit + leader)
  const combinedCurrentWounds = currentWounds + leaderCurrentWounds;
  const combinedMaxWounds = maxWounds + leaderMaxWounds;

  // Determine unit status
  const isDestroyed = combinedCurrentWounds <= 0;
  const isDamaged = combinedCurrentWounds < combinedMaxWounds;

  // Get combined unit name
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
      <div className="p-3 space-y-2">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-gray-200 truncate">
                {displayName}
              </h4>
            </div>
            {/* Badges */}
            <div className="flex flex-wrap gap-1 mt-1">
              {isCharacter && !hasAttachedLeader && (
                <Badge variant="accent" size="sm">Character</Badge>
              )}
              {enhancementName && (
                <Badge variant="info" size="sm">{enhancementName}</Badge>
              )}
              {hasAttachedLeader && (
                <Badge variant="purple" size="sm">Led</Badge>
              )}
              {isDestroyed && (
                <Badge variant="error" size="sm">Destroyed</Badge>
              )}
            </div>
          </div>

          {/* Models Alive */}
          <div className="text-right shrink-0">
            <div className="text-lg font-bold text-gray-200">
              {combinedModelsAlive}
              <span className="text-gray-500 text-sm font-normal">
                /{combinedTotalModels}
              </span>
            </div>
            <div className="text-xs text-gray-500">models</div>
          </div>
        </div>

        {/* Wound Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Wounds</span>
            <span className="text-gray-300">
              {combinedCurrentWounds}/{combinedMaxWounds}
            </span>
          </div>
          <SimpleWoundBar
            current={combinedCurrentWounds}
            max={combinedMaxWounds}
          />
        </div>

        {/* Separate display for attached leader wounds when damaged */}
        {hasAttachedLeader && isDamaged && (
          <div className="pt-1 border-t border-gray-700/30 space-y-1">
            {/* Unit wounds */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">{unit.name}</span>
              <span className="text-gray-400">
                {currentWounds}/{maxWounds} W • {modelsAlive}/{totalModels} M
              </span>
            </div>
            {/* Leader wounds */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-purple-400">{attachedLeaderName}</span>
              <span className="text-gray-400">
                {leaderCurrentWounds}/{leaderMaxWounds} W • {leaderModelsAlive}/{leaderTotalModels} M
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
