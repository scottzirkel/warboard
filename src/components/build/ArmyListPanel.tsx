'use client';

import { Button } from '@/components/ui';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { ListUnitCard } from './ListUnitCard';
import type {
  ArmyData,
  CurrentList,
  Unit,
  GameFormat,
  AvailableLeader,
} from '@/types';

export interface AvailableArmy {
  id: string;
  name: string;
  disabled?: boolean;
}

interface ArmyListPanelProps {
  armyData: ArmyData;
  currentList: CurrentList;
  selectedUnitIndex: number | null;
  // Army selection
  armies: AvailableArmy[];
  selectedArmyId: string;
  onArmyChange: (armyId: string) => void;
  // Unit actions
  onSelectUnit: (index: number) => void;
  onRemoveUnit: (index: number) => void;
  onModelCountChange: (index: number, count: number) => void;
  onEnhancementChange: (index: number, enhancementId: string) => void;
  onWeaponCountChange: (index: number, choiceId: string, count: number) => void;
  onFormatChange: (format: GameFormat) => void;
  onPointsLimitChange: (limit: number) => void;
  onDetachmentChange: (detachment: string) => void;
  onImport: () => void;
  onExport: () => void;
  onLoad: () => void;
  onSave: () => void;
  onClear: () => void;
  isSaving?: boolean;
  isExporting?: boolean;
  canSave?: boolean;
  canExport?: boolean;
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
  armies,
  selectedArmyId,
  onArmyChange,
  onSelectUnit,
  onRemoveUnit,
  onModelCountChange,
  onEnhancementChange,
  onWeaponCountChange,
  onFormatChange,
  onPointsLimitChange,
  onDetachmentChange,
  onImport,
  onExport,
  onLoad,
  onSave,
  onClear,
  isSaving = false,
  isExporting = false,
  canSave = true,
  canExport = false,
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
  const detachmentNames = Object.entries(armyData.detachments).map(([id, d]) => ({
    id,
    name: d.name,
  }));

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

  // Get unit by ID
  const getUnitById = (unitId: string): Unit | undefined => {
    return armyData.units.find((u) => u.id === unitId);
  };

  // Game format configuration (matching Alpine.js)
  const gameFormats: Record<GameFormat, { name: string; pointsOptions: number[] }> = {
    standard: { name: 'Standard', pointsOptions: [500, 1000, 2000] },
    colosseum: { name: 'Colosseum', pointsOptions: [500] },
  };

  // Points limit options based on current format
  const pointsOptions = gameFormats[currentList.format]?.pointsOptions || [500, 1000, 2000];

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header with buttons */}
      <div className="flex items-start justify-between gap-3 mb-3 shrink-0">
        <h3 className="text-sm font-semibold text-white/55 uppercase tracking-wide">Army List</h3>
        <div className="flex items-center gap-2 shrink-0">
          <DropdownMenu
            align="right"
            trigger={
              <Button
                variant="secondary"
                size="sm"
                className="btn-ios btn-ios-sm btn-ios-tinted flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                Actions
              </Button>
            }
            items={[
              { label: 'Load List', onClick: onLoad },
              { label: 'Import', onClick: onImport },
              {
                label: isExporting ? 'Exporting...' : 'Export',
                onClick: onExport,
                disabled: !canExport || isExporting,
              },
              {
                label: 'Clear List',
                onClick: onClear,
                variant: 'danger',
                disabled: currentList.units.length === 0,
              },
            ]}
          />
          <Button
            variant="primary"
            size="sm"
            onClick={onSave}
            disabled={!canSave || isSaving}
            className="btn-ios btn-ios-sm btn-ios-primary"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Configuration Row */}
      <div className="space-y-3 mb-4 shrink-0">
        {/* Army selector */}
        <div>
          <label className="text-xs text-white/50 block mb-1">Army</label>
          <select
            value={selectedArmyId}
            onChange={(e) => onArmyChange(e.target.value)}
            className="select-dark w-full text-accent-400 font-semibold"
          >
            {armies.map((army) => (
              <option
                key={army.id}
                value={army.id}
                disabled={army.disabled}
                className="bg-gray-900 text-white"
              >
                {army.name}{army.disabled ? ' (Coming Soon)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Format + Points row */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-white/50 block mb-1">Format</label>
            <select
              value={currentList.format}
              onChange={(e) => onFormatChange(e.target.value as GameFormat)}
              className="select-dark w-full"
            >
              <option value="standard">Standard</option>
              <option value="colosseum">Colosseum</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-white/50 block mb-1">Points</label>
            <select
              value={currentList.pointsLimit}
              onChange={(e) => onPointsLimitChange(Number(e.target.value))}
              className="select-dark w-full"
            >
              {pointsOptions.map((pts) => (
                <option key={pts} value={pts}>
                  {pts} pts
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Detachment selector */}
        <div>
          <label className="text-xs text-white/50 block mb-1">Detachment</label>
          <select
            value={currentList.detachment}
            onChange={(e) => onDetachmentChange(e.target.value)}
            className="select-dark w-full"
          >
            {detachmentNames.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

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
