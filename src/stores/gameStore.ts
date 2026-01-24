import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameState } from '@/types';

// ============================================================================
// Default Game State
// ============================================================================

const createDefaultGameState = (): GameState => ({
  battleRound: 1,
  commandPoints: 0,
  activeStratagems: [],
  activeTwists: [],
  katah: null,
  collapsedLoadoutGroups: {},
  activatedLoadoutGroups: {},
  collapsedLeaders: {},
  activatedLeaders: {},
  loadoutCasualties: {},
});

// ============================================================================
// Store Interface
// ============================================================================

interface GameStoreState {
  gameState: GameState;
}

interface GameStoreActions {
  // Battle Round
  setBattleRound: (round: number) => void;
  nextRound: () => void;
  prevRound: () => void;

  // Command Points
  setCommandPoints: (cp: number) => void;
  adjustCommandPoints: (delta: number) => void;

  // Stratagems
  activateStratagem: (stratagemId: string) => void;
  deactivateStratagem: (stratagemId: string) => void;
  toggleStratagem: (stratagemId: string) => void;
  clearActiveStratagems: () => void;

  // Mission Twists (Chapter Approved)
  toggleTwist: (twistId: string) => void;
  clearActiveTwists: () => void;

  // Martial Ka'tah (Custodes army rule)
  setKatah: (katah: string | null) => void;

  // Loadout Group Collapse State
  isLoadoutGroupCollapsed: (unitIndex: number, groupId: string) => boolean;
  toggleLoadoutGroupCollapsed: (unitIndex: number, groupId: string) => void;
  setLoadoutGroupCollapsed: (unitIndex: number, groupId: string, collapsed: boolean) => void;

  // Loadout Group Activation State
  isLoadoutGroupActivated: (unitIndex: number, groupId: string) => boolean;
  toggleLoadoutGroupActivated: (unitIndex: number, groupId: string) => void;
  setLoadoutGroupActivated: (unitIndex: number, groupId: string, activated: boolean) => void;

  // Leader Collapse State
  isLeaderCollapsed: (unitIndex: number) => boolean;
  toggleLeaderCollapsed: (unitIndex: number) => void;
  setLeaderCollapsed: (unitIndex: number, collapsed: boolean) => void;

  // Leader Activation State
  isLeaderActivated: (unitIndex: number) => boolean;
  toggleLeaderActivated: (unitIndex: number) => void;
  setLeaderActivated: (unitIndex: number, activated: boolean) => void;

  // Loadout Casualties (tracking which weapon profiles lost models)
  getLoadoutCasualties: (unitIndex: number, groupId: string) => number;
  setLoadoutCasualties: (unitIndex: number, groupId: string, count: number) => void;
  incrementLoadoutCasualties: (unitIndex: number, groupId: string) => void;
  decrementLoadoutCasualties: (unitIndex: number, groupId: string) => void;
  resetUnitCasualties: (unitIndex: number) => void;

  // Activation State Reset
  resetActivationState: () => void;

  // Full Reset
  resetGameState: () => void;
}

type GameStore = GameStoreState & GameStoreActions;

// ============================================================================
// Store Implementation
// ============================================================================

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
  // Initial State
  gameState: createDefaultGameState(),

  // -------------------------------------------------------------------------
  // Battle Round Actions
  // -------------------------------------------------------------------------

  setBattleRound: (round: number) => {
    const clampedRound = Math.max(1, Math.min(5, round));
    const previousRound = get().gameState.battleRound;

    set(state => ({
      gameState: {
        ...state.gameState,
        battleRound: clampedRound,
      },
    }));

    // Reset activation state when round changes
    if (clampedRound !== previousRound) {
      get().resetActivationState();
    }
  },

  nextRound: () => {
    const { setBattleRound, gameState } = get();
    setBattleRound(gameState.battleRound + 1);
  },

  prevRound: () => {
    const { setBattleRound, gameState } = get();
    setBattleRound(gameState.battleRound - 1);
  },

  // -------------------------------------------------------------------------
  // Command Points Actions
  // -------------------------------------------------------------------------

  setCommandPoints: (cp: number) => {
    set(state => ({
      gameState: {
        ...state.gameState,
        commandPoints: Math.max(0, cp),
      },
    }));
  },

  adjustCommandPoints: (delta: number) => {
    set(state => ({
      gameState: {
        ...state.gameState,
        commandPoints: Math.max(0, state.gameState.commandPoints + delta),
      },
    }));
  },

  // -------------------------------------------------------------------------
  // Stratagem Actions
  // -------------------------------------------------------------------------

  activateStratagem: (stratagemId: string) => {
    set(state => {
      if (state.gameState.activeStratagems.includes(stratagemId)) {
        return state;
      }

      return {
        gameState: {
          ...state.gameState,
          activeStratagems: [...state.gameState.activeStratagems, stratagemId],
        },
      };
    });
  },

  deactivateStratagem: (stratagemId: string) => {
    set(state => ({
      gameState: {
        ...state.gameState,
        activeStratagems: state.gameState.activeStratagems.filter(id => id !== stratagemId),
      },
    }));
  },

  toggleStratagem: (stratagemId: string) => {
    const { gameState, activateStratagem, deactivateStratagem } = get();

    if (gameState.activeStratagems.includes(stratagemId)) {
      deactivateStratagem(stratagemId);
    } else {
      activateStratagem(stratagemId);
    }
  },

  clearActiveStratagems: () => {
    set(state => ({
      gameState: {
        ...state.gameState,
        activeStratagems: [],
      },
    }));
  },

  // -------------------------------------------------------------------------
  // Mission Twist Actions
  // -------------------------------------------------------------------------

  toggleTwist: (twistId: string) => {
    set(state => {
      const activeTwists = state.gameState.activeTwists || [];
      const isActive = activeTwists.includes(twistId);

      return {
        gameState: {
          ...state.gameState,
          // Only one twist at a time - toggle off if active, otherwise set as the only active twist
          activeTwists: isActive ? [] : [twistId],
        },
      };
    });
  },

  clearActiveTwists: () => {
    set(state => ({
      gameState: {
        ...state.gameState,
        activeTwists: [],
      },
    }));
  },

  // -------------------------------------------------------------------------
  // Martial Ka'tah Actions
  // -------------------------------------------------------------------------

  setKatah: (katah: string | null) => {
    set(state => ({
      gameState: {
        ...state.gameState,
        katah,
      },
    }));
  },

  // -------------------------------------------------------------------------
  // Loadout Group Collapse State Actions
  // -------------------------------------------------------------------------

  isLoadoutGroupCollapsed: (unitIndex: number, groupId: string): boolean => {
    const { gameState } = get();

    return gameState.collapsedLoadoutGroups[unitIndex]?.[groupId] ?? false;
  },

  toggleLoadoutGroupCollapsed: (unitIndex: number, groupId: string) => {
    const isCollapsed = get().isLoadoutGroupCollapsed(unitIndex, groupId);
    get().setLoadoutGroupCollapsed(unitIndex, groupId, !isCollapsed);
  },

  setLoadoutGroupCollapsed: (unitIndex: number, groupId: string, collapsed: boolean) => {
    set(state => ({
      gameState: {
        ...state.gameState,
        collapsedLoadoutGroups: {
          ...state.gameState.collapsedLoadoutGroups,
          [unitIndex]: {
            ...state.gameState.collapsedLoadoutGroups[unitIndex],
            [groupId]: collapsed,
          },
        },
      },
    }));
  },

  // -------------------------------------------------------------------------
  // Loadout Group Activation State Actions
  // -------------------------------------------------------------------------

  isLoadoutGroupActivated: (unitIndex: number, groupId: string): boolean => {
    const { gameState } = get();

    return gameState.activatedLoadoutGroups[unitIndex]?.[groupId] ?? false;
  },

  toggleLoadoutGroupActivated: (unitIndex: number, groupId: string) => {
    const isActivated = get().isLoadoutGroupActivated(unitIndex, groupId);
    get().setLoadoutGroupActivated(unitIndex, groupId, !isActivated);

    // Auto-collapse when activated
    if (!isActivated) {
      get().setLoadoutGroupCollapsed(unitIndex, groupId, true);
    }
  },

  setLoadoutGroupActivated: (unitIndex: number, groupId: string, activated: boolean) => {
    set(state => ({
      gameState: {
        ...state.gameState,
        activatedLoadoutGroups: {
          ...state.gameState.activatedLoadoutGroups,
          [unitIndex]: {
            ...state.gameState.activatedLoadoutGroups[unitIndex],
            [groupId]: activated,
          },
        },
      },
    }));
  },

  // -------------------------------------------------------------------------
  // Leader Collapse State Actions
  // -------------------------------------------------------------------------

  isLeaderCollapsed: (unitIndex: number): boolean => {
    const { gameState } = get();

    return gameState.collapsedLeaders[unitIndex] ?? false;
  },

  toggleLeaderCollapsed: (unitIndex: number) => {
    const isCollapsed = get().isLeaderCollapsed(unitIndex);
    get().setLeaderCollapsed(unitIndex, !isCollapsed);
  },

  setLeaderCollapsed: (unitIndex: number, collapsed: boolean) => {
    set(state => ({
      gameState: {
        ...state.gameState,
        collapsedLeaders: {
          ...state.gameState.collapsedLeaders,
          [unitIndex]: collapsed,
        },
      },
    }));
  },

  // -------------------------------------------------------------------------
  // Leader Activation State Actions
  // -------------------------------------------------------------------------

  isLeaderActivated: (unitIndex: number): boolean => {
    const { gameState } = get();

    return gameState.activatedLeaders[unitIndex] ?? false;
  },

  toggleLeaderActivated: (unitIndex: number) => {
    const isActivated = get().isLeaderActivated(unitIndex);
    get().setLeaderActivated(unitIndex, !isActivated);

    // Auto-collapse when activated
    if (!isActivated) {
      get().setLeaderCollapsed(unitIndex, true);
    }
  },

  setLeaderActivated: (unitIndex: number, activated: boolean) => {
    set(state => ({
      gameState: {
        ...state.gameState,
        activatedLeaders: {
          ...state.gameState.activatedLeaders,
          [unitIndex]: activated,
        },
      },
    }));
  },

  // -------------------------------------------------------------------------
  // Loadout Casualties Actions
  // -------------------------------------------------------------------------

  getLoadoutCasualties: (unitIndex: number, groupId: string): number => {
    const { gameState } = get();
    return gameState.loadoutCasualties?.[unitIndex]?.[groupId] ?? 0;
  },

  setLoadoutCasualties: (unitIndex: number, groupId: string, count: number) => {
    set(state => ({
      gameState: {
        ...state.gameState,
        loadoutCasualties: {
          ...(state.gameState.loadoutCasualties || {}),
          [unitIndex]: {
            ...(state.gameState.loadoutCasualties?.[unitIndex] || {}),
            [groupId]: Math.max(0, count),
          },
        },
      },
    }));
  },

  incrementLoadoutCasualties: (unitIndex: number, groupId: string) => {
    const current = get().getLoadoutCasualties(unitIndex, groupId);
    get().setLoadoutCasualties(unitIndex, groupId, current + 1);
  },

  decrementLoadoutCasualties: (unitIndex: number, groupId: string) => {
    const current = get().getLoadoutCasualties(unitIndex, groupId);
    get().setLoadoutCasualties(unitIndex, groupId, current - 1);
  },

  resetUnitCasualties: (unitIndex: number) => {
    set(state => {
      const newCasualties = { ...(state.gameState.loadoutCasualties || {}) };
      delete newCasualties[unitIndex];
      return {
        gameState: {
          ...state.gameState,
          loadoutCasualties: newCasualties,
        },
      };
    });
  },

  // -------------------------------------------------------------------------
  // Activation State Reset
  // -------------------------------------------------------------------------

  resetActivationState: () => {
    set(state => ({
      gameState: {
        ...state.gameState,
        activatedLoadoutGroups: {},
        activatedLeaders: {},
      },
    }));
  },

  // -------------------------------------------------------------------------
  // Full Reset
  // -------------------------------------------------------------------------

  resetGameState: () => {
    set({
      gameState: createDefaultGameState(),
    });
  },
}),
    {
      name: 'army-tracker-game',
      partialize: (state) => ({
        gameState: state.gameState,
      }),
    }
  )
);
