'use client';

import { Badge, LoadoutGroupAccordion, WeaponStatsTable } from '@/components/ui';
import type { Weapon, LoadoutGroup } from '@/types';

interface LoadoutGroupCardProps {
  group: LoadoutGroup;
  isCollapsed: boolean;
  isActivated: boolean;
  onToggleCollapse: () => void;
  onToggleActivated?: () => void;
}

export function LoadoutGroupCard({
  group,
  isCollapsed,
  isActivated,
  onToggleCollapse,
  onToggleActivated,
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
            <WeaponStatsTable weapons={group.rangedWeapons} />
          </div>
        )}

        {/* Melee Weapons Section */}
        {group.meleeWeapons.length > 0 && (
          <div className="border-l-2 border-red-500/30 pl-3">
            <div className="text-xs text-red-400 uppercase tracking-wider mb-2 font-medium">
              Melee
            </div>
            <WeaponStatsTable weapons={group.meleeWeapons} />
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
        />
      ))}

      {/* Leader Weapons Section */}
      {hasLeaderWeapons && (
        <div className="border-2 border-purple-500/30 rounded-lg bg-purple-900/10 p-3">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="purple" size="sm">
              Leader
            </Badge>
            <span className="text-sm font-medium text-purple-300">
              {leaderName}
            </span>
          </div>

          <div className="space-y-3">
            {/* Leader Ranged Weapons */}
            {leaderRanged.length > 0 && (
              <div className="border-l-2 border-blue-500/30 pl-3">
                <div className="text-xs text-blue-400 uppercase tracking-wider mb-2 font-medium">
                  Ranged
                </div>
                <WeaponStatsTable weapons={leaderRanged} />
              </div>
            )}

            {/* Leader Melee Weapons */}
            {leaderMelee.length > 0 && (
              <div className="border-l-2 border-red-500/30 pl-3">
                <div className="text-xs text-red-400 uppercase tracking-wider mb-2 font-medium">
                  Melee
                </div>
                <WeaponStatsTable weapons={leaderMelee} />
              </div>
            )}
          </div>
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
