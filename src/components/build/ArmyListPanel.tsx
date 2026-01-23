'use client';

import { Panel, PanelSection } from '@/components/ui';
import { ListControls } from './ListControls';
import { GameFormatSelector } from './GameFormatSelector';
import { PointsLimitSelector } from './PointsLimitSelector';
import { DetachmentSelector } from './DetachmentSelector';
import { ListUnitCard } from './ListUnitCard';
import type {
  ArmyData,
  CurrentList,
  ListUnit,
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

  // Check if a unit is a Character
  const isCharacter = (unit: Unit): boolean => {
    return unit.keywords.includes('Character');
  };

  // Get unit by ID
  const getUnitById = (unitId: string): Unit | undefined => {
    return armyData.units.find((u) => u.id === unitId);
  };

  return (
    <Panel
      title="Army List"
      headerRight={
        <ListControls
          onImport={onImport}
          onLoad={onLoad}
          onSave={onSave}
          isSaving={isSaving}
          canSave={canSave}
        />
      }
      className={className}
    >
      {/* List Configuration Section */}
      <PanelSection className="border-b border-gray-700/30">
        <div className="space-y-3">
          {/* Format Selector */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Game Format</label>
            <GameFormatSelector
              value={currentList.format}
              onChange={onFormatChange}
            />
          </div>

          {/* Points Limit */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Points Limit</label>
            <PointsLimitSelector
              value={currentList.pointsLimit}
              onChange={onPointsLimitChange}
            />
          </div>

          {/* Detachment Selector */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Detachment</label>
            <DetachmentSelector
              value={currentList.detachment}
              onChange={onDetachmentChange}
              detachments={armyData.detachments}
            />
          </div>
        </div>
      </PanelSection>

      {/* Units List Section */}
      <PanelSection title="Units">
        {currentList.units.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            <p>No units in your army list yet.</p>
            <p className="mt-1 text-xs">Select units from the roster to add them.</p>
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
      </PanelSection>
    </Panel>
  );
}
