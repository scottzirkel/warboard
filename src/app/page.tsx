'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useArmyStore, availableArmies } from '@/stores/armyStore';
import { useGameStore } from '@/stores/gameStore';
import { useUIStore } from '@/stores/uiStore';
import { Navigation } from '@/components/navigation';
import { LandingPage } from '@/components/LandingPage';
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
  ExportModal,
  LoadModal,
  SaveModal,
  ConfirmModal,
  MigrateListsModal,
} from '@/components/ui';
import {
  useLeaderAttachment,
  useStatModifiers,
  useListValidation,
  useWoundTracking,
  useSavedLists,
  getLocalStorageLists,
} from '@/hooks';
import type { CurrentList, Unit, GameFormat, LoadoutGroup, Weapon, ModifierSource, ModifierOperation, MissionTwist } from '@/types';

// ============================================================================
// Main App Component
// ============================================================================

export default function Home() {
  // -------------------------------------------------------------------------
  // Local State
  // -------------------------------------------------------------------------
  const [showReferencePanel, setShowReferencePanel] = useState(false);
  const [previewedUnit, setPreviewedUnit] = useState<Unit | null>(null);
  const [missionTwists, setMissionTwists] = useState<MissionTwist[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportCode, setExportCode] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Auth & Migration State
  // -------------------------------------------------------------------------
  const { status: authStatus } = useSession();
  const prevAuthStatus = useRef(authStatus);
  const [showMigrateModal, setShowMigrateModal] = useState(false);
  const [localListsForMigration, setLocalListsForMigration] = useState<ReturnType<typeof getLocalStorageLists>>([]);

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
    setWarlord,
    setUnitWounds,
    setLeaderWounds,
    resetList,
    loadList,
    getTotalPoints,
  } = useArmyStore();

  const {
    gameState,
    setBattleRound,
    setPhase,
    setCommandPoints,
    setPrimaryVP,
    setSecondaryVP,
    advanceGameState,
    togglePlayerTurn,
    setKatah,
    setRuleChoice,
    confirmRoundSelection,
    toggleStratagem,
    toggleTwist,
    incrementStratagemUsage,
    isLoadoutGroupCollapsed,
    toggleLoadoutGroupCollapsed,
    isLoadoutGroupActivated,
    toggleLoadoutGroupActivated,
    isLeaderCollapsed,
    toggleLeaderCollapsed,
    isLeaderActivated,
    toggleLeaderActivated,
    incrementLoadoutCasualties,
    decrementLoadoutCasualties,
    isAbilityUsed,
    toggleAbilityUsed,
    resetGameState,
  } = useGameStore();

  const {
    hasEnteredApp,
    mode,
    selectedUnitIndex,
    mobilePanel,
    activeModal,
    confirmModalConfig,
    toasts,
    enterApp,
    setMode,
    selectUnit,
    setMobilePanel,
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
      // Helper to find unit in both regular units and allies
      const findUnit = (unitId: string | undefined) => {
        if (!unitId || !armyData) return undefined;
        const regular = armyData.units.find(u => u.id === unitId);
        if (regular) return regular;
        if (armyData.allies) {
          for (const faction of Object.values(armyData.allies)) {
            const ally = faction.units?.find(u => u.id === unitId);
            if (ally) return ally;
          }
        }
        return undefined;
      };
      const leaderUnit = findUnit(leaderListUnit?.unitId);
      const targetUnit = findUnit(targetListUnit?.unitId);
      if (leaderUnit && targetUnit) {
        showSuccess(`${leaderUnit.name} attached to ${targetUnit.name}`);
      }
    },
    (unitIndex: number) => {
      const listUnit = currentList.units[unitIndex];
      const leaderIndex = listUnit?.attachedLeader?.unitIndex;
      const leaderListUnit = leaderIndex !== undefined ? currentList.units[leaderIndex] : undefined;
      // Helper to find unit in both regular units and allies
      const findUnit = (unitId: string | undefined) => {
        if (!unitId || !armyData) return undefined;
        const regular = armyData.units.find(u => u.id === unitId);
        if (regular) return regular;
        if (armyData.allies) {
          for (const faction of Object.values(armyData.allies)) {
            const ally = faction.units?.find(u => u.id === unitId);
            if (ally) return ally;
          }
        }
        return undefined;
      };
      const leaderUnit = leaderListUnit ? findUnit(leaderListUnit.unitId) : undefined;
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
  // Combined Units (includes allies) - matches Alpine's allUnits getter
  // -------------------------------------------------------------------------
  const allUnits = useMemo(() => {
    if (!armyData) return [];

    // Regular units
    const regularUnits = armyData.units.map((u) => ({ ...u, isAlly: false as const }));

    // Ally units
    const allyUnits: (Unit & { isAlly: true; allyFaction: string })[] = [];
    if (armyData.allies) {
      for (const faction of Object.values(armyData.allies)) {
        for (const unit of faction.units || []) {
          allyUnits.push({ ...unit, isAlly: true as const, allyFaction: faction.name });
        }
      }
    }

    return [...regularUnits, ...allyUnits];
  }, [armyData]);

  // Helper to find unit by ID (checks both regular units and allies)
  const findUnitById = useCallback((unitId: string): Unit | undefined => {
    if (!armyData) return undefined;

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
  }, [armyData]);

  // -------------------------------------------------------------------------
  // Selected Unit Data
  // -------------------------------------------------------------------------
  const selectedUnit = useMemo(() => {
    if (selectedUnitIndex === null || !armyData) return undefined;
    const listUnit = currentList.units[selectedUnitIndex];
    if (!listUnit) return undefined;
    return findUnitById(listUnit.unitId);
  }, [selectedUnitIndex, armyData, currentList.units, findUnitById]);

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

  // Load army data and saved lists after entering from landing page
  // The landing page handles the initial army load, this handles subsequent mounts
  useEffect(() => {
    if (hasEnteredApp && !armyData) {
      loadArmyData(currentList.army);
    }
    fetchLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasEnteredApp]);

  // Load mission data (Chapter Approved twists)
  useEffect(() => {
    const loadMissionData = async () => {
      try {
        const res = await fetch('/data/missions.json');
        const data = await res.json();
        setMissionTwists(data.twists || []);
      } catch (err) {
        console.error('Failed to load mission data:', err);
      }
    };
    loadMissionData();
  }, []);

  // Detect sign-in and check for localStorage lists to migrate
  useEffect(() => {
    if (prevAuthStatus.current !== 'authenticated' && authStatus === 'authenticated') {
      const localLists = getLocalStorageLists();

      if (localLists.length > 0) {
        setLocalListsForMigration(localLists);
        setShowMigrateModal(true);
      }
    }

    prevAuthStatus.current = authStatus;
  }, [authStatus]);

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
    if (!attachedLeaderInfo) return undefined;
    return findUnitById(attachedLeaderInfo.unitId);
  }, [attachedLeaderInfo, findUnitById]);

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
      const choice = selectedUnit.loadoutOptions
        ?.flatMap((opt) => opt.choices)
        .find((c) => c.id === groupId);

      // If count is 0 and there IS a matching loadout choice, the user chose
      // not to equip these weapons — skip them. If there's NO matching choice,
      // these weapons are always equipped (e.g. units without loadoutOptions).
      if (count === 0 && choice) continue;

      const effectiveCount = count || selectedListUnit.modelCount;
      const groupWeapons = selectedUnit.weapons.filter((w) => w.loadoutGroup === groupId);

      groups.push({
        id: groupId,
        name: choice?.name || groupId,
        modelCount: effectiveCount,
        isPaired: choice?.paired || false,
        weapons: groupWeapons,
        rangedWeapons: groupWeapons.filter((w) => w.type === 'ranged'),
        meleeWeapons: groupWeapons.filter((w) => w.type === 'melee'),
      });
    }

    // Sort groups: ranged weapons first, then melee-only
    // Groups with ranged weapons come before groups with only melee
    groups.sort((a, b) => {
      const aHasRanged = a.rangedWeapons.length > 0;
      const bHasRanged = b.rangedWeapons.length > 0;
      if (aHasRanged && !bHasRanged) return -1;
      if (!aHasRanged && bHasRanged) return 1;
      return 0;
    });

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

  // Get leader weapons for Play Mode (filtered by leader's loadout selection)
  const leaderWeapons = useMemo((): Weapon[] | undefined => {
    if (!leaderUnit || !leaderListUnit) return undefined;

    const weaponCounts = leaderListUnit.weaponCounts || {};

    // Get weapons without loadoutGroup (always equipped)
    const alwaysEquipped = leaderUnit.weapons.filter((w) => !w.loadoutGroup);

    // Get weapons from selected loadout groups
    const selectedWeapons: Weapon[] = [];
    for (const [groupId, count] of Object.entries(weaponCounts)) {
      if (count > 0) {
        const groupWeapons = leaderUnit.weapons.filter((w) => w.loadoutGroup === groupId);
        selectedWeapons.push(...groupWeapons);
      }
    }

    return [...alwaysEquipped, ...selectedWeapons];
  }, [leaderUnit, leaderListUnit]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleArmyChange = useCallback(async (armyId: string) => {
    resetList();
    resetGameState();
    selectUnit(null);
    await loadArmyData(armyId);
  }, [resetList, resetGameState, selectUnit, loadArmyData]);

  const handleLandingArmySelect = useCallback(async (armyId: string) => {
    await loadArmyData(armyId);
    enterApp();
  }, [loadArmyData, enterApp]);

  const handleModeChange = useCallback((newMode: 'build' | 'play') => {
    if (newMode === 'play' && !canPlay) {
      showError('Fix validation errors before entering Play Mode');
      return;
    }
    setMode(newMode);
  }, [canPlay, setMode, showError]);

  const handleModeToggle = useCallback(() => {
    const newMode = mode === 'build' ? 'play' : 'build';
    handleModeChange(newMode);
  }, [mode, handleModeChange]);

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
    setMobilePanel('details'); // Auto-switch to details panel on mobile
  }, [selectUnit, setMobilePanel]);

  const handleSelectListUnit = useCallback((index: number | null) => {
    selectUnit(index);
    setPreviewedUnit(null); // Clear preview when selecting from list
    // Don't auto-switch panels - user stays on list panel to edit the unit
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

  const handleOpenSaveModal = useCallback(() => {
    openModal('save');
  }, [openModal]);

  const handleSaveWithName = useCallback(async (name: string): Promise<boolean> => {
    const errors = listValidation.validateList().errors;

    if (errors.length > 0) {
      showError(errors[0].message);
      return false;
    }

    try {
      // Update the list name and save
      const listToSave = { ...currentList, name };
      const success = await saveSavedList(listToSave);

      if (success) {
        setListName(name);
        showSuccess('List saved successfully');
      }

      return success;
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to save list');
      return false;
    }
  }, [currentList, listValidation, saveSavedList, setListName, showSuccess, showError]);

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

  const handleExport = useCallback(() => {
    if (!armyData || currentList.units.length === 0) return;

    setExportCode(null);
    setExportError(null);
    openModal('export');
  }, [armyData, currentList.units.length, openModal]);

  const handleExportYellowscribe = useCallback(async () => {
    if (!armyData) return;

    setIsExporting(true);
    setExportCode(null);
    setExportError(null);

    try {
      const response = await fetch('/api/yellowscribe/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          list: currentList,
          armyData,
        }),
      });

      const result = await response.json();

      if (result.success && result.code) {
        setExportCode(result.code);
      } else {
        setExportError(result.error || 'Failed to get export code');
      }
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Network error');
    } finally {
      setIsExporting(false);
    }
  }, [armyData, currentList]);

  const handleCloseExportModal = useCallback(() => {
    closeModal();
    setExportCode(null);
    setExportError(null);
  }, [closeModal]);

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

  // Landing page
  if (!hasEnteredApp) {
    return (
      <LandingPage
        onSelectArmy={handleLandingArmySelect}
        isLoading={isArmyLoading}
      />
    );
  }

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
    <div className="flex flex-col min-h-screen lg:h-screen overflow-x-hidden">
      {/* Navigation */}
      <Navigation
        mode={mode}
        onModeToggle={handleModeToggle}
        canPlay={canPlay}
        mobilePanel={mobilePanel}
        onMobilePanelChange={setMobilePanel}
        battleRound={gameState.battleRound}
        onBattleRoundChange={setBattleRound}
        commandPoints={gameState.commandPoints}
        onCommandPointsChange={setCommandPoints}
        primaryVP={gameState.primaryVP}
        onPrimaryVPChange={setPrimaryVP}
        secondaryVP={gameState.secondaryVP}
        onSecondaryVPChange={setSecondaryVP}
        currentPhase={gameState.currentPhase}
        playerTurn={gameState.playerTurn}
        onPhaseChange={setPhase}
        onAdvance={advanceGameState}
        onToggleTurn={togglePlayerTurn}
        onReset={resetGameState}
        showReferencePanel={showReferencePanel}
        onToggleReferencePanel={handleToggleReferencePanel}
      />

      {/* Main Content */}
      <main className="flex-1 lg:overflow-hidden">
        {mode === 'build' ? (
          <BuildMode
            listName={currentList.name}
            currentPoints={totalPoints}
            pointsLimit={currentList.pointsLimit}
            detachmentName={armyData?.detachments[currentList.detachment]?.name}
            formatName={currentList.format === 'colosseum' ? 'Colosseum' : 'Standard'}
            onNameChange={setListName}
            validationErrors={listValidation.validateList().errors}
            mobilePanel={mobilePanel}
            leftPanel={
              armyData && (
                <ArmyListPanel
                  armyData={armyData}
                  currentList={currentList}
                  selectedUnitIndex={selectedUnitIndex}
                  armies={availableArmies}
                  selectedArmyId={currentList.army}
                  onArmyChange={handleArmyChange}
                  onSelectUnit={handleSelectListUnit}
                  onRemoveUnit={handleRemoveUnit}
                  onModelCountChange={updateUnitModelCount}
                  onEnhancementChange={setUnitEnhancement}
                  onWeaponCountChange={(index, choiceId, count) => setWeaponCount(index, choiceId, count)}
                  onFormatChange={(format: GameFormat) => setFormat(format)}
                  onPointsLimitChange={setPointsLimit}
                  onDetachmentChange={setDetachment}
                  onImport={() => openModal('import')}
                  onExport={handleExport}
                  onLoad={() => openModal('load')}
                  onSave={handleOpenSaveModal}
                  onClear={resetList}
                  canSave={true}
                  canExport={currentList.units.length > 0}
                  isExporting={isExporting}
                  getAvailableLeaders={leaderAttachment.getAvailableLeaders}
                  isUnitAttachedAsLeader={leaderAttachment.isUnitAttachedAsLeader}
                  getAttachedToUnitName={(index) => leaderAttachment.getAttachedToUnit(index)?.name}
                  canHaveLeaderAttached={leaderAttachment.canHaveLeaderAttached}
                  getAttachedLeaderName={(index) => leaderAttachment.getAttachedLeader(index)?.name}
                  onAttachLeader={leaderAttachment.attachLeader}
                  onDetachLeader={leaderAttachment.detachLeader}
                  onSetWarlord={setWarlord}
                />
              )
            }
            middlePanel={
              armyData && (
                <UnitRosterPanel
                  units={allUnits}
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
            commandPoints={gameState.commandPoints}
            primaryVP={gameState.primaryVP}
            secondaryVP={gameState.secondaryVP}
            currentPhase={gameState.currentPhase}
            playerTurn={gameState.playerTurn}
            onBattleRoundChange={setBattleRound}
            onCommandPointsChange={setCommandPoints}
            onPrimaryVPChange={setPrimaryVP}
            onSecondaryVPChange={setSecondaryVP}
            onToggleTurn={togglePlayerTurn}
            onAdvance={advanceGameState}
            onReset={resetGameState}
            onModeToggle={() => handleModeChange('build')}
            canPlay={canPlay}
            validationErrors={listValidation.validateList().errors}
            mobilePanel={mobilePanel}
            leftPanel={
              armyData && (
                <ArmyOverviewPanel
                  armyData={armyData}
                  units={currentList.units}
                  selectedUnitIndex={selectedUnitIndex}
                  detachmentId={currentList.detachment}
                  onSelectUnit={(index) => {
                    selectUnit(index);
                    if (index !== null) {
                      setMobilePanel('details'); // Auto-switch to unit details on mobile
                    }
                  }}
                />
              )
            }
            middlePanel={
              <GameStatePanel
                selectedKatah={gameState.katah}
                onKatahChange={setKatah}
                pendingConfirmations={gameState.pendingRoundConfirmations ?? {}}
                onConfirmRoundSelection={confirmRoundSelection}
                commandPoints={gameState.commandPoints}
                onCommandPointsChange={setCommandPoints}
                activeStratagems={gameState.activeStratagems}
                onToggleStratagem={toggleStratagem}
                stratagemUsage={gameState.stratagemUsage ?? {}}
                onIncrementStratagemUsage={incrementStratagemUsage}
                activeTwists={gameState.activeTwists || []}
                onToggleTwist={toggleTwist}
                availableTwists={missionTwists}
                activeRuleChoices={gameState.activeRuleChoices ?? {}}
                onSetRuleChoice={setRuleChoice}
                armyData={armyData}
                detachmentId={currentList.detachment}
                currentPhase={gameState.currentPhase}
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
                  isLeaderWarlord={leaderListUnit?.isWarlord === true}
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
                  katahStance={armyData?.armyRules?.martial_katah?.stances?.find(s => s.id === gameState.katah)}
                  activeStratagems={gameState.activeStratagems}
                  stratagemNames={Object.fromEntries(
                    armyData?.detachments[currentList.detachment]?.stratagems?.map(s => [s.id, s.name]) || []
                  )}
                  activeStratagemData={
                    armyData?.detachments[currentList.detachment]?.stratagems?.filter(
                      s => gameState.activeStratagems.includes(s.id)
                    ) || []
                  }
                  activeTwistData={
                    missionTwists
                      .filter(t => (gameState.activeTwists || []).includes(t.id))
                      .filter(t => {
                        // If twist only applies to warlord, check if unit OR attached leader is warlord
                        if (t.appliesToWarlord) {
                          const isUnitWarlord = selectedListUnit?.isWarlord === true;
                          const attachedLeaderIndex = selectedListUnit?.attachedLeader?.unitIndex;
                          const isAttachedLeaderWarlord = attachedLeaderIndex !== undefined
                            ? currentList.units[attachedLeaderIndex]?.isWarlord === true
                            : false;
                          return isUnitWarlord || isAttachedLeaderWarlord;
                        }
                        return true;
                      })
                  }
                  activeRuleChoiceData={
                    (() => {
                      const detachment = armyData?.detachments[currentList.detachment];
                      if (!detachment?.rules) return [];
                      const result: { rule: { id: string; name: string }; choice: NonNullable<typeof detachment.rules[0]['choices']>[0] }[] = [];
                      for (const [ruleId, choiceId] of Object.entries(gameState.activeRuleChoices ?? {})) {
                        const rule = detachment.rules.find(r => r.id === ruleId);
                        if (!rule?.choices) continue;
                        const choice = rule.choices.find(c => c.id === choiceId);
                        if (choice) {
                          result.push({ rule: { id: rule.id, name: rule.name }, choice });
                        }
                      }
                      return result;
                    })()
                  }
                  onResetActivations={handleResetUnitActivations}
                  hasAnyActivations={hasAnyActivations}
                  loadoutCasualties={gameState.loadoutCasualties?.[selectedUnitIndex] || {}}
                  onIncrementCasualties={(groupId) => incrementLoadoutCasualties(selectedUnitIndex, groupId)}
                  onDecrementCasualties={(groupId) => decrementLoadoutCasualties(selectedUnitIndex, groupId)}
                  unitKeywordGlossary={armyData?.keywordGlossary?.unit || []}
                  weaponKeywordGlossary={armyData?.keywordGlossary?.weapon || []}
                  isAbilityUsed={(abilityId) => isAbilityUsed(selectedUnitIndex, abilityId)}
                  onToggleAbilityUsed={(abilityId) => toggleAbilityUsed(selectedUnitIndex, abilityId)}
                />
              ) : undefined
            }
          />
        )}
      </main>

      {/* Quick Reference Slide-Out Panel */}
      {armyData && (
        <>
          {/* Backdrop - click to close */}
          {showReferencePanel && (
            <div
              className="fixed inset-0 bg-black/50 z-50"
              onClick={handleToggleReferencePanel}
            />
          )}
          <div
            className={`
              fixed right-0 top-0 h-full w-96 material-elevated shadow-2xl z-50
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
        </>
      )}

      {/* Modals */}
      {activeModal === 'import' && (
        <ImportModal
          isOpen={true}
          onClose={closeModal}
          onImport={handleImport}
          armyData={armyData}
          armyId={currentList.army}
        />
      )}

      {activeModal === 'export' && armyData && (
        <ExportModal
          isOpen={true}
          onClose={handleCloseExportModal}
          list={currentList}
          armyData={armyData}
          yellowscribeCode={exportCode}
          yellowscribeLoading={isExporting}
          yellowscribeError={exportError}
          onExportYellowscribe={handleExportYellowscribe}
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

      {activeModal === 'save' && (
        <SaveModal
          isOpen={true}
          onClose={closeModal}
          onSave={handleSaveWithName}
          initialName={currentList.name}
          existingNames={savedLists.map(l => l.name)}
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

      {/* Migration Modal */}
      {showMigrateModal && (
        <MigrateListsModal
          isOpen={true}
          onClose={() => setShowMigrateModal(false)}
          localLists={localListsForMigration}
          onMigrationComplete={fetchLists}
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
