'use client';

import { Card, Badge, Stepper, Button } from '@/components/ui';
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
  const minModels = modelCounts[0] || 1;
  const maxModels = modelCounts[modelCounts.length - 1] || 1;

  // Get current points
  const currentPoints = unit.points[String(listUnit.modelCount)] || 0;

  // Get enhancement points
  const selectedEnhancement = enhancements.find(e => e.id === listUnit.enhancement);
  const enhancementPoints = selectedEnhancement?.points || 0;

  // Calculate weapon count validation
  const getWeaponCountTotal = (): number => {
    if (!listUnit.weaponCounts) return 0;
    return Object.values(listUnit.weaponCounts).reduce((sum, count) => sum + count, 0);
  };

  const getWeaponCountError = (): string | null => {
    // Only validate if unit has loadout options
    if (!unit.loadoutOptions || unit.loadoutOptions.length === 0) return null;

    const total = getWeaponCountTotal();
    if (total < listUnit.modelCount) {
      return `${listUnit.modelCount - total} model(s) need weapons`;
    }
    if (total > listUnit.modelCount) {
      return `${total - listUnit.modelCount} too many weapons assigned`;
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
        ${isAttachedAsLeader ? 'opacity-75 border-l-4 border-l-purple-400' : ''}
        ${className}
      `}
    >
      <div className="p-3 space-y-3">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-gray-200 truncate">
                {unit.name}
              </h4>
              {isCharacter && (
                <Badge variant="accent" size="sm">Character</Badge>
              )}
            </div>
            {isAttachedAsLeader && attachedToUnitName && (
              <Badge variant="purple" size="sm" className="mt-1">
                → {attachedToUnitName}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-accent-400 font-medium whitespace-nowrap">
              {currentPoints + enhancementPoints} pts
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              title="Remove unit"
              className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Model Count Selector */}
        {modelCounts.length > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Models</span>
            <Stepper
              value={listUnit.modelCount}
              min={minModels}
              max={maxModels}
              onChange={onModelCountChange}
              size="sm"
            />
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
    </Card>
  );
}
