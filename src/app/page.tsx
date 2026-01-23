'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useArmyStore, availableArmies } from '@/stores/armyStore';
import { useGameStore } from '@/stores/gameStore';
import { useUIStore } from '@/stores/uiStore';
import { Navigation } from '@/components/navigation';
import { BuildMode } from '@/components/build/BuildMode';
import { ArmyListPanel } from '@/components/build/ArmyListPanel';
import { UnitRosterPanel } from '@/components/build/UnitRosterPanel';
import { UnitDetailsPanel } from '@/components/build/UnitDetailsPanel';
import { PlayMode } from '@/components/play/PlayMode';
import { ArmyOverviewPanel } from '@/components/play/ArmyOverviewPanel';
import { GameStatePanel } from '@/components/play/GameStatePanel';
import { SelectedUnitDetailsPanel } from '@/components/play/SelectedUnitDetailsPanel';
import {
  ToastContainer,
  ImportModal,
  LoadModal,
  ConfirmModal,
} from '@/components/ui';
import {
  useLeaderAttachment,
  useStatModifiers,
  useListValidation,
  useWoundTracking,
  useSavedLists,
} from '@/hooks';
import type { CurrentList, Unit, GameFormat, LoadoutGroup, Weapon, ModifierSource, ModifierOperation } from '@/types';

// ============================================================================
// Main App Component
// ============================================================================

export default function Home() {
  // -------------------------------------------------------------------------
  // Local State
  // -------------------------------------------------------------------------
  const [showReferencePanel, setShowReferencePanel] = useState(false);
  const [previewedUnit, setPreviewedUnit] = useState<Unit | null>(null);

  // -------------------------------------------------------------------------
  // Store State
  // -------------------------------------------------------------------------
  const {
    armyData,
    currentList,
    isLoading: isArmyLoading,
    loadArmyData,
    setListName,
    setPointsLimit,
    setFormat,
    setDetachment,
    addUnit,
    removeUnit,
    updateUnitModelCount,
    setUnitEnhancement,
    setWeaponCount,
    attachLeader,
    detachLeader,
    setUnitWounds,
    setLeaderWounds,
    resetList,
    loadList,
    getTotalPoints,
  } = useArmyStore();

  const {
    gameState,
    setBattleRound,
    setCommandPoints,
    setKatah,
    toggleStratagem,
    isLoadoutGroupCollapsed,
    toggleLoadoutGroupCollapsed,
    isLoadoutGroupActivated,
    toggleLoadoutGroupActivated,
    isLeaderCollapsed,
    toggleLeaderCollapsed,
    isLeaderActivated,
    toggleLeaderActivated,
    resetGameState,
  } = useGameStore();

  const {
    mode,
    selectedUnitIndex,
    activeModal,
    confirmModalConfig,
    toasts,
    setMode,
    selectUnit,
    openModal,
    closeModal,
    showSuccess,
    showError,
    dismissToast,
  } = useUIStore();

  // -------------------------------------------------------------------------
  // Saved Lists Hook
  // -------------------------------------------------------------------------
  const {
    lists: savedLists,
    isLoading: isListsLoading,
    fetchLists,
    loadList: fetchSavedList,
    saveList: saveSavedList,
    deleteList: deleteSavedList,
  } = useSavedLists();

  // -------------------------------------------------------------------------
  // Leader Attachment Hook
  // -------------------------------------------------------------------------
  const leaderAttachment = useLeaderAttachment(
    armyData,
    currentList.units,
    (unitIndex: number, leaderIndex: number) => {
      attachLeader(unitIndex, leaderIndex);
      const leaderListUnit = currentList.units[leaderIndex];
      const targetListUnit = currentList.units[unitIndex];
      const leaderUnit = armyData?.units.find(u => u.id === leaderListUnit?.unitId);
      const targetUnit = armyData?.units.find(u => u.id === targetListUnit?.unitId);
      if (leaderUnit && targetUnit) {
        showSuccess(`${leaderUnit.name} attached to ${targetUnit.name}`);
      }
    },
    (unitIndex: number) => {
      const listUnit = currentList.units[unitIndex];
      const leaderIndex = listUnit?.attachedLeader?.unitIndex;
      const leaderListUnit = leaderIndex !== undefined ? currentList.units[leaderIndex] : undefined;
      const leaderUnit = leaderListUnit ? armyData?.units.find(u => u.id === leaderListUnit.unitId) : undefined;
      detachLeader(unitIndex);
      if (leaderUnit) {
        showSuccess(`${leaderUnit.name} detached`);
      }
    }
  );

  // -------------------------------------------------------------------------
  // List Validation Hook
  // -------------------------------------------------------------------------
  const listValidation = useListValidation(
    armyData,
    currentList
  );

  // -------------------------------------------------------------------------
  // Selected Unit Data
  // -------------------------------------------------------------------------
  const selectedUnit = useMemo(() => {
    if (selectedUnitIndex === null || !armyData) return undefined;
    const listUnit = currentList.units[selectedUnitIndex];
    if (!listUnit) return undefined;
    return armyData.units.find((u) => u.id === listUnit.unitId);
  }, [selectedUnitIndex, armyData, currentList.units]);

  const selectedListUnit = useMemo(() => {
    if (selectedUnitIndex === null) return undefined;
    return currentList.units[selectedUnitIndex];
  }, [selectedUnitIndex, currentList.units]);

  // -------------------------------------------------------------------------
  // Stat Modifiers Hook (for selected unit)
  // -------------------------------------------------------------------------
  const statModifiers = useStatModifiers(
    armyData,
    selectedUnit,
    selectedListUnit,
    selectedUnitIndex ?? -1,
    currentList.units,
    currentList.detachment
  );

  // -------------------------------------------------------------------------
  // Wound Tracking Hook (for selected unit)
  // -------------------------------------------------------------------------
  const woundTracking = useWoundTracking(
    armyData,
    selectedUnit,
    selectedListUnit,
    selectedUnitIndex ?? -1,
    currentList.units,
    currentList.detachment,
    (wounds) => {
      if (selectedUnitIndex !== null) {
        setUnitWounds(selectedUnitIndex, wounds);
      }
    },
    (wounds) => {
      if (selectedUnitIndex !== null) {
        setLeaderWounds(selectedUnitIndex, wounds);
      }
    }
  );

  // -------------------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------------------

  // Load default army data on mount
  useEffect(() => {
    loadArmyData(currentList.army);
    fetchLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------------------
  // Computed Values
  // -------------------------------------------------------------------------

  const totalPoints = getTotalPoints();
  const canPlay = listValidation.canEnterPlayMode;

  // Get enhancement for selected unit
  const selectedEnhancement = useMemo(() => {
    if (!selectedListUnit?.enhancement || !armyData) return null;
    const detachment = armyData.detachments[currentList.detachment];
    return detachment?.enhancements?.find((e) => e.id === selectedListUnit.enhancement) || null;
  }, [selectedListUnit, armyData, currentList.detachment]);

  // Get attached leader info for selected unit
  const attachedLeaderInfo = useMemo(() => {
    if (selectedUnitIndex === null) return null;
    return leaderAttachment.getAttachedLeader(selectedUnitIndex);
  }, [selectedUnitIndex, leaderAttachment]);

  // Get leader unit and listUnit from the available leader info
  const leaderUnit = useMemo((): Unit | undefined => {
    if (!attachedLeaderInfo || !armyData) return undefined;
    return armyData.units.find((u) => u.id === attachedLeaderInfo.unitId);
  }, [attachedLeaderInfo, armyData]);

  const leaderListUnit = useMemo(() => {
    if (!attachedLeaderInfo) return undefined;
    return currentList.units[attachedLeaderInfo.unitIndex];
  }, [attachedLeaderInfo, currentList.units]);

  // Get leader enhancement
  const leaderEnhancement = useMemo(() => {
    if (!attachedLeaderInfo?.enhancement || !armyData) return null;
    const detachment = armyData.detachments[currentList.detachment];
    return detachment?.enhancements?.find((e) => e.id === attachedLeaderInfo.enhancement) || null;
  }, [attachedLeaderInfo, armyData, currentList.detachment]);

  // Build loadout groups for Play Mode weapons display
  const loadoutGroups = useMemo((): LoadoutGroup[] => {
    if (!selectedUnit || !selectedListUnit) return [];

    const groups: LoadoutGroup[] = [];
    const weaponCounts = selectedListUnit.weaponCounts || {};

    // Get weapons without loadoutGroup (always equipped)
    const alwaysEquipped = selectedUnit.weapons.filter((w) => !w.loadoutGroup);

    if (alwaysEquipped.length > 0) {
      groups.push({
        id: 'default',
        name: 'Standard Equipment',
        modelCount: selectedListUnit.modelCount,
        isPaired: false,
        weapons: alwaysEquipped,
        rangedWeapons: alwaysEquipped.filter((w) => w.type === 'ranged'),
        meleeWeapons: alwaysEquipped.filter((w) => w.type === 'melee'),
      });
    }

    // Get weapons by loadout group
    const loadoutGroupIds = [...new Set(selectedUnit.weapons.filter((w) => w.loadoutGroup).map((w) => w.loadoutGroup!))];

    for (const groupId of loadoutGroupIds) {
      const count = weaponCounts[groupId] || 0;
      if (count === 0) continue;

      const groupWeapons = selectedUnit.weapons.filter((w) => w.loadoutGroup === groupId);
      const choice = selectedUnit.loadoutOptions
        ?.flatMap((opt) => opt.choices)
        .find((c) => c.id === groupId);

      groups.push({
        id: groupId,
        name: choice?.name || groupId,
        modelCount: count,
        isPaired: choice?.paired || false,
        weapons: groupWeapons,
        rangedWeapons: groupWeapons.filter((w) => w.type === 'ranged'),
        meleeWeapons: groupWeapons.filter((w) => w.type === 'melee'),
      });
    }

    return groups;
  }, [selectedUnit, selectedListUnit]);

  // Build collapsed/activated state maps for Play Mode
  // Note: We depend on gameState directly so the memo re-computes when state changes
  const collapsedGroups = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const group of loadoutGroups) {
      map[group.id] = selectedUnitIndex !== null && isLoadoutGroupCollapsed(selectedUnitIndex, group.id);
    }
    return map;
  }, [loadoutGroups, selectedUnitIndex, isLoadoutGroupCollapsed, gameState.collapsedLoadoutGroups]);

  const activatedGroups = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const group of loadoutGroups) {
      map[group.id] = selectedUnitIndex !== null && isLoadoutGroupActivated(selectedUnitIndex, group.id);
    }
    return map;
  }, [loadoutGroups, selectedUnitIndex, isLoadoutGroupActivated, gameState.activatedLoadoutGroups]);

  // Get leader weapons for Play Mode
  const leaderWeapons = useMemo((): Weapon[] | undefined => {
    if (!leaderUnit) return undefined;
    return leaderUnit.weapons;
  }, [leaderUnit]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleArmyChange = useCallback(async (armyId: string) => {
    resetList();
    resetGameState();
    selectUnit(null);
    await loadArmyData(armyId);
  }, [resetList, resetGameState, selectUnit, loadArmyData]);

  const handleModeChange = useCallback((newMode: 'build' | 'play') => {
    if (newMode === 'play' && !canPlay) {
      showError('Fix validation errors before entering Play Mode');
      return;
    }
    setMode(newMode);
  }, [canPlay, setMode, showError]);

  const handleToggleReferencePanel = useCallback(() => {
    setShowReferencePanel(prev => !prev);
  }, []);

  const handleAddUnit = useCallback((unit: Unit) => {
    const modelCounts = Object.keys(unit.points).map(Number);
    const defaultModelCount = modelCounts[0];
    addUnit(unit.id, defaultModelCount);
    setPreviewedUnit(null); // Clear preview after adding
    showSuccess(`Added ${unit.name} to your army`);
  }, [addUnit, showSuccess]);

  const handlePreviewUnit = useCallback((unit: Unit) => {
    setPreviewedUnit(unit);
    selectUnit(null); // Clear list selection when previewing from roster
  }, [selectUnit]);

  const handleSelectListUnit = useCallback((index: number | null) => {
    selectUnit(index);
    setPreviewedUnit(null); // Clear preview when selecting from list
  }, [selectUnit]);

  const handleRemoveUnit = useCallback((index: number) => {
    const listUnit = currentList.units[index];
    const unit = armyData?.units.find((u) => u.id === listUnit?.unitId);
    removeUnit(index);
    if (selectedUnitIndex === index) {
      selectUnit(null);
    } else if (selectedUnitIndex !== null && selectedUnitIndex > index) {
      selectUnit(selectedUnitIndex - 1);
    }
    showSuccess(`Removed ${unit?.name || 'unit'} from your army`);
  }, [currentList.units, armyData, removeUnit, selectedUnitIndex, selectUnit, showSuccess]);

  const handleSave = useCallback(async () => {
    if (!currentList.name.trim()) {
      showError('Please enter a list name before saving');
      return;
    }

    const errors = listValidation.validateList().errors;
    if (errors.length > 0) {
      showError(errors[0].message);
      return;
    }

    try {
      await saveSavedList(currentList);
      showSuccess('List saved successfully');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to save list');
    }
  }, [currentList, listValidation, saveSavedList, showSuccess, showError]);

  const handleLoadList = useCallback(async (data: CurrentList) => {
    try {
      // Load the army data first if different
      if (data.army !== currentList.army) {
        await loadArmyData(data.army);
      }
      loadList(data);
      closeModal();
      showSuccess('List loaded successfully');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to load list');
    }
  }, [currentList.army, loadArmyData, loadList, closeModal, showSuccess, showError]);


  const handleImport = useCallback((data: CurrentList) => {
    // Set army data if needed
    if (data.army && data.army !== currentList.army) {
      loadArmyData(data.army);
    }
    loadList(data);
    closeModal();
    showSuccess('List imported successfully');
  }, [currentList.army, loadArmyData, loadList, closeModal, showSuccess]);

  const handleUnitWoundAdjust = useCallback((delta: number) => {
    if (selectedUnitIndex === null) return;
    const newWounds = Math.max(0, Math.min(
      woundTracking.unitWounds.totalWounds,
      woundTracking.unitWounds.currentWounds + delta
    ));
    setUnitWounds(selectedUnitIndex, newWounds);
  }, [selectedUnitIndex, woundTracking.unitWounds, setUnitWounds]);

  const handleLeaderWoundAdjust = useCallback((delta: number) => {
    if (selectedUnitIndex === null || !woundTracking.leaderWounds) return;
    const newWounds = Math.max(0, Math.min(
      woundTracking.leaderWounds.totalWounds,
      woundTracking.leaderWounds.currentWounds + delta
    ));
    setLeaderWounds(selectedUnitIndex, newWounds);
  }, [selectedUnitIndex, woundTracking.leaderWounds, setLeaderWounds]);

  // Reset all activations for the selected unit
  const handleResetUnitActivations = useCallback(() => {
    if (selectedUnitIndex === null) return;

    // Reset all loadout group activations
    for (const group of loadoutGroups) {
      if (isLoadoutGroupActivated(selectedUnitIndex, group.id)) {
        toggleLoadoutGroupActivated(selectedUnitIndex, group.id);
      }
    }

    // Reset leader activation if applicable
    if (isLeaderActivated(selectedUnitIndex)) {
      toggleLeaderActivated(selectedUnitIndex);
    }
  }, [selectedUnitIndex, loadoutGroups, isLoadoutGroupActivated, toggleLoadoutGroupActivated, isLeaderActivated, toggleLeaderActivated]);

  // Check if selected unit has any activations
  const hasAnyActivations = useMemo(() => {
    if (selectedUnitIndex === null) return false;

    // Check loadout groups
    for (const group of loadoutGroups) {
      if (activatedGroups[group.id]) return true;
    }

    // Check leader
    if (isLeaderActivated(selectedUnitIndex)) return true;

    return false;
  }, [selectedUnitIndex, loadoutGroups, activatedGroups, isLeaderActivated]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  // Loading state
  if (isArmyLoading && !armyData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading army data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Navigation */}
      <Navigation
        selectedArmyId={currentList.army}
        armies={availableArmies}
        onArmyChange={handleArmyChange}
        mode={mode}
        onModeChange={handleModeChange}
        canPlay={canPlay}
        showReferencePanel={showReferencePanel}
        onToggleReferencePanel={handleToggleReferencePanel}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {mode === 'build' ? (
          <BuildMode
            listName={currentList.name}
            currentPoints={totalPoints}
            pointsLimit={currentList.pointsLimit}
            detachmentName={armyData?.detachments[currentList.detachment]?.name}
            formatName={currentList.format === 'colosseum' ? 'Colosseum' : 'Standard'}
            onNameChange={setListName}
            validationErrors={listValidation.validateList().errors}
            leftPanel={
              armyData && (
                <ArmyListPanel
                  armyData={armyData}
                  currentList={currentList}
                  selectedUnitIndex={selectedUnitIndex}
                  onSelectUnit={handleSelectListUnit}
                  onRemoveUnit={handleRemoveUnit}
                  onModelCountChange={updateUnitModelCount}
                  onEnhancementChange={setUnitEnhancement}
                  onWeaponCountChange={(index, choiceId, count) => setWeaponCount(index, choiceId, count)}
                  onFormatChange={(format: GameFormat) => setFormat(format)}
                  onPointsLimitChange={setPointsLimit}
                  onDetachmentChange={setDetachment}
                  onImport={() => openModal('import')}
                  onLoad={() => openModal('load')}
                  onSave={handleSave}
                  canSave={!!currentList.name.trim()}
                  getAvailableLeaders={leaderAttachment.getAvailableLeaders}
                  isUnitAttachedAsLeader={leaderAttachment.isUnitAttachedAsLeader}
                  getAttachedToUnitName={(index) => leaderAttachment.getAttachedToUnit(index)?.name}
                  canHaveLeaderAttached={leaderAttachment.canHaveLeaderAttached}
                  getAttachedLeaderName={(index) => leaderAttachment.getAttachedLeader(index)?.name}
                  onAttachLeader={leaderAttachment.attachLeader}
                  onDetachLeader={leaderAttachment.detachLeader}
                />
              )
            }
            middlePanel={
              armyData && (
                <UnitRosterPanel
                  units={armyData.units}
                  onSelectUnit={handlePreviewUnit}
                  onAddUnit={handleAddUnit}
                  selectedUnitId={previewedUnit?.id}
                  isLoading={isArmyLoading}
                />
              )
            }
            rightPanel={
              previewedUnit ? (
                <UnitDetailsPanel
                  unit={previewedUnit}
                  listUnit={null}
                  unitIndex={0}
                  enhancement={null}
                  onAddUnit={() => handleAddUnit(previewedUnit)}
                />
              ) : (
                <UnitDetailsPanel
                  unit={selectedUnit || null}
                  listUnit={selectedListUnit || null}
                  unitIndex={selectedUnitIndex}
                  enhancement={selectedEnhancement}
                  modifiers={statModifiers.modifiers}
                  modifierSources={buildModifierSources(statModifiers)}
                />
              )
            }
          />
        ) : (
          <PlayMode
            listName={currentList.name}
            totalPoints={totalPoints}
            pointsLimit={currentList.pointsLimit}
            armyName={availableArmies.find((a) => a.id === currentList.army)?.name || 'Unknown Army'}
            battleRound={gameState.battleRound}
            onModeToggle={() => handleModeChange('build')}
            canPlay={canPlay}
            validationErrors={listValidation.validateList().errors}
            leftPanel={
              armyData && (
                <ArmyOverviewPanel
                  armyData={armyData}
                  units={currentList.units}
                  selectedUnitIndex={selectedUnitIndex}
                  detachmentId={currentList.detachment}
                  onSelectUnit={selectUnit}
                  listName={currentList.name}
                  totalPoints={totalPoints}
                />
              )
            }
            middlePanel={
              <GameStatePanel
                battleRound={gameState.battleRound}
                onBattleRoundChange={setBattleRound}
                commandPoints={gameState.commandPoints}
                onCommandPointsChange={setCommandPoints}
                selectedKatah={gameState.katah}
                onKatahChange={setKatah}
                activeStratagems={gameState.activeStratagems}
                onToggleStratagem={toggleStratagem}
                armyData={armyData}
                detachmentId={currentList.detachment}
              />
            }
            rightPanel={
              selectedUnit && selectedListUnit && selectedUnitIndex !== null ? (
                <SelectedUnitDetailsPanel
                  unit={selectedUnit}
                  listUnit={selectedListUnit}
                  unitIndex={selectedUnitIndex}
                  enhancement={selectedEnhancement}
                  hasLeader={!!attachedLeaderInfo}
                  leaderUnit={leaderUnit}
                  leaderListUnit={leaderListUnit}
                  leaderEnhancement={leaderEnhancement}
                  modifiers={statModifiers.modifiers}
                  modifierSources={buildModifierSources(statModifiers)}
                  loadoutGroups={loadoutGroups}
                  leaderWeapons={leaderWeapons}
                  collapsedGroups={collapsedGroups}
                  activatedGroups={activatedGroups}
                  onToggleCollapse={toggleLoadoutGroupCollapsed}
                  onToggleActivated={toggleLoadoutGroupActivated}
                  isLeaderCollapsed={isLeaderCollapsed(selectedUnitIndex)}
                  isLeaderActivated={isLeaderActivated(selectedUnitIndex)}
                  onToggleLeaderCollapse={() => toggleLeaderCollapsed(selectedUnitIndex)}
                  onToggleLeaderActivated={() => toggleLeaderActivated(selectedUnitIndex)}
                  onUnitWoundAdjust={handleUnitWoundAdjust}
                  onLeaderWoundAdjust={handleLeaderWoundAdjust}
                  activeKatah={gameState.katah}
                  katahName={armyData?.armyRules?.martial_katah?.stances?.find(s => s.id === gameState.katah)?.name}
                  katahDescription={armyData?.armyRules?.martial_katah?.stances?.find(s => s.id === gameState.katah)?.description}
                  activeStratagems={gameState.activeStratagems}
                  stratagemNames={Object.fromEntries(
                    armyData?.detachments[currentList.detachment]?.stratagems?.map(s => [s.id, s.name]) || []
                  )}
                  activeStratagemData={
                    armyData?.detachments[currentList.detachment]?.stratagems?.filter(
                      s => gameState.activeStratagems.includes(s.id)
                    ) || []
                  }
                  onResetActivations={handleResetUnitActivations}
                  hasAnyActivations={hasAnyActivations}
                />
              ) : undefined
            }
          />
        )}
      </main>

      {/* Quick Reference Slide-Out Panel */}
      {armyData && (
        <div
          className={`
            fixed right-0 top-0 h-full w-80 material-elevated shadow-2xl z-40
            flex flex-col transition-transform duration-200 ease-out
            ${showReferencePanel ? 'translate-x-0' : 'translate-x-full'}
          `}
        >
          {/* Panel Header */}
          <div className="flex justify-between items-center p-4 border-b border-white/10 shrink-0">
            <h3 className="text-lg font-semibold text-accent-300">Quick Reference</h3>
            <button
              onClick={handleToggleReferencePanel}
              className="btn-ios btn-ios-secondary btn-ios-sm p-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
            {/* Detachment Stratagems */}
            {armyData.detachments[currentList.detachment]?.stratagems && (
              <div>
                <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wide mb-3">
                  {armyData.detachments[currentList.detachment]?.name} Stratagems
                </h4>
                <div className="space-y-2">
                  {armyData.detachments[currentList.detachment]?.stratagems?.map((strat) => (
                    <div key={strat.id} className="bg-black/20 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-sm text-accent-300">{strat.name}</span>
                        <span className="badge badge-purple text-[10px] py-0">{strat.cost}CP</span>
                      </div>
                      <div className="text-xs text-white/40 mt-1">{strat.phase}</div>
                      <div className="text-xs text-white/70 mt-1">{strat.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detachment Enhancements */}
            {armyData.detachments[currentList.detachment]?.enhancements && (
              <div>
                <h4 className="text-xs font-semibold text-accent-400 uppercase tracking-wide mb-3">
                  {armyData.detachments[currentList.detachment]?.name} Enhancements
                </h4>
                <div className="space-y-2">
                  {armyData.detachments[currentList.detachment]?.enhancements?.map((enh) => (
                    <div key={enh.id} className="bg-black/20 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-sm text-accent-300">{enh.name}</span>
                        <span className="badge badge-accent text-[10px] py-0">{enh.points} pts</span>
                      </div>
                      <div className="text-xs text-white/70 mt-1">{enh.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Wargear Abilities (from weaponKeywords) */}
            {armyData.weaponKeywords && Object.keys(armyData.weaponKeywords).length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-orange-400 uppercase tracking-wide mb-3">Wargear Abilities</h4>
                <div className="space-y-1.5">
                  {Object.entries(armyData.weaponKeywords).map(([key, kw]) => (
                    <div key={key} className="bg-black/20 rounded-lg p-3">
                      <span className="font-medium text-sm text-orange-300">{kw.name}</span>
                      <div className="text-xs text-white/70 mt-0.5">{kw.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Weapon Keywords */}
            {armyData.keywordGlossary?.weapon && armyData.keywordGlossary.weapon.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-3">Weapon Abilities</h4>
                <div className="space-y-1.5">
                  {armyData.keywordGlossary.weapon.map((kw) => (
                    <div key={kw.name} className="bg-black/20 rounded-lg p-3">
                      <span className="font-medium text-sm text-blue-300">{kw.name}</span>
                      <div className="text-xs text-white/70 mt-0.5">{kw.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unit Keywords */}
            {armyData.keywordGlossary?.unit && armyData.keywordGlossary.unit.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-green-400 uppercase tracking-wide mb-3">Unit Abilities</h4>
                <div className="space-y-1.5">
                  {armyData.keywordGlossary.unit.map((kw) => (
                    <div key={kw.name} className="bg-black/20 rounded-lg p-3">
                      <span className="font-medium text-sm text-green-300">{kw.name}</span>
                      <div className="text-xs text-white/70 mt-0.5">{kw.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {activeModal === 'import' && (
        <ImportModal
          isOpen={true}
          onClose={closeModal}
          onImport={handleImport}
        />
      )}

      {activeModal === 'load' && (
        <LoadModal
          isOpen={true}
          onClose={closeModal}
          lists={savedLists}
          isLoading={isListsLoading}
          onLoad={fetchSavedList}
          onDelete={deleteSavedList}
          onListLoaded={handleLoadList}
        />
      )}

      {activeModal === 'confirm' && confirmModalConfig && (
        <ConfirmModal
          isOpen={true}
          onClose={closeModal}
          title={confirmModalConfig.title}
          message={confirmModalConfig.message}
          confirmText={confirmModalConfig.confirmText}
          cancelText={confirmModalConfig.cancelText}
          onConfirm={() => {
            confirmModalConfig.onConfirm();
            closeModal();
          }}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer
        toasts={toasts}
        onDismiss={dismissToast}
      />
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build modifier sources record from stat modifiers for tooltips
 */
function buildModifierSources(
  statModifiers: ReturnType<typeof useStatModifiers>
): Record<string, ModifierSource[]> {
  const sources: Record<string, ModifierSource[]> = {};

  for (const mod of statModifiers.modifiers) {
    if (!sources[mod.stat]) {
      sources[mod.stat] = [];
    }
    sources[mod.stat].push({
      name: mod.sourceName,
      value: mod.value,
      operation: mod.operation as ModifierOperation,
    });
  }

  return sources;
}
