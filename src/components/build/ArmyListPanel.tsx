'use client';

import { ListUnitCard } from './ListUnitCard';
import type {
  ArmyData,
  CurrentList,
  Unit,
  AvailableLeader,
} from '@/types';

interface ArmyListPanelProps {
  armyData: ArmyData;
  currentList: CurrentList;
  selectedUnitIndex: number | null;
  // Unit actions
  onSelectUnit: (index: number) => void;
  onRemoveUnit: (index: number) => void;
  onModelCountChange: (index: number, count: number) => void;
  onEnhancementChange: (index: number, enhancementId: string) => void;
  onWeaponCountChange: (index: number, choiceId: string, count: number) => void;
  getAvailableLeaders: (unitIndex: number) => AvailableLeader[];
  isUnitAttachedAsLeader: (unitIndex: number) => boolean;
  getAttachedToUnitName: (unitIndex: number) => string | undefined;
  canHaveLeaderAttached: (unitIndex: number) => boolean;
  getAttachedLeaderName: (unitIndex: number) => string | undefined;
  onAttachLeader: (unitIndex: number, leaderIndex: number) => void;
  onDetachLeader: (unitIndex: number) => void;
  onSetWarlord: (unitIndex: number) => void;
  className?: string;
}

export function ArmyListPanel({
  armyData,
  currentList,
  selectedUnitIndex,
  onSelectUnit,
  onRemoveUnit,
  onModelCountChange,
  onEnhancementChange,
  onWeaponCountChange,
  getAvailableLeaders,
  isUnitAttachedAsLeader,
  getAttachedToUnitName,
  canHaveLeaderAttached,
  getAttachedLeaderName,
  onAttachLeader,
  onDetachLeader,
  onSetWarlord,
  className = '',
}: ArmyListPanelProps) {
  const detachment = armyData.detachments[currentList.detachment];
  const enhancements = detachment?.enhancements || [];

  // Check if a unit is a Character
  const isCharacter = (unit: Unit): boolean => {
    return unit.keywords.includes('Character');
  };

  // Check if a unit is an Epic Hero (cannot take enhancements)
  const isEpicHero = (unit: Unit): boolean => {
    return unit.keywords.includes('Epic Hero');
  };

  // Get enhancements eligible for a specific unit
  const getEligibleEnhancements = (unit: Unit) => {
    // Epic Heroes cannot take enhancements
    if (isEpicHero(unit)) {
      return [];
    }

    return enhancements.filter((enhancement) => {
      // If no eligibleKeywords specified, enhancement is available to any Character
      if (!enhancement.eligibleKeywords || enhancement.eligibleKeywords.length === 0) {
        return true;
      }

      // Unit must have at least one of the eligible keywords
      return enhancement.eligibleKeywords.some((keyword) =>
        unit.keywords.includes(keyword)
      );
    });
  };

  // Get unit by ID (checks both regular units and allies)
  const getUnitById = (unitId: string): Unit | undefined => {
    // Check regular units first
    const regularUnit = armyData.units.find((u) => u.id === unitId);
    if (regularUnit) return regularUnit;

    // Check allies
    if (armyData.allies) {
      for (const faction of Object.values(armyData.allies)) {
        const allyUnit = faction.units?.find((u) => u.id === unitId);
        if (allyUnit) return allyUnit;
      }
    }

    return undefined;
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Units section header */}
      <div className="section-header-inline mb-2 shrink-0">
        <span>Units</span>
        <span className="badge badge-accent">{currentList.units.length}</span>
      </div>

      {/* Units List */}
      <div className="flex-1 overflow-y-auto -mx-4 px-4 scroll-smooth">
        {currentList.units.length === 0 ? (
          <div className="text-center py-8 text-white/40 text-sm">
            <p className="text-lg mb-1">No units added yet</p>
            <p className="text-sm">Select a unit from the roster to add it</p>
          </div>
        ) : (
          <div className="space-y-2">
            {currentList.units.map((listUnit, index) => {
              const unit = getUnitById(listUnit.unitId);

              if (!unit) {
                return null;
              }

              return (
                <ListUnitCard
                  key={`${listUnit.unitId}-${index}`}
                  unit={unit}
                  listUnit={listUnit}
                  index={index}
                  isSelected={selectedUnitIndex === index}
                  onSelect={() => onSelectUnit(index)}
                  onRemove={() => onRemoveUnit(index)}
                  onModelCountChange={(count) => onModelCountChange(index, count)}
                  onEnhancementChange={(enhancementId) =>
                    onEnhancementChange(index, enhancementId)
                  }
                  onWeaponCountChange={(choiceId, count) =>
                    onWeaponCountChange(index, choiceId, count)
                  }
                  enhancements={getEligibleEnhancements(unit)}
                  isCharacter={isCharacter(unit)}
                  isAttachedAsLeader={isUnitAttachedAsLeader(index)}
                  attachedToUnitName={getAttachedToUnitName(index)}
                  availableLeaders={getAvailableLeaders(index)}
                  attachedLeaderName={getAttachedLeaderName(index)}
                  canHaveLeaderAttached={canHaveLeaderAttached(index)}
                  onAttachLeader={(leaderIndex) => onAttachLeader(index, leaderIndex)}
                  onDetachLeader={() => onDetachLeader(index)}
                  onToggleWarlord={() => onSetWarlord(index)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
