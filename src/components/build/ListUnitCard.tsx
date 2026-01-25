'use client';

import { Card, Badge } from '@/components/ui';
import { EnhancementSelector } from './EnhancementSelector';
import { WeaponLoadoutSelector } from './WeaponLoadoutSelector';
import type { Unit, ListUnit, Enhancement, AvailableLeader } from '@/types';

interface ListUnitCardProps {
  unit: Unit;
  listUnit: ListUnit;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onModelCountChange: (count: number) => void;
  onEnhancementChange: (enhancementId: string) => void;
  onWeaponCountChange: (choiceId: string, count: number) => void;
  enhancements: Enhancement[];
  isCharacter: boolean;
  isAttachedAsLeader: boolean;
  attachedToUnitName?: string;
  availableLeaders: AvailableLeader[];
  attachedLeaderName?: string;
  canHaveLeaderAttached: boolean;
  onAttachLeader: (leaderIndex: number) => void;
  onDetachLeader: () => void;
  className?: string;
}

export function ListUnitCard({
  unit,
  listUnit,
  index: _index,
  isSelected,
  onSelect,
  onRemove,
  onModelCountChange,
  onEnhancementChange,
  onWeaponCountChange,
  enhancements,
  isCharacter,
  isAttachedAsLeader,
  attachedToUnitName,
  availableLeaders,
  attachedLeaderName,
  canHaveLeaderAttached,
  onAttachLeader,
  onDetachLeader,
  className = '',
}: ListUnitCardProps) {
  // Get available model counts from unit.points
  const modelCounts = Object.keys(unit.points).map(Number).sort((a, b) => a - b);

  // Get current points
  const currentPoints = unit.points[String(listUnit.modelCount)] || 0;

  // Get enhancement points
  const selectedEnhancement = enhancements.find(e => e.id === listUnit.enhancement);
  const enhancementPoints = selectedEnhancement?.points || 0;

  // Get unit type from keywords (Infantry, Monster, Vehicle, etc.)
  const getUnitType = (): string | null => {
    const typeKeywords = ['Infantry', 'Monster', 'Vehicle', 'Mounted', 'Beast', 'Swarm', 'Battleline'];
    return unit.keywords?.find(k => typeKeywords.includes(k)) || null;
  };

  const unitType = getUnitType();

  // Calculate weapon count validation - only for "replacement" type options
  const getWeaponCountError = (): string | null => {
    // Only validate if unit has loadout options
    if (!unit.loadoutOptions || unit.loadoutOptions.length === 0) return null;

    const weaponCounts = listUnit.weaponCounts || {};

    // Only validate "replacement" type options (where total must equal modelCount)
    // "addition" type options are optional and don't need to equal modelCount
    for (const option of unit.loadoutOptions) {
      if (option.pattern !== 'replacement') continue;

      // Sum counts for choices in this replacement option
      const optionTotal = option.choices
        .filter(c => c.id !== 'none')
        .reduce((sum, choice) => sum + (weaponCounts[choice.id] || 0), 0);

      if (optionTotal < listUnit.modelCount) {
        return `${listUnit.modelCount - optionTotal} model(s) need weapons`;
      }
      if (optionTotal > listUnit.modelCount) {
        return `${optionTotal - listUnit.modelCount} too many weapons assigned`;
      }
    }

    return null;
  };

  const weaponCountError = getWeaponCountError();

  return (
    <Card
      selected={isSelected}
      hoverable
      onClick={onSelect}
      className={`
        ${isAttachedAsLeader ? 'opacity-60' : ''}
        ${className}
      `}
    >
      <div className="space-y-2">
        {/* Header Row: Name + Remove Button */}
        <div className="flex items-start justify-between gap-2 px-3 pt-3">
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-medium text-gray-200 truncate">
              {unit.name}
            </h4>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            title="Remove unit"
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Card Body */}
        <div className="px-3 pb-3 space-y-2">
          {/* Badges + Points Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {unitType && (
                <Badge variant="default" size="sm">{unitType}</Badge>
              )}
              {isCharacter && (
                <Badge variant="accent" size="sm">Character</Badge>
              )}
              {isAttachedAsLeader && attachedToUnitName && (
                <Badge variant="purple" size="sm">
                  → {attachedToUnitName}
                </Badge>
              )}
            </div>
            <span className="text-sm text-accent-400 font-semibold tabular-nums">
              {currentPoints + enhancementPoints} pts
            </span>
          </div>

          {/* Model Count Selector (dropdown matching Alpine.js) */}
          {modelCounts.length > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Models</span>
              <select
                value={listUnit.modelCount}
                onChange={(e) => {
                  e.stopPropagation();
                  onModelCountChange(Number(e.target.value));
                }}
                onClick={(e) => e.stopPropagation()}
                className="select-dark py-1.5 px-3 text-sm"
              >
                {modelCounts.map((count) => (
                  <option key={count} value={count}>
                    {count} models
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Enhancement Selector (Characters only) */}
          {isCharacter && enhancements.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs text-gray-400">Enhancement</span>
              <EnhancementSelector
                value={listUnit.enhancement}
                onChange={onEnhancementChange}
                enhancements={enhancements}
              />
            </div>
          )}

          {/* Leader Attachment (non-Characters that can have leaders) */}
          {canHaveLeaderAttached && (
            <div className="space-y-1">
              <span className="text-xs text-gray-400">Attached Leader</span>
              <select
                value={listUnit.attachedLeader?.unitIndex.toString() ?? ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    onDetachLeader();
                  } else {
                    onAttachLeader(parseInt(value, 10));
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="select-dark w-full py-1.5 text-sm"
              >
                <option value="">None</option>
                {/* Show currently attached leader even if not in available list */}
                {attachedLeaderName && listUnit.attachedLeader && (
                  <option value={listUnit.attachedLeader.unitIndex}>
                    {attachedLeaderName}
                  </option>
                )}
                {availableLeaders
                  .filter(leader =>
                    // Don't show the already attached leader twice
                    !listUnit.attachedLeader ||
                    leader.unitIndex !== listUnit.attachedLeader.unitIndex
                  )
                  .map((leader) => (
                    <option key={leader.unitIndex} value={leader.unitIndex}>
                      {leader.name}
                      {leader.enhancement && ` (${leader.enhancement})`}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Weapon Loadout Options */}
          {unit.loadoutOptions && unit.loadoutOptions.length > 0 && (
            <div className="space-y-2 pt-1 border-t border-gray-700/50">
              {unit.loadoutOptions.map((option) => (
                <WeaponLoadoutSelector
                  key={option.id}
                  option={option}
                  modelCount={listUnit.modelCount}
                  weaponCounts={listUnit.weaponCounts || {}}
                  onCountChange={(choiceId, count) => {
                    onWeaponCountChange(choiceId, count);
                  }}
                />
              ))}
              {/* Weapon Count Validation Error */}
              {weaponCountError && (
                <div className="text-xs text-red-400">{weaponCountError}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
