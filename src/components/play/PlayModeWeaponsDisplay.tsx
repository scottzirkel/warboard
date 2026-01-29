'use client';

import { LoadoutGroupAccordion, WeaponStatsTable } from '@/components/ui';
import type { Weapon, LoadoutGroup, Stratagem, MissionTwist, KeywordDefinition, Enhancement, ArmyRuleStance } from '@/types';
import type { ActiveRuleChoice } from '@/hooks/useWeaponModifiers';

interface LoadoutGroupCardProps {
  group: LoadoutGroup;
  isCollapsed: boolean;
  isActivated: boolean;
  onToggleCollapse: () => void;
  onToggleActivated?: () => void;
  activeStratagems?: Stratagem[];
  activeTwists?: MissionTwist[];
  weaponKeywordGlossary?: KeywordDefinition[];
  enhancement?: Enhancement | null;
  activeStance?: ArmyRuleStance | null;
  activeRuleChoices?: ActiveRuleChoice[];
  casualties?: number;
  onIncrementCasualties?: () => void;
  onDecrementCasualties?: () => void;
}

export function LoadoutGroupCard({
  group,
  isCollapsed,
  isActivated,
  onToggleCollapse,
  onToggleActivated,
  activeStratagems = [],
  activeTwists = [],
  weaponKeywordGlossary = [],
  enhancement = null,
  activeStance = null,
  activeRuleChoices = [],
  casualties = 0,
  onIncrementCasualties,
  onDecrementCasualties,
}: LoadoutGroupCardProps) {
  return (
    <LoadoutGroupAccordion
      id={group.id}
      name={group.name}
      modelCount={group.modelCount}
      casualties={casualties}
      onIncrementCasualties={onIncrementCasualties}
      onDecrementCasualties={onDecrementCasualties}
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
            <WeaponStatsTable
              weapons={group.rangedWeapons}
              activeStratagems={activeStratagems}
              activeTwists={activeTwists}
              weaponKeywordGlossary={weaponKeywordGlossary}
              enhancement={enhancement}
              activeStance={activeStance}
              activeRuleChoices={activeRuleChoices}
            />
          </div>
        )}

        {/* Melee Weapons Section */}
        {group.meleeWeapons.length > 0 && (
          <div className="border-l-2 border-red-500/30 pl-3">
            <div className="text-xs text-red-400 uppercase tracking-wider mb-2 font-medium">
              Melee
            </div>
            <WeaponStatsTable
              weapons={group.meleeWeapons}
              activeStratagems={activeStratagems}
              activeTwists={activeTwists}
              weaponKeywordGlossary={weaponKeywordGlossary}
              enhancement={enhancement}
              activeStance={activeStance}
              activeRuleChoices={activeRuleChoices}
            />
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
  activeTwists?: MissionTwist[];
  weaponKeywordGlossary?: KeywordDefinition[];
  enhancement?: Enhancement | null;
  activeStance?: ArmyRuleStance | null;
  activeRuleChoices?: ActiveRuleChoice[];
  leaderEnhancement?: Enhancement | null;
  /** Whether the attached leader is the warlord (for applying warlord-only twists) */
  isLeaderWarlord?: boolean;
  loadoutCasualties?: Record<string, number>;
  onIncrementCasualties?: (groupId: string) => void;
  onDecrementCasualties?: (groupId: string) => void;
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
  loadoutCasualties = {},
  onIncrementCasualties,
  onDecrementCasualties,
  activeStratagems = [],
  activeTwists = [],
  weaponKeywordGlossary = [],
  enhancement = null,
  activeStance = null,
  activeRuleChoices = [],
  leaderEnhancement = null,
  isLeaderWarlord = false,
  className = '',
}: PlayModeWeaponsDisplayProps) {
  const hasLeaderWeapons = leaderWeapons && leaderWeapons.length > 0;
  const leaderRanged = leaderWeapons?.filter((w) => w.type === 'ranged') || [];
  const leaderMelee = leaderWeapons?.filter((w) => w.type === 'melee') || [];

  // Filter out warlord-only twists for unit weapons (they only apply to the warlord model)
  const unitTwists = activeTwists.filter(t => !t.appliesToWarlord);
  // Leader gets all twists (including warlord-only if they are the warlord)
  const leaderTwists = isLeaderWarlord ? activeTwists : activeTwists.filter(t => !t.appliesToWarlord);

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
          activeTwists={unitTwists}
          weaponKeywordGlossary={weaponKeywordGlossary}
          enhancement={enhancement}
          activeStance={activeStance}
          activeRuleChoices={activeRuleChoices}
          casualties={loadoutCasualties[group.id] || 0}
          onIncrementCasualties={
            onIncrementCasualties
              ? () => onIncrementCasualties(group.id)
              : undefined
          }
          onDecrementCasualties={
            onDecrementCasualties
              ? () => onDecrementCasualties(group.id)
              : undefined
          }
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
                  <WeaponStatsTable
                    weapons={leaderRanged}
                    activeStratagems={activeStratagems}
                    activeTwists={leaderTwists}
                    weaponKeywordGlossary={weaponKeywordGlossary}
                    enhancement={leaderEnhancement}
                    activeStance={activeStance}
                    activeRuleChoices={activeRuleChoices}
                  />
                </div>
              )}

              {/* Leader Melee Weapons */}
              {leaderMelee.length > 0 && (
                <div className="border-l-2 border-red-500/30 pl-3">
                  <div className="text-xs text-red-400 uppercase tracking-wider mb-2 font-medium">
                    Melee
                  </div>
                  <WeaponStatsTable
                    weapons={leaderMelee}
                    activeStratagems={activeStratagems}
                    activeTwists={leaderTwists}
                    weaponKeywordGlossary={weaponKeywordGlossary}
                    enhancement={leaderEnhancement}
                    activeStance={activeStance}
                    activeRuleChoices={activeRuleChoices}
                  />
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
