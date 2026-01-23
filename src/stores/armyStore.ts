import { create } from 'zustand';
import type {
  ArmyData,
  CurrentList,
  ListUnit,
  GameFormat,
  Unit,
} from '@/types';

// ============================================================================
// Available Armies Configuration
// ============================================================================

export interface AvailableArmy {
  id: string;
  name: string;
  file: string;
  disabled?: boolean;
}

export const availableArmies: AvailableArmy[] = [
  { id: 'custodes', name: 'Adeptus Custodes', file: 'custodes.json' },
  { id: 'spacemarines', name: 'Space Marines', file: 'spacemarines.json' },
  { id: 'tyranids', name: 'Tyranids', file: 'tyranids.json' },
];

// ============================================================================
// Default List State
// ============================================================================

const createDefaultList = (): CurrentList => ({
  name: '',
  army: 'custodes',
  pointsLimit: 500,
  format: 'standard',
  detachment: '',
  units: [],
});

const createDefaultListUnit = (unitId: string, modelCount: number): ListUnit => ({
  unitId,
  modelCount,
  enhancement: '',
  loadout: {},
  weaponCounts: {},
  currentWounds: null,
  leaderCurrentWounds: null,
  attachedLeader: null,
});

// ============================================================================
// Store Interface
// ============================================================================

interface ArmyStoreState {
  // Data
  armyData: ArmyData | null;
  currentList: CurrentList;
  isLoading: boolean;
  error: string | null;

  // Computed (derived state via getters)
}

interface ArmyStoreActions {
  // Army Data
  loadArmyData: (armyId: string) => Promise<void>;

  // List Management
  setListName: (name: string) => void;
  setPointsLimit: (limit: number) => void;
  setFormat: (format: GameFormat) => void;
  setDetachment: (detachment: string) => void;
  resetList: () => void;
  loadList: (list: CurrentList) => void;

  // Unit Management
  addUnit: (unitId: string, modelCount: number) => void;
  removeUnit: (index: number) => void;
  updateUnitModelCount: (index: number, count: number) => void;
  setUnitEnhancement: (index: number, enhancementId: string) => void;

  // Weapon/Loadout Management
  updateWeaponCount: (index: number, choiceId: string, delta: number) => void;
  setWeaponCount: (index: number, choiceId: string, count: number) => void;

  // Leader Attachment
  attachLeader: (unitIndex: number, leaderIndex: number) => void;
  detachLeader: (unitIndex: number) => void;

  // Wound Tracking
  setUnitWounds: (index: number, wounds: number | null) => void;
  setLeaderWounds: (index: number, wounds: number | null) => void;
  resetAllWounds: () => void;

  // Helpers
  getUnitById: (unitId: string) => Unit | undefined;
  getTotalPoints: () => number;
}

type ArmyStore = ArmyStoreState & ArmyStoreActions;

// ============================================================================
// Store Implementation
// ============================================================================

export const useArmyStore = create<ArmyStore>((set, get) => ({
  // Initial State
  armyData: null,
  currentList: createDefaultList(),
  isLoading: false,
  error: null,

  // -------------------------------------------------------------------------
  // Army Data Actions
  // -------------------------------------------------------------------------

  loadArmyData: async (armyId: string) => {
    const army = availableArmies.find(a => a.id === armyId);

    if (!army) {
      set({ error: `Unknown army: ${armyId}` });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const response = await fetch(`/data/${army.file}`);

      if (!response.ok) {
        throw new Error(`Failed to load army data: ${response.statusText}`);
      }

      const data: ArmyData = await response.json();

      // Set default detachment if available
      const detachmentKeys = Object.keys(data.detachments || {});
      const defaultDetachment = detachmentKeys[0] || '';

      set(state => ({
        armyData: data,
        isLoading: false,
        currentList: {
          ...state.currentList,
          army: armyId,
          detachment: state.currentList.detachment || defaultDetachment,
        },
      }));
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load army data',
      });
    }
  },

  // -------------------------------------------------------------------------
  // List Management Actions
  // -------------------------------------------------------------------------

  setListName: (name: string) => {
    set(state => ({
      currentList: { ...state.currentList, name },
    }));
  },

  setPointsLimit: (limit: number) => {
    set(state => ({
      currentList: { ...state.currentList, pointsLimit: limit },
    }));
  },

  setFormat: (format: GameFormat) => {
    set(state => ({
      currentList: { ...state.currentList, format },
    }));
  },

  setDetachment: (detachment: string) => {
    set(state => ({
      currentList: { ...state.currentList, detachment },
    }));
  },

  resetList: () => {
    const { armyData } = get();
    const detachmentKeys = Object.keys(armyData?.detachments || {});
    const defaultDetachment = detachmentKeys[0] || '';

    set(state => ({
      currentList: {
        ...createDefaultList(),
        army: state.currentList.army,
        detachment: defaultDetachment,
      },
    }));
  },

  loadList: (list: CurrentList) => {
    // Migrate legacy list data if needed
    const migratedUnits = list.units.map(unit => ({
      ...unit,
      weaponCounts: unit.weaponCounts || {},
      currentWounds: unit.currentWounds ?? null,
      leaderCurrentWounds: unit.leaderCurrentWounds ?? null,
      attachedLeader: unit.attachedLeader ?? null,
    }));

    set({
      currentList: {
        ...list,
        units: migratedUnits,
      },
    });
  },

  // -------------------------------------------------------------------------
  // Unit Management Actions
  // -------------------------------------------------------------------------

  addUnit: (unitId: string, modelCount: number) => {
    const { armyData } = get();
    const unit = armyData?.units.find(u => u.id === unitId);

    if (!unit) {
      return;
    }

    // Initialize weapon counts with defaults
    const weaponCounts: Record<string, number> = {};

    if (unit.loadoutOptions) {
      for (const option of unit.loadoutOptions) {
        const defaultChoice = option.choices.find(c => c.default);

        if (defaultChoice) {
          weaponCounts[defaultChoice.id] = modelCount;
        }
      }
    }

    const newUnit: ListUnit = {
      ...createDefaultListUnit(unitId, modelCount),
      weaponCounts,
    };

    set(state => ({
      currentList: {
        ...state.currentList,
        units: [...state.currentList.units, newUnit],
      },
    }));
  },

  removeUnit: (index: number) => {
    set(state => {
      const units = [...state.currentList.units];

      // First, detach any leaders attached to this unit
      const removedUnit = units[index];

      if (removedUnit?.attachedLeader) {
        // The leader will remain in the list but unattached
      }

      // Also detach this unit if it's attached as a leader somewhere
      units.forEach((unit, i) => {
        if (unit.attachedLeader?.unitIndex === index) {
          units[i] = { ...unit, attachedLeader: null };
        }
      });

      // Remove the unit
      units.splice(index, 1);

      // Update leader attachment indices for units after the removed one
      const updatedUnits = units.map(unit => {
        if (unit.attachedLeader && unit.attachedLeader.unitIndex > index) {
          return {
            ...unit,
            attachedLeader: { unitIndex: unit.attachedLeader.unitIndex - 1 },
          };
        }

        return unit;
      });

      return {
        currentList: {
          ...state.currentList,
          units: updatedUnits,
        },
      };
    });
  },

  updateUnitModelCount: (index: number, count: number) => {
    set(state => {
      const units = [...state.currentList.units];
      const unit = units[index];

      if (!unit) {
        return state;
      }

      units[index] = { ...unit, modelCount: count };

      return {
        currentList: {
          ...state.currentList,
          units,
        },
      };
    });
  },

  setUnitEnhancement: (index: number, enhancementId: string) => {
    set(state => {
      const units = [...state.currentList.units];
      const unit = units[index];

      if (!unit) {
        return state;
      }

      units[index] = { ...unit, enhancement: enhancementId };

      return {
        currentList: {
          ...state.currentList,
          units,
        },
      };
    });
  },

  // -------------------------------------------------------------------------
  // Weapon/Loadout Management Actions
  // -------------------------------------------------------------------------

  updateWeaponCount: (index: number, choiceId: string, delta: number) => {
    const { armyData, currentList } = get();
    const listUnit = currentList.units[index];

    if (!listUnit || !armyData) {
      return;
    }

    const unit = armyData.units.find(u => u.id === listUnit.unitId);

    if (!unit) {
      return;
    }

    const currentCount = listUnit.weaponCounts?.[choiceId] || 0;
    let newCount = currentCount + delta;

    // Clamp to valid range
    newCount = Math.max(0, newCount);
    newCount = Math.min(newCount, listUnit.modelCount);

    // Check maxModels constraint
    if (unit.loadoutOptions) {
      for (const option of unit.loadoutOptions) {
        const choice = option.choices.find(c => c.id === choiceId);

        if (choice?.maxModels !== undefined) {
          newCount = Math.min(newCount, choice.maxModels);
        }
      }
    }

    set(state => {
      const units = [...state.currentList.units];
      const currentUnit = units[index];

      if (!currentUnit) {
        return state;
      }

      units[index] = {
        ...currentUnit,
        weaponCounts: {
          ...currentUnit.weaponCounts,
          [choiceId]: newCount,
        },
      };

      return {
        currentList: {
          ...state.currentList,
          units,
        },
      };
    });
  },

  setWeaponCount: (index: number, choiceId: string, count: number) => {
    const { armyData, currentList } = get();
    const listUnit = currentList.units[index];

    if (!listUnit || !armyData) {
      return;
    }

    const unit = armyData.units.find(u => u.id === listUnit.unitId);

    if (!unit) {
      return;
    }

    let newCount = count;

    // Clamp to valid range
    newCount = Math.max(0, newCount);
    newCount = Math.min(newCount, listUnit.modelCount);

    // Check maxModels constraint
    if (unit.loadoutOptions) {
      for (const option of unit.loadoutOptions) {
        const choice = option.choices.find(c => c.id === choiceId);

        if (choice?.maxModels !== undefined) {
          newCount = Math.min(newCount, choice.maxModels);
        }
      }
    }

    set(state => {
      const units = [...state.currentList.units];
      const currentUnit = units[index];

      if (!currentUnit) {
        return state;
      }

      units[index] = {
        ...currentUnit,
        weaponCounts: {
          ...currentUnit.weaponCounts,
          [choiceId]: newCount,
        },
      };

      return {
        currentList: {
          ...state.currentList,
          units,
        },
      };
    });
  },

  // -------------------------------------------------------------------------
  // Leader Attachment Actions
  // -------------------------------------------------------------------------

  attachLeader: (unitIndex: number, leaderIndex: number) => {
    set(state => {
      const units = [...state.currentList.units];

      // First, detach the leader from any current attachment
      units.forEach((unit, i) => {
        if (unit.attachedLeader?.unitIndex === leaderIndex) {
          units[i] = { ...unit, attachedLeader: null };
        }
      });

      // Attach leader to the target unit
      const targetUnit = units[unitIndex];

      if (targetUnit) {
        units[unitIndex] = {
          ...targetUnit,
          attachedLeader: { unitIndex: leaderIndex },
        };
      }

      return {
        currentList: {
          ...state.currentList,
          units,
        },
      };
    });
  },

  detachLeader: (unitIndex: number) => {
    set(state => {
      const units = [...state.currentList.units];
      const unit = units[unitIndex];

      if (!unit) {
        return state;
      }

      units[unitIndex] = { ...unit, attachedLeader: null };

      return {
        currentList: {
          ...state.currentList,
          units,
        },
      };
    });
  },

  // -------------------------------------------------------------------------
  // Wound Tracking Actions
  // -------------------------------------------------------------------------

  setUnitWounds: (index: number, wounds: number | null) => {
    set(state => {
      const units = [...state.currentList.units];
      const unit = units[index];

      if (!unit) {
        return state;
      }

      units[index] = { ...unit, currentWounds: wounds };

      return {
        currentList: {
          ...state.currentList,
          units,
        },
      };
    });
  },

  setLeaderWounds: (index: number, wounds: number | null) => {
    set(state => {
      const units = [...state.currentList.units];
      const unit = units[index];

      if (!unit) {
        return state;
      }

      units[index] = { ...unit, leaderCurrentWounds: wounds };

      return {
        currentList: {
          ...state.currentList,
          units,
        },
      };
    });
  },

  resetAllWounds: () => {
    set(state => ({
      currentList: {
        ...state.currentList,
        units: state.currentList.units.map(unit => ({
          ...unit,
          currentWounds: null,
          leaderCurrentWounds: null,
        })),
      },
    }));
  },

  // -------------------------------------------------------------------------
  // Helper Methods
  // -------------------------------------------------------------------------

  getUnitById: (unitId: string): Unit | undefined => {
    const { armyData } = get();

    return armyData?.units.find(u => u.id === unitId);
  },

  getTotalPoints: (): number => {
    const { armyData, currentList } = get();

    if (!armyData) {
      return 0;
    }

    let total = 0;

    for (const listUnit of currentList.units) {
      const unit = armyData.units.find(u => u.id === listUnit.unitId);

      if (!unit) {
        continue;
      }

      // Get base points for model count
      const modelCountKey = String(listUnit.modelCount);
      const basePoints = unit.points[modelCountKey] || 0;
      total += basePoints;

      // Add enhancement points if applicable
      if (listUnit.enhancement && currentList.detachment) {
        const detachment = armyData.detachments[currentList.detachment];
        const enhancement = detachment?.enhancements?.find(
          e => e.id === listUnit.enhancement
        );

        if (enhancement) {
          total += enhancement.points;
        }
      }
    }

    return total;
  },
}));
