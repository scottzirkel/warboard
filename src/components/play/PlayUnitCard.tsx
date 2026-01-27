'use client';

import { Badge } from '@/components/ui';
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
  // Warlord indicator
  isWarlord?: boolean;
  isLeaderWarlord?: boolean;
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
  isWarlord = false,
  isLeaderWarlord = false,
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

  // Health percentage for the bar
  const healthPercent = combinedMaxWounds > 0
    ? Math.max(0, Math.min(100, (combinedCurrentWounds / combinedMaxWounds) * 100))
    : 100;

  // Health bar color based on percentage
  const getHealthBarColor = () => {
    if (isDestroyed) return 'bg-gray-600';
    if (healthPercent <= 25) return 'bg-red-500';
    if (healthPercent <= 50) return 'bg-orange-500';
    if (healthPercent <= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Combined unit name (matches Alpine's getCombinedUnitName)
  const displayName = hasAttachedLeader
    ? `${unit.name} + ${attachedLeaderName}`
    : unit.name;

  return (
    <div
      onClick={onSelect}
      className={`
        card-depth overflow-hidden cursor-pointer
        ${isSelected ? 'ring-2 ring-accent-500' : ''}
        ${isDestroyed ? 'opacity-40' : 'hover:bg-white/10'}
        transition-colors
        ${className}
      `}
    >
      <div className="list-row">
        <div className="flex-1 min-w-0">
          {/* Combined Unit Name */}
          <div className={`font-semibold truncate ${isDestroyed ? 'line-through text-white/50' : ''}`}>
            {displayName}
          </div>

          {/* Models and Enhancement */}
          <div className="flex items-center gap-2 mt-1">
            {isDestroyed ? (
              <span className="text-xs font-bold text-red-400 uppercase">Out</span>
            ) : (
              <span
                className={`text-xs ${isDamaged ? 'text-red-400' : 'text-white/50'}`}
              >
                {combinedModelsAlive}/{combinedTotalModels} models
              </span>
            )}
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

        {/* Right Side: Warlord indicator and Wounds */}
        <div className="text-right shrink-0">
          {(isWarlord || isLeaderWarlord) && (
            <div className="text-yellow-400 flex items-center justify-end gap-1" title={isLeaderWarlord ? "Attached leader is Warlord" : "Warlord"}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
              </svg>
            </div>
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

      {/* Health Bar - spans full width at bottom */}
      <div className="h-1 bg-gray-700/50">
        <div
          className={`h-full transition-all duration-300 ${getHealthBarColor()}`}
          style={{ width: `${healthPercent}%` }}
        />
      </div>
    </div>
  );
}
