'use client';

import { WoundIndicator } from '@/components/ui';

interface WoundPoolProps {
  label: string;
  currentWounds: number;
  maxWounds: number;
  woundsPerModel: number;
  modelsAlive: number;
  totalModels: number;
  variant?: 'default' | 'leader';
  onAdjust?: (delta: number) => void;
}

function WoundPool({
  label,
  currentWounds,
  maxWounds,
  woundsPerModel,
  modelsAlive,
  totalModels,
  variant = 'default',
  onAdjust,
}: WoundPoolProps) {
  return (
    <WoundIndicator
      label={label}
      currentWounds={currentWounds}
      maxWounds={maxWounds}
      woundsPerModel={woundsPerModel}
      modelsAlive={modelsAlive}
      totalModels={totalModels}
      variant={variant}
      onAdjust={onAdjust}
    />
  );
}

interface DamageTrackerProps {
  // Unit wounds
  unitName: string;
  unitCurrentWounds: number;
  unitMaxWounds: number;
  unitWoundsPerModel: number;
  unitModelsAlive: number;
  unitTotalModels: number;
  onUnitWoundAdjust?: (delta: number) => void;

  // Leader wounds (optional)
  hasLeader?: boolean;
  leaderName?: string;
  leaderCurrentWounds?: number;
  leaderMaxWounds?: number;
  leaderWoundsPerModel?: number;
  leaderModelsAlive?: number;
  leaderTotalModels?: number;
  onLeaderWoundAdjust?: (delta: number) => void;

  className?: string;
}

export function DamageTracker({
  unitName,
  unitCurrentWounds,
  unitMaxWounds,
  unitWoundsPerModel,
  unitModelsAlive,
  unitTotalModels,
  onUnitWoundAdjust,

  hasLeader = false,
  leaderName,
  leaderCurrentWounds = 0,
  leaderMaxWounds = 0,
  leaderWoundsPerModel = 0,
  leaderModelsAlive = 0,
  leaderTotalModels = 0,
  onLeaderWoundAdjust,

  className = '',
}: DamageTrackerProps) {
  // Calculate combined totals when leader is attached
  const totalModelsAlive = hasLeader
    ? unitModelsAlive + leaderModelsAlive
    : unitModelsAlive;
  const totalModels = hasLeader
    ? unitTotalModels + leaderTotalModels
    : unitTotalModels;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Combined Models Summary */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700/30">
        <span className="text-gray-400 text-sm">Total Models Alive</span>
        <span className="text-lg font-bold text-gray-200">
          {totalModelsAlive}{' '}
          <span className="text-gray-500 text-sm font-normal">/ {totalModels}</span>
        </span>
      </div>

      {/* Unit Wound Pool */}
      <WoundPool
        label={unitName}
        currentWounds={unitCurrentWounds}
        maxWounds={unitMaxWounds}
        woundsPerModel={unitWoundsPerModel}
        modelsAlive={unitModelsAlive}
        totalModels={unitTotalModels}
        variant="default"
        onAdjust={onUnitWoundAdjust}
      />

      {/* Leader Wound Pool (if attached) */}
      {hasLeader && leaderName && (
        <WoundPool
          label={leaderName}
          currentWounds={leaderCurrentWounds}
          maxWounds={leaderMaxWounds}
          woundsPerModel={leaderWoundsPerModel}
          modelsAlive={leaderModelsAlive}
          totalModels={leaderTotalModels}
          variant="leader"
          onAdjust={onLeaderWoundAdjust}
        />
      )}
    </div>
  );
}
