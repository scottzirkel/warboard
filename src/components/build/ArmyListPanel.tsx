'use client';

import { Button } from '@/components/ui';
import { ListUnitCard } from './ListUnitCard';
import type {
  ArmyData,
  CurrentList,
  Unit,
  GameFormat,
  AvailableLeader,
} from '@/types';

interface ArmyListPanelProps {
  armyData: ArmyData;
  currentList: CurrentList;
  selectedUnitIndex: number | null;
  onSelectUnit: (index: number) => void;
  onRemoveUnit: (index: number) => void;
  onModelCountChange: (index: number, count: number) => void;
  onEnhancementChange: (index: number, enhancementId: string) => void;
  onWeaponCountChange: (index: number, choiceId: string, count: number) => void;
  onFormatChange: (format: GameFormat) => void;
  onPointsLimitChange: (limit: number) => void;
  onDetachmentChange: (detachment: string) => void;
  onImport: () => void;
  onLoad: () => void;
  onSave: () => void;
  isSaving?: boolean;
  canSave?: boolean;
  getAvailableLeaders: (unitIndex: number) => AvailableLeader[];
  isUnitAttachedAsLeader: (unitIndex: number) => boolean;
  getAttachedToUnitName: (unitIndex: number) => string | undefined;
  canHaveLeaderAttached: (unitIndex: number) => boolean;
  getAttachedLeaderName: (unitIndex: number) => string | undefined;
  onAttachLeader: (unitIndex: number, leaderIndex: number) => void;
  onDetachLeader: (unitIndex: number) => void;
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
  onFormatChange,
  onPointsLimitChange,
  onDetachmentChange,
  onImport,
  onLoad,
  onSave,
  isSaving = false,
  canSave = true,
  getAvailableLeaders,
  isUnitAttachedAsLeader,
  getAttachedToUnitName,
  canHaveLeaderAttached,
  getAttachedLeaderName,
  onAttachLeader,
  onDetachLeader,
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

  // Get unit by ID
  const getUnitById = (unitId: string): Unit | undefined => {
    return armyData.units.find((u) => u.id === unitId);
  };

  // Points limit options
  const pointsOptions = [500, 1000, 1500, 2000, 2500, 3000];

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header with buttons */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h3 className="section-header">Army List</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onImport}
            className="btn-ios btn-ios-sm btn-ios-tinted"
          >
            Import
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onLoad}
            className="btn-ios btn-ios-sm btn-ios-tinted"
          >
            Load
          </Button>
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
        {/* Format + Points row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/50 block mb-1">Format</label>
            <div className="segmented-control">
              <div
                onClick={() => onFormatChange('standard')}
                className={`segmented-control-item ${currentList.format === 'standard' ? 'active' : ''}`}
              >
                Standard
              </div>
              <div
                onClick={() => onFormatChange('colosseum')}
                className={`segmented-control-item ${currentList.format === 'colosseum' ? 'active' : ''}`}
              >
                Colosseum
              </div>
            </div>
          </div>
          <div>
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
            <p>No units added yet</p>
            <p className="text-xs mt-1">Select units from the roster →</p>
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
                  enhancements={enhancements}
                  isCharacter={isCharacter(unit)}
                  isAttachedAsLeader={isUnitAttachedAsLeader(index)}
                  attachedToUnitName={getAttachedToUnitName(index)}
                  availableLeaders={getAvailableLeaders(index)}
                  attachedLeaderName={getAttachedLeaderName(index)}
                  canHaveLeaderAttached={canHaveLeaderAttached(index)}
                  onAttachLeader={(leaderIndex) => onAttachLeader(index, leaderIndex)}
                  onDetachLeader={() => onDetachLeader(index)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
