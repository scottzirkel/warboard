'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useArmyStore, availableArmies } from '@/stores/armyStore';
import { useGameStore } from '@/stores/gameStore';
import { useUIStore, type MobilePanel } from '@/stores/uiStore';
import { Navigation } from '@/components/navigation';
import { LandingPage } from '@/components/LandingPage';
import { BuildMode } from '@/components/build/BuildMode';
import { ArmyListPanel } from '@/components/build/ArmyListPanel';
import { UnitRosterPanel } from '@/components/build/UnitRosterPanel';
import { UnitDetailModal } from '@/components/build/UnitDetailModal';
import { SetupModal } from '@/components/build/SetupModal';
import { PlayMode } from '@/components/play/PlayMode';
import { ArmyOverviewPanel } from '@/components/play/ArmyOverviewPanel';
import { GameStatePanel } from '@/components/play/GameStatePanel';
import { SelectedUnitDetailsPanel } from '@/components/play/SelectedUnitDetailsPanel';
import { TwistSelectionModal } from '@/components/play/TwistSelectionModal';
import { GameStartModal } from '@/components/play/GameStartModal';
import { SecondaryMissionModal } from '@/components/play/SecondaryMissionModal';
import { EndGameModal } from '@/components/play/EndGameModal';
import { PhaseTransitionModal } from '@/components/play/PhaseTransitionModal';
import { getPhaseReminders, type PhaseReminder } from '@/lib/phaseReminders';
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
import { useGameHistory } from '@/hooks/useGameHistory';
import type { CurrentList, Unit, LoadoutGroup, Weapon, ModifierSource, ModifierOperation, MissionTwist, PrimaryMission, SecondaryMission, MissionDeployment, GameResultOutcome } from '@/types';
import type { GameFormat } from '@/types';
import { findUnitById } from '@/lib/armyDataUtils';

// ============================================================================
// Main App Component
// ============================================================================

export default function Home() {
  // -------------------------------------------------------------------------
  // Local State
  // -------------------------------------------------------------------------
  const [showReferencePanel, setShowReferencePanel] = useState(false);
  const [detailModalUnit, setDetailModalUnit] = useState<Unit | null>(null);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [deployments, setDeployments] = useState<MissionDeployment[]>([]);
  const [missionTwists, setMissionTwists] = useState<MissionTwist[]>([]);
  const [primaryMissions, setPrimaryMissions] = useState<PrimaryMission[]>([]);
  const [secondaryMissions, setSecondaryMissions] = useState<SecondaryMission[]>([]);
  const [showTwistModal, setShowTwistModal] = useState(false);
  const [showGameStartModal, setShowGameStartModal] = useState(false);
  const [showSecondaryMissionModal, setShowSecondaryMissionModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportCode, setExportCode] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showEndGameModal, setShowEndGameModal] = useState(false);
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [phaseReminders, setPhaseReminders] = useState<PhaseReminder[]>([]);
  const prevPhaseRef = useRef<{ phase: string; round: number } | null>(null);

  // -------------------------------------------------------------------------
  // Auth & Migration State
  // -------------------------------------------------------------------------
  const { status: authStatus } = useSession();
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
    resetAllWounds,
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
    clearActiveTwists,
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
    setGoingFirst,
    setIsAttacker,
    setSelectedDeployment,
    setSelectedPrimaryMission,
    toggleSecondaryMission,
    setSecondaryMissions: setGameSecondaryMissions,
    discardSecondaryMission,
    scoreCondition,
    unscoreCondition,
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
    exitApp,
    setMode,
    selectUnit,
    setMobilePanel,
    openModal,
    closeModal,
    showSuccess,
    showError,
    dismissToast,
  } = useUIStore();

  // On mobile, show the roster by default when the army list is empty
  const effectiveMobilePanel = (mode === 'build' && mobilePanel === 'list' && currentList.units.length === 0)
    ? 'roster' as MobilePanel
    : mobilePanel;

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
  // Game History Hook
  // -------------------------------------------------------------------------
  const { saveGame } = useGameHistory();

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
      const leaderUnit = armyData ? findUnitById(armyData, leaderListUnit?.unitId ?? '') : undefined;
      const targetUnit = armyData ? findUnitById(armyData, targetListUnit?.unitId ?? '') : undefined;
      if (leaderUnit && targetUnit) {
        showSuccess(`${leaderUnit.name} attached to ${targetUnit.name}`);
      }
    },
    (unitIndex: number) => {
      const listUnit = currentList.units[unitIndex];
      const leaderIndex = listUnit?.attachedLeader?.unitIndex;
      const leaderListUnit = leaderIndex !== undefined ? currentList.units[leaderIndex] : undefined;
      const leaderUnit = leaderListUnit && armyData ? findUnitById(armyData, leaderListUnit.unitId) : undefined;
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

    return [...regularUnits, ...allyUnits].filter(
      (u) => !u.name.includes('[Legends]')
    );
  }, [armyData]);

  const findUnit = useCallback((unitId: string): Unit | undefined => {
    if (!armyData) return undefined;

    return findUnitById(armyData, unitId);
  }, [armyData]);

  // -------------------------------------------------------------------------
  // Selected Unit Data
  // -------------------------------------------------------------------------
  const selectedUnit = useMemo(() => {
    if (selectedUnitIndex === null || !armyData) return undefined;
    const listUnit = currentList.units[selectedUnitIndex];
    if (!listUnit) return undefined;
    return findUnit(listUnit.unitId);
  }, [selectedUnitIndex, armyData, currentList.units, findUnit]);

  const selectedListUnit = useMemo(() => {
    if (selectedUnitIndex === null) return undefined;
    return currentList.units[selectedUnitIndex];
  }, [selectedUnitIndex, currentList.units]);

  // -------------------------------------------------------------------------
  // Stat Modifiers Hook (for selected unit)
  // -------------------------------------------------------------------------
  // Compute active twist data for the selected unit
  const selectedUnitActiveTwists = useMemo(() => {
    if (mode !== 'play' || !selectedListUnit) return undefined;
    const activeIds = gameState.activeTwists || [];
    return missionTwists
      .filter(t => activeIds.includes(t.id))
      .filter(t => {
        if (t.appliesToWarlord) {
          const isUnitWarlord = selectedListUnit.isWarlord === true;
          const attachedLeaderIndex = selectedListUnit.attachedLeader?.unitIndex;
          const isAttachedLeaderWarlord = attachedLeaderIndex !== undefined
            ? currentList.units[attachedLeaderIndex]?.isWarlord === true
            : false;
          return isUnitWarlord || isAttachedLeaderWarlord;
        }
        return true;
      });
  }, [mode, selectedListUnit, gameState.activeTwists, missionTwists, currentList.units]);

  const statModifiers = useStatModifiers(
    armyData,
    selectedUnit,
    selectedListUnit,
    selectedUnitIndex ?? -1,
    currentList.units,
    currentList.detachment,
    mode === 'play' ? gameState : null,
    selectedUnitActiveTwists
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
        setDeployments(data.deployments || []);
        setMissionTwists(data.twists || []);
        setPrimaryMissions(data.primaryMissions || []);
        setSecondaryMissions(data.secondaryMissions || []);
      } catch (err) {
        console.error('Failed to load mission data:', err);
      }
    };
    loadMissionData();
  }, []);

  // Check for localStorage lists to migrate when authenticated
  const refreshLocalListsForMigration = useCallback((options?: { autoOpen?: boolean }) => {
    const localLists = getLocalStorageLists();
    setLocalListsForMigration(localLists);

    if (localLists.length === 0) {
      setShowMigrateModal(false);
    } else if (options?.autoOpen) {
      setShowMigrateModal(true);
    }
  }, []);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      refreshLocalListsForMigration({ autoOpen: true });
    }
  }, [authStatus, refreshLocalListsForMigration]);

  const handleMigrationComplete = useCallback(() => {
    refreshLocalListsForMigration();
    fetchLists();
  }, [refreshLocalListsForMigration, fetchLists]);

  // Detect phase/round changes and show phase transition modal
  useEffect(() => {
    if (mode !== 'play') return;

    const current = { phase: gameState.currentPhase, round: gameState.battleRound };
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = current;

    if (!prev) return;
    if (prev.phase === current.phase && prev.round === current.round) return;

    // Don't show phase reminders while game start modal is open
    if (showGameStartModal) return;

    const reminders = getPhaseReminders(
      gameState.currentPhase,
      gameState.battleRound,
      armyData,
      currentList.units,
      currentList.detachment,
      gameState,
    );

    if (reminders.length > 0) {
      setPhaseReminders(reminders);
      setShowPhaseModal(true);
    }
  }, [mode, gameState.currentPhase, gameState.battleRound, armyData, currentList.units, currentList.detachment, gameState]);

  // Auto-open secondary mission selection at player's command phase
  useEffect(() => {
    if (mode !== 'play') return;
    if (showGameStartModal || showSecondaryMissionModal) return;
    if (gameState.currentPhase !== 'command' || gameState.playerTurn !== 'player') return;
    if ((gameState.selectedSecondaryMissions ?? []).length >= 2) return;
    if (secondaryMissions.length === 0) return;

    setShowSecondaryMissionModal(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, gameState.currentPhase, gameState.playerTurn, gameState.selectedSecondaryMissions?.length, secondaryMissions.length]);

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
    return findUnit(attachedLeaderInfo.unitId);
  }, [attachedLeaderInfo, findUnit]);

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
    const hasLoadoutOptions = (selectedUnit.loadoutOptions?.length ?? 0) > 0;

    // Calculate how many models swapped away from each default weapon
    // via optional replacement options (e.g., sergeant weapon swaps)
    const defaultReplacements: Record<string, number> = {};
    if (hasLoadoutOptions) {
      for (const option of selectedUnit.loadoutOptions!) {
        if (option.type === 'optional' && option.pattern === 'replacement') {
          const defaultChoice = option.choices.find((c) => c.default);
          if (defaultChoice?.name) {
            const swappedCount = option.choices
              .filter((c) => !c.default && c.id !== 'none')
              .reduce((sum, c) => sum + (weaponCounts[c.id] || 0), 0);
            if (swappedCount > 0) {
              defaultReplacements[defaultChoice.name] =
                (defaultReplacements[defaultChoice.name] || 0) + swappedCount;
            }
          }
        }
      }
    }

    // Get weapons without loadoutGroup (always equipped)
    const alwaysEquipped = selectedUnit.weapons.filter((w) => !w.loadoutGroup);

    // Build always-equipped groups, splitting by adjusted model count
    if (alwaysEquipped.length > 0) {
      const fullCountWeapons = alwaysEquipped.filter((w) => !defaultReplacements[w.name]);
      const reducedByCount = new Map<number, Weapon[]>();
      for (const w of alwaysEquipped) {
        if (defaultReplacements[w.name]) {
          const adjusted = selectedListUnit.modelCount - defaultReplacements[w.name];
          if (!reducedByCount.has(adjusted)) reducedByCount.set(adjusted, []);
          reducedByCount.get(adjusted)!.push(w);
        }
      }

      if (fullCountWeapons.length > 0) {
        groups.push({
          id: 'default',
          name: 'Standard Equipment',
          modelCount: selectedListUnit.modelCount,
          isPaired: false,
          weapons: fullCountWeapons,
          rangedWeapons: fullCountWeapons.filter((w) => w.type === 'ranged'),
          meleeWeapons: fullCountWeapons.filter((w) => w.type === 'melee'),
        });
      }
      for (const [count, weapons] of reducedByCount) {
        groups.push({
          id: `default-${count}`,
          name: 'Standard Equipment',
          modelCount: count,
          isPaired: false,
          weapons,
          rangedWeapons: weapons.filter((w) => w.type === 'ranged'),
          meleeWeapons: weapons.filter((w) => w.type === 'melee'),
        });
      }
    }

    // Get weapons by loadout group
    const loadoutGroupIds = [...new Set(selectedUnit.weapons.filter((w) => w.loadoutGroup).map((w) => w.loadoutGroup!))];

    // Check if weaponCounts has any valid entries matching actual loadout choice IDs
    const allChoiceIds = new Set(
      selectedUnit.loadoutOptions?.flatMap((opt) => opt.choices.map((c) => c.id)) || []
    );
    const hasValidCounts = Object.entries(weaponCounts).some(
      ([key, count]) => count > 0 && allChoiceIds.has(key)
    );

    if (!hasValidCounts && hasLoadoutOptions) {
      // No valid weapon selections — fall back to default choices
      for (const option of selectedUnit.loadoutOptions!) {
        if (option.type === 'choice') {
          const defaultChoice = option.choices.find((c) => c.default) || option.choices[0];
          if (defaultChoice) {
            const groupWeapons = selectedUnit.weapons.filter((w) => w.loadoutGroup === defaultChoice.id);
            groups.push({
              id: defaultChoice.id,
              name: defaultChoice.name || defaultChoice.id.replace(/-/g, ' ').replace(/\bsgt\b/g, 'Sergeant').replace(/\b\w/g, c => c.toUpperCase()),
              modelCount: selectedListUnit.modelCount,
              isPaired: defaultChoice.paired || false,
              weapons: groupWeapons,
              rangedWeapons: groupWeapons.filter((w) => w.type === 'ranged'),
              meleeWeapons: groupWeapons.filter((w) => w.type === 'melee'),
            });
          }
        }
      }
    } else {
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
          name: choice?.name || groupId.replace(/-/g, ' ').replace(/\bsgt\b/g, 'Sergeant').replace(/\b\w/g, c => c.toUpperCase()),
          modelCount: effectiveCount,
          isPaired: choice?.paired || false,
          weapons: groupWeapons,
          rangedWeapons: groupWeapons.filter((w) => w.type === 'ranged'),
          meleeWeapons: groupWeapons.filter((w) => w.type === 'melee'),
        });
      }
    }

    // Sort groups: ranged weapons first, then melee-only
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
  const collapsedGroups = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const group of loadoutGroups) {
      map[group.id] = selectedUnitIndex !== null && isLoadoutGroupCollapsed(selectedUnitIndex, group.id);
    }
    return map;
  }, [loadoutGroups, selectedUnitIndex, isLoadoutGroupCollapsed]);

  const activatedGroups = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const group of loadoutGroups) {
      map[group.id] = selectedUnitIndex !== null && isLoadoutGroupActivated(selectedUnitIndex, group.id);
    }
    return map;
  }, [loadoutGroups, selectedUnitIndex, isLoadoutGroupActivated]);

  // Get leader weapons for Play Mode (filtered by leader's loadout selection)
  const leaderWeapons = useMemo((): Weapon[] | undefined => {
    if (!leaderUnit || !leaderListUnit) return undefined;

    const weaponCounts = leaderListUnit.weaponCounts || {};

    // Get weapons without loadoutGroup (always equipped)
    const alwaysEquipped = leaderUnit.weapons.filter((w) => !w.loadoutGroup);

    // Check if weaponCounts has any valid entries matching actual loadout choice IDs
    const allChoiceIds = new Set(
      leaderUnit.loadoutOptions?.flatMap((opt) => opt.choices.map((c) => c.id)) || []
    );
    const hasValidCounts = Object.entries(weaponCounts).some(
      ([key, count]) => count > 0 && allChoiceIds.has(key)
    );

    // Get weapons from loadout groups
    const selectedWeapons: Weapon[] = [];
    const loadoutGroupIds = [...new Set(leaderUnit.weapons.filter((w) => w.loadoutGroup).map((w) => w.loadoutGroup!))];

    const hasLeaderOptions = (leaderUnit.loadoutOptions?.length ?? 0) > 0;

    if (!hasValidCounts && hasLeaderOptions) {
      // No valid weapon selections — fall back to default choices
      for (const option of leaderUnit.loadoutOptions!) {
        if (option.type === 'choice') {
          const defaultChoice = option.choices.find((c) => c.default) || option.choices[0];
          if (defaultChoice) {
            const groupWeapons = leaderUnit.weapons.filter((w) => w.loadoutGroup === defaultChoice.id);
            selectedWeapons.push(...groupWeapons);
          }
        }
      }
    } else {
      for (const groupId of loadoutGroupIds) {
        const count = weaponCounts[groupId] || 0;
        const choice = leaderUnit.loadoutOptions
          ?.flatMap((opt) => opt.choices)
          .find((c) => c.id === groupId);

        if (count === 0 && choice) continue;

        const groupWeapons = leaderUnit.weapons.filter((w) => w.loadoutGroup === groupId);
        selectedWeapons.push(...groupWeapons);
      }
    }

    return [...alwaysEquipped, ...selectedWeapons];
  }, [leaderUnit, leaderListUnit]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleLandingArmySelect = useCallback(async (armyId: string) => {
    await loadArmyData(armyId);
    setShowSetupModal(true);
  }, [loadArmyData]);

  const handleSetupConfirm = useCallback((format: GameFormat, pointsLimit: number, detachment: string) => {
    setFormat(format);
    setPointsLimit(pointsLimit);
    setDetachment(detachment);
    setShowSetupModal(false);
    enterApp();
  }, [setFormat, setPointsLimit, setDetachment, enterApp]);

  const handleStartOver = useCallback(() => {
    resetList();
    resetGameState();
    exitApp();
  }, [resetList, resetGameState, exitApp]);

  const handleModeChange = useCallback((newMode: 'build' | 'play') => {
    if (newMode === 'play' && !canPlay) {
      showError('Fix validation errors before entering Play Mode');
      return;
    }
    selectUnit(null);
    setMode(newMode);
    if (newMode === 'play' && gameState.currentPhase === 'deployment') {
      setShowGameStartModal(true);
    }
  }, [canPlay, selectUnit, setMode, showError, gameState.currentPhase]);

  const handleModeToggle = useCallback(() => {
    const newMode = mode === 'build' ? 'play' : 'build';
    handleModeChange(newMode);
  }, [mode, handleModeChange]);

  const handleToggleReferencePanel = useCallback(() => {
    setShowReferencePanel(prev => !prev);
  }, []);

  const handleKeywordClick = useCallback((keyword: string, type: 'unit' | 'weapon') => {
    setShowReferencePanel(true);
    // Scroll to the keyword entry after panel opens
    requestAnimationFrame(() => {
      const slug = `ref-${type}-${keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      const el = document.getElementById(slug);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Brief highlight effect
        el.classList.add('ring-2', 'ring-accent-400');
        setTimeout(() => el.classList.remove('ring-2', 'ring-accent-400'), 1500);
      }
    });
  }, []);

  const handleAddUnit = useCallback((unit: Unit) => {
    const modelCounts = Object.keys(unit.points).map(Number);
    const defaultModelCount = modelCounts[0];
    addUnit(unit.id, defaultModelCount);
    showSuccess(`Added ${unit.name} to your army`);
  }, [addUnit, showSuccess]);

  const handleOpenDetailModal = useCallback((unit: Unit) => {
    setDetailModalUnit(unit);
  }, []);

  const handleCloseDetailModal = useCallback(() => {
    setDetailModalUnit(null);
  }, []);

  const handleSelectListUnit = useCallback((index: number | null) => {
    selectUnit(index);
  }, [selectUnit]);

  const handleRemoveUnit = useCallback((index: number) => {
    const listUnit = currentList.units[index];
    const unit = listUnit?.unitId ? findUnit(listUnit.unitId) : undefined;
    removeUnit(index);
    if (selectedUnitIndex === index) {
      selectUnit(null);
    } else if (selectedUnitIndex !== null && selectedUnitIndex > index) {
      selectUnit(selectedUnitIndex - 1);
    }
    showSuccess(`Removed ${unit?.name || 'unit'} from your army`);
  }, [currentList.units, removeUnit, selectedUnitIndex, selectUnit, showSuccess, findUnit]);

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


  const handleImport = useCallback(async (data: CurrentList) => {
    // Set army data if needed
    if (data.army && data.army !== currentList.army) {
      await loadArmyData(data.army);
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

  const handleResetGame = useCallback(() => {
    resetGameState();
    resetAllWounds();
    setShowGameStartModal(true);
  }, [resetGameState, resetAllWounds]);

  const handleDiscardSecondary = useCallback((id: string) => {
    discardSecondaryMission(id);
    setShowSecondaryMissionModal(true);
  }, [discardSecondaryMission]);

  const handleRandomizeSecondaries = useCallback(() => {
    const discarded = gameState.discardedSecondaryMissions ?? [];
    const available = secondaryMissions.filter(m => !discarded.includes(m.id));
    if (available.length < 2) return;
    // Fisher-Yates shuffle and pick 2
    const shuffled = [...available];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setGameSecondaryMissions(shuffled.slice(0, 2).map(m => m.id));
  }, [gameState.discardedSecondaryMissions, secondaryMissions, setGameSecondaryMissions]);

  const handleAdvanceGameState = useCallback(() => {
    // Check if game is at the end (round 5, opponent fight phase)
    const isLastPhase = gameState.currentPhase === 'fight';
    const isOpponentTurn = gameState.playerTurn === 'opponent';
    const isFinalRound = gameState.battleRound >= 5;

    if (isLastPhase && isOpponentTurn && isFinalRound) {
      setShowEndGameModal(true);
      return;
    }

    advanceGameState();
  }, [gameState.currentPhase, gameState.playerTurn, gameState.battleRound, advanceGameState]);

  const handleEndGame = useCallback(async (opponentFaction: string, result: GameResultOutcome) => {
    const primaryMission = primaryMissions.find(m => m.id === gameState.selectedPrimaryMission);

    await saveGame({
      date: new Date().toISOString(),
      army: currentList.army,
      detachment: currentList.detachment,
      format: currentList.format,
      pointsLimit: currentList.pointsLimit,
      opponentFaction,
      result,
      primaryVP: gameState.primaryVP,
      secondaryVP: gameState.secondaryVP,
      totalVP: gameState.primaryVP + gameState.secondaryVP,
      primaryMissionName: primaryMission?.name ?? '',
      listSnapshot: currentList,
    });

    setShowEndGameModal(false);
    showSuccess('Game result saved!');
    resetGameState();
    setMode('build');
  }, [gameState, currentList, primaryMissions, saveGame, resetGameState, setMode, showSuccess]);

  const handleTwistSelect = useCallback((twistId: string | null) => {
    if (twistId) {
      // Ensure this twist is the active one (toggleTwist already handles single-twist logic)
      const currentActive = gameState.activeTwists?.[0] || null;
      if (currentActive !== twistId) {
        if (currentActive) clearActiveTwists();
        toggleTwist(twistId);
      }
    } else {
      clearActiveTwists();
    }
    setShowTwistModal(false);
  }, [gameState.activeTwists, clearActiveTwists, toggleTwist]);

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
      <>
        <LandingPage
          onSelectArmy={handleLandingArmySelect}
          isLoading={isArmyLoading}
        />
        {armyData && (
          <SetupModal
            isOpen={showSetupModal}
            onConfirm={handleSetupConfirm}
            detachments={Object.entries(armyData.detachments).map(([id, d]) => ({ id, name: d.name }))}
            defaultDetachment={Object.keys(armyData.detachments)[0] || ''}
          />
        )}
      </>
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
    <div className="flex flex-col min-h-screen md:h-screen overflow-x-hidden">
      {/* Navigation */}
      <Navigation
        mode={mode}
        onModeToggle={handleModeToggle}
        canPlay={canPlay}
        mobilePanel={effectiveMobilePanel}
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
        onAdvance={handleAdvanceGameState}
        onToggleTurn={togglePlayerTurn}
        onReset={handleResetGame}
        showReferencePanel={showReferencePanel}
        onToggleReferencePanel={handleToggleReferencePanel}
        onSave={handleOpenSaveModal}
        onLoad={() => openModal('load')}
        onImport={() => openModal('import')}
        onExport={handleExport}
        onClear={resetList}
        onStartOver={handleStartOver}
        canExport={currentList.units.length > 0}
        canClear={currentList.units.length > 0}
      />

      {/* Spacer for fixed nav on mobile */}
      <div className="h-14 md:hidden shrink-0" />

      {/* Main Content */}
      <main className="flex-1 md:overflow-hidden">
        {mode === 'build' ? (
          <BuildMode
            listName={currentList.name}
            currentPoints={totalPoints}
            pointsLimit={currentList.pointsLimit}
            onNameChange={setListName}
            detachments={
              armyData
                ? Object.entries(armyData.detachments).map(([id, d]) => ({
                    id,
                    name: d.name,
                    ruleDescription: d.rules[0]?.description,
                  }))
                : []
            }
            selectedDetachment={currentList.detachment}
            onDetachmentChange={setDetachment}
            selectedFormat={currentList.format}
            onFormatChange={(format: GameFormat) => setFormat(format)}
            onPointsLimitChange={setPointsLimit}
            validationErrors={listValidation.validateList().errors}
            mobilePanel={effectiveMobilePanel}
            leftPanel={
              armyData && (
                <ArmyListPanel
                  armyData={armyData}
                  currentList={currentList}
                  onSelectUnit={handleSelectListUnit}
                  onRemoveUnit={handleRemoveUnit}
                  onModelCountChange={updateUnitModelCount}
                  onEnhancementChange={setUnitEnhancement}
                  onWeaponCountChange={(index, choiceId, count) => setWeaponCount(index, choiceId, count)}
                  getAvailableLeaders={leaderAttachment.getAvailableLeaders}
                  isUnitAttachedAsLeader={leaderAttachment.isUnitAttachedAsLeader}
                  getAttachedToUnitName={(index) => leaderAttachment.getAttachedToUnit(index)?.name}
                  canHaveLeaderAttached={leaderAttachment.canHaveLeaderAttached}
                  getAttachedLeaderName={(index) => leaderAttachment.getAttachedLeader(index)?.name}
                  onAttachLeader={leaderAttachment.attachLeader}
                  onDetachLeader={leaderAttachment.detachLeader}
                  onSetWarlord={setWarlord}
                  unitIndicesWithErrors={listValidation.unitIndicesWithErrors}
                />
              )
            }
            rosterPanel={
              armyData && (
                <UnitRosterPanel
                  units={allUnits}
                  onAddUnit={handleAddUnit}
                  onOpenDetail={handleOpenDetailModal}
                  isLoading={isArmyLoading}
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
            onAdvance={handleAdvanceGameState}
            onReset={handleResetGame}
            onEndGame={() => setShowEndGameModal(true)}
            activeTwistName={missionTwists.find(t => t.id === gameState.activeTwists?.[0])?.name ?? null}
            onChangeTwist={() => setShowTwistModal(true)}
            selectedUnitName={selectedUnit ? (
              attachedLeaderInfo
                ? `${selectedUnit.name} + ${leaderUnit?.name || ''}`
                : selectedUnit.name
            ) : undefined}
            onDeselectUnit={() => selectUnit(null)}
            onModeToggle={() => handleModeChange('build')}
            canPlay={canPlay}
            validationErrors={listValidation.validateList().errors}
            mobilePanel={effectiveMobilePanel}
            leftPanel={
              armyData && (
                <ArmyOverviewPanel
                  armyData={armyData}
                  units={currentList.units}
                  selectedUnitIndex={selectedUnitIndex}
                  detachmentId={currentList.detachment}
                  onSelectUnit={(index) => selectUnit(index)}
                  onUnitWoundChange={setUnitWounds}
                  onLeaderWoundChange={setLeaderWounds}
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
                activeTwistName={missionTwists.find(t => t.id === gameState.activeTwists?.[0])?.name ?? null}
                onChangeTwist={() => setShowTwistModal(true)}
                activeRuleChoices={gameState.activeRuleChoices ?? {}}
                onSetRuleChoice={setRuleChoice}
                armyData={armyData}
                detachmentId={currentList.detachment}
                currentPhase={gameState.currentPhase}
                selectedDeployment={deployments.find(d => d.id === gameState.selectedDeployment) ?? null}
                selectedPrimaryMission={primaryMissions.find(m => m.id === gameState.selectedPrimaryMission) ?? null}
                selectedSecondaryMissions={secondaryMissions.filter(m => (gameState.selectedSecondaryMissions ?? []).includes(m.id))}
                scoredConditions={gameState.scoredConditions ?? {}}
                currentRound={gameState.battleRound}
                onScoreCondition={scoreCondition}
                onUnscoreCondition={unscoreCondition}
                onDiscardSecondary={handleDiscardSecondary}
                onChangeSecondaries={() => setShowSecondaryMissionModal(true)}
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
                    [
                      ...(armyData?.detachments[currentList.detachment]?.stratagems || []),
                      ...(armyData?.coreStratagems || []),
                    ].map(s => [s.id, s.name])
                  )}
                  activeStratagemData={
                    [
                      ...(armyData?.detachments[currentList.detachment]?.stratagems || []),
                      ...(armyData?.coreStratagems || []),
                    ].filter(
                      s => gameState.activeStratagems.includes(s.id)
                    )
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
                  currentPhase={gameState.currentPhase}
                  onKeywordClick={handleKeywordClick}
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
            {/* Stratagems (Detachment + Core) */}
            {(armyData.detachments[currentList.detachment]?.stratagems || armyData.coreStratagems) && (
              <div>
                <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wide mb-3">
                  Stratagems
                </h4>
                <div className="space-y-2">
                  {[
                    ...(armyData.detachments[currentList.detachment]?.stratagems || []),
                    ...(armyData.coreStratagems || []),
                  ].map((strat) => (
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
                    <div key={kw.name} id={`ref-weapon-${kw.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="bg-black/20 rounded-lg p-3 transition-all duration-300">
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
                    <div key={kw.name} id={`ref-unit-${kw.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="bg-black/20 rounded-lg p-3 transition-all duration-300">
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

      {/* Unit Detail Modal (Build Mode) */}
      <UnitDetailModal
        unit={detailModalUnit}
        isOpen={detailModalUnit !== null}
        onClose={handleCloseDetailModal}
        onAddUnit={handleAddUnit}
      />

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
          onMigrationComplete={handleMigrationComplete}
        />
      )}

      {/* End Game Modal */}
      <EndGameModal
        isOpen={showEndGameModal}
        onClose={() => setShowEndGameModal(false)}
        primaryVP={gameState.primaryVP}
        secondaryVP={gameState.secondaryVP}
        primaryMissionName={primaryMissions.find(m => m.id === gameState.selectedPrimaryMission)?.name ?? ''}
        onConfirm={handleEndGame}
      />

      {/* Game Start Modal (Play Mode entry / Reset) */}
      <GameStartModal
        isOpen={showGameStartModal}
        onClose={() => {
          setShowGameStartModal(false);
          // Show deployment phase reminders now that game setup is done
          const reminders = getPhaseReminders(
            gameState.currentPhase,
            gameState.battleRound,
            armyData,
            currentList.units,
            currentList.detachment,
            gameState,
          );
          if (reminders.length > 0) {
            setPhaseReminders(reminders);
            setShowPhaseModal(true);
          }
        }}
        goingFirst={gameState.goingFirst}
        onGoingFirstChange={setGoingFirst}
        isAttacker={gameState.isAttacker}
        onIsAttackerChange={setIsAttacker}
        deployments={deployments}
        selectedDeploymentId={gameState.selectedDeployment ?? null}
        onDeploymentSelect={setSelectedDeployment}
        twists={missionTwists}
        activeTwistId={gameState.activeTwists?.[0] || null}
        onTwistSelect={handleTwistSelect}
        primaryMissions={primaryMissions}
        selectedPrimaryMissionId={gameState.selectedPrimaryMission ?? null}
        onPrimaryMissionSelect={setSelectedPrimaryMission}
        detachmentSelected={!!currentList.detachment}
        warlordDesignated={currentList.units.some(u => u.isWarlord)}
        enhancementsAssigned={
          !armyData || !currentList.detachment
            ? true
            : (() => {
                const det = armyData.detachments[currentList.detachment];
                if (!det?.enhancements?.length) return true;
                const characters = currentList.units.filter(u => {
                  const unit = armyData.units.find(d => d.id === u.unitId);
                  return unit?.keywords?.includes('Character');
                });
                return characters.length === 0 || characters.some(u => !!u.enhancement);
              })()
        }
        format={currentList.format}
      />

      {/* Secondary Mission Selection Modal (command phase) */}
      <SecondaryMissionModal
        isOpen={showSecondaryMissionModal}
        onClose={() => setShowSecondaryMissionModal(false)}
        secondaryMissions={secondaryMissions}
        selectedSecondaryMissionIds={gameState.selectedSecondaryMissions ?? []}
        discardedSecondaryMissionIds={gameState.discardedSecondaryMissions ?? []}
        onSecondaryMissionToggle={toggleSecondaryMission}
        onRandomize={handleRandomizeSecondaries}
      />

      {/* Twist Selection Modal (mid-game twist change) */}
      <TwistSelectionModal
        isOpen={showTwistModal}
        onClose={() => setShowTwistModal(false)}
        twists={missionTwists}
        activeTwistId={gameState.activeTwists?.[0] || null}
        onSelect={handleTwistSelect}
      />

      {/* Phase Transition Reminders Modal */}
      <PhaseTransitionModal
        isOpen={showPhaseModal}
        onClose={() => setShowPhaseModal(false)}
        phase={gameState.currentPhase}
        reminders={phaseReminders}
      />

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
