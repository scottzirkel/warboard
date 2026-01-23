'use client';

import { LoadoutGroupAccordion, WeaponStatsTable } from '@/components/ui';
import type { Weapon, LoadoutGroup, Stratagem } from '@/types';

interface LoadoutGroupCardProps {
  group: LoadoutGroup;
  isCollapsed: boolean;
  isActivated: boolean;
  onToggleCollapse: () => void;
  onToggleActivated?: () => void;
  activeStratagems?: Stratagem[];
}

export function LoadoutGroupCard({
  group,
  isCollapsed,
  isActivated,
  onToggleCollapse,
  onToggleActivated,
  activeStratagems = [],
}: LoadoutGroupCardProps) {
  return (
    <LoadoutGroupAccordion
      id={group.id}
      name={group.name}
      modelCount={group.modelCount}
      isPaired={group.isPaired}
      isCollapsed={isCollapsed}
      isActivated={isActivated}
      onToggleCollapse={onToggleCollapse}
      onToggleActivated={onToggleActivated}
    >
      <div className="space-y-3">
        {/* Ranged Weapons Section */}
        {group.rangedWeapons.length > 0 && (
          <div className="border-l-2 border-blue-500/30 pl-3">
            <div className="text-xs text-blue-400 uppercase tracking-wider mb-2 font-medium">
              Ranged
            </div>
            <WeaponStatsTable weapons={group.rangedWeapons} activeStratagems={activeStratagems} />
          </div>
        )}

        {/* Melee Weapons Section */}
        {group.meleeWeapons.length > 0 && (
          <div className="border-l-2 border-red-500/30 pl-3">
            <div className="text-xs text-red-400 uppercase tracking-wider mb-2 font-medium">
              Melee
            </div>
            <WeaponStatsTable weapons={group.meleeWeapons} activeStratagems={activeStratagems} />
          </div>
        )}
      </div>
    </LoadoutGroupAccordion>
  );
}

interface PlayModeWeaponsDisplayProps {
  loadoutGroups: LoadoutGroup[];
  unitIndex: number;
  collapsedGroups: Record<string, boolean>;
  activatedGroups: Record<string, boolean>;
  onToggleCollapse: (unitIndex: number, groupId: string) => void;
  onToggleActivated?: (unitIndex: number, groupId: string) => void;
  leaderWeapons?: Weapon[];
  leaderName?: string;
  isLeaderCollapsed?: boolean;
  isLeaderActivated?: boolean;
  onToggleLeaderCollapse?: () => void;
  onToggleLeaderActivated?: () => void;
  activeStratagems?: Stratagem[];
  className?: string;
}

export function PlayModeWeaponsDisplay({
  loadoutGroups,
  unitIndex,
  collapsedGroups,
  activatedGroups,
  onToggleCollapse,
  onToggleActivated,
  leaderWeapons,
  leaderName,
  isLeaderCollapsed = false,
  isLeaderActivated = false,
  onToggleLeaderCollapse,
  onToggleLeaderActivated,
  activeStratagems = [],
  className = '',
}: PlayModeWeaponsDisplayProps) {
  const hasLeaderWeapons = leaderWeapons && leaderWeapons.length > 0;
  const leaderRanged = leaderWeapons?.filter((w) => w.type === 'ranged') || [];
  const leaderMelee = leaderWeapons?.filter((w) => w.type === 'melee') || [];

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Unit Loadout Groups */}
      {loadoutGroups.map((group) => (
        <LoadoutGroupCard
          key={group.id}
          group={group}
          isCollapsed={collapsedGroups[group.id] || false}
          isActivated={activatedGroups[group.id] || false}
          onToggleCollapse={() => onToggleCollapse(unitIndex, group.id)}
          onToggleActivated={
            onToggleActivated
              ? () => onToggleActivated(unitIndex, group.id)
              : undefined
          }
          activeStratagems={activeStratagems}
        />
      ))}

      {/* Leader Weapons Section (accordion matching Alpine.js) */}
      {hasLeaderWeapons && (
        <div
          className={`rounded overflow-hidden mt-3 transition-colors ${
            isLeaderActivated
              ? 'bg-green-900/40 ring-1 ring-green-600/50'
              : 'bg-purple-900/30 ring-1 ring-purple-600/50'
          }`}
        >
          {/* Leader Header (Clickable) */}
          <div
            className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer transition-colors ${
              isLeaderActivated ? 'hover:bg-green-800/40' : 'hover:bg-purple-800/40'
            }`}
            onClick={onToggleLeaderCollapse}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-3 w-3 transition-transform ${
                isLeaderCollapsed ? '-rotate-90' : ''
              } ${isLeaderActivated ? 'text-green-400' : 'text-purple-400'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <span
              className={`text-sm font-medium ${
                isLeaderActivated ? 'text-green-300' : 'text-purple-300'
              }`}
            >
              {leaderName}
            </span>
            {/* Activation Toggle Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleLeaderActivated?.();
              }}
              className={`ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                isLeaderActivated
                  ? 'bg-green-600 text-white'
                  : 'bg-purple-600 hover:bg-purple-500 text-white'
              }`}
              title={isLeaderActivated ? 'Mark as not activated' : 'Mark as activated'}
            >
              {isLeaderActivated ? '✓' : 'Act'}
            </button>
          </div>

          {/* Collapsible Content */}
          {!isLeaderCollapsed && (
            <div className="px-2 pb-2 space-y-3">
              {/* Leader Ranged Weapons */}
              {leaderRanged.length > 0 && (
                <div className="border-l-2 border-blue-500/30 pl-3">
                  <div className="text-xs text-blue-400 uppercase tracking-wider mb-2 font-medium">
                    Ranged
                  </div>
                  <WeaponStatsTable weapons={leaderRanged} activeStratagems={activeStratagems} />
                </div>
              )}

              {/* Leader Melee Weapons */}
              {leaderMelee.length > 0 && (
                <div className="border-l-2 border-red-500/30 pl-3">
                  <div className="text-xs text-red-400 uppercase tracking-wider mb-2 font-medium">
                    Melee
                  </div>
                  <WeaponStatsTable weapons={leaderMelee} activeStratagems={activeStratagems} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {loadoutGroups.length === 0 && !hasLeaderWeapons && (
        <div className="text-center text-gray-500 py-4 text-sm">
          No weapons equipped
        </div>
      )}
    </div>
  );
}
