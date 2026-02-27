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

  // Combined unit name
  const displayName = hasAttachedLeader
    ? `${unit.name} + ${attachedLeaderName}`
    : unit.name;

  // Format movement with inches
  const formatM = (val: number) => `${val}"`;

  return (
    <div
      onClick={onSelect}
      className={`
        card-depth overflow-hidden cursor-pointer
        ${isSelected ? 'ring-2 ring-accent-500' : 'ring-1 ring-inset ring-accent-500/25'}
        ${isDestroyed ? 'opacity-40' : 'hover:bg-white/10'}
        transition-colors
        ${className}
      `}
    >
      <div className="px-3 pt-2 pb-1.5">
        {/* Unit Name Row */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className={`text-sm font-semibold truncate flex-1 ${isDestroyed ? 'line-through text-white/50' : ''}`}>
            {displayName}
          </span>
          {(isWarlord || isLeaderWarlord) && (
            <span title={isLeaderWarlord ? "Attached leader is Warlord" : "Warlord"}>
              <svg className="w-4 h-4 text-yellow-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
              </svg>
            </span>
          )}
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

        {/* Mini Stat Row */}
        <div className="grid grid-cols-6 gap-1 mb-1.5">
          {([
            { label: 'M', value: formatM(unit.stats.m) },
            { label: 'T', value: unit.stats.t },
            { label: 'SV', value: unit.stats.sv },
            { label: 'W', value: unit.stats.w },
            { label: 'LD', value: unit.stats.ld },
            { label: 'OC', value: unit.stats.oc },
          ] as const).map(({ label, value }) => (
            <div key={label} className="relative flex flex-col items-center rounded bg-black/20 py-0.5">
              <span className="text-[8px] font-medium text-white/40 uppercase leading-none">{label}</span>
              <span className="text-xs font-semibold text-white leading-tight">{value}</span>
              {label === 'SV' && unit.invuln && (
                <span className="absolute -bottom-0.5 -right-0.5 text-[7px] px-0.5 rounded bg-accent-500/30 text-accent-300 leading-tight">
                  {unit.invuln}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Info Row: Models + Enhancement | Wounds */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {isDestroyed ? (
              <span className="text-[11px] font-bold text-red-400 uppercase">Destroyed</span>
            ) : (
              <span className={`text-[11px] ${isDamaged ? 'text-red-400' : 'text-white/50'}`}>
                {combinedModelsAlive}/{combinedTotalModels} models
              </span>
            )}
            {enhancementName && (
              <Badge variant="accent" size="sm">{enhancementName}</Badge>
            )}
          </div>
          <span className="text-[11px] text-white/40">
            {combinedCurrentWounds}/{combinedMaxWounds} W
          </span>
        </div>
      </div>

      {/* Health Bar */}
      <div className="h-1 bg-gray-700/50">
        <div
          className={`h-full transition-all duration-300 ${getHealthBarColor()}`}
          style={{ width: `${healthPercent}%` }}
        />
      </div>
    </div>
  );
}
