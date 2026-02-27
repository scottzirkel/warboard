import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ArmyData,
  CurrentList,
  ListUnit,
  GameFormat,
  Unit,
} from '@/types';
import { GAME_FORMATS } from '@/types';

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
  { id: 'blacktemplars', name: 'Black Templars', file: 'blacktemplars.json' },
  { id: 'custodes', name: 'Adeptus Custodes', file: 'custodes.json' },
  { id: 'chaosmarines', name: 'Chaos Space Marines', file: 'chaosmarines.json' },
  { id: 'necrons', name: 'Necrons', file: 'necrons.json' },
  { id: 'orks', name: 'Orks', file: 'orks.json' },
  { id: 'spacemarines', name: 'Ultramarines', file: 'spacemarines.json' },
  { id: 'tau', name: "T'au Empire", file: 'tau.json' },
  { id: 'tyranids', name: 'Tyranids', file: 'tyranids.json' },
];

// ============================================================================
// Default List State
// ============================================================================

const createDefaultList = (): CurrentList => ({
  name: '',
  army: 'custodes',
  pointsLimit: 2000,
  format: 'strike-force',
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
// Warlord Auto-Selection Helper
// ============================================================================

const WARLORD_FORMATS: GameFormat[] = ['colosseum', 'strike-force'];

/**
 * Auto-select warlord if there's exactly one valid candidate.
 * Returns updated units array, or the same array if no change needed.
 */
function autoSelectWarlord(units: ListUnit[], format: GameFormat, armyData: ArmyData | null): ListUnit[] {
  if (!armyData || !WARLORD_FORMATS.includes(format)) return units;

  const alreadyHasWarlord = units.some(u => u.isWarlord);
  if (alreadyHasWarlord) return units;

  const candidates: number[] = [];

  for (let i = 0; i < units.length; i++) {
    const unit = armyData.units.find(u => u.id === units[i].unitId);
    if (!unit) continue;

    const isChar = unit.keywords.includes('Character');
    const isEpic = unit.keywords.includes('Epic Hero');

    if (isChar && !isEpic) {
      candidates.push(i);
    }
  }

  if (candidates.length === 1) {
    return units.map((u, i) => i === candidates[0] ? { ...u, isWarlord: true } : u);
  }

  return units;
}

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

  // Warlord Selection
  setWarlord: (index: number) => void;

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

export const useArmyStore = create<ArmyStore>()(
  persist(
    (set, get) => ({
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

      set(state => {
        // Only keep the current detachment if it exists in the new army's data
        const currentDetachment = state.currentList.detachment;
        const detachmentValid = currentDetachment && detachmentKeys.includes(currentDetachment);

        return {
          armyData: data,
          isLoading: false,
          currentList: {
            ...state.currentList,
            army: armyId,
            detachment: detachmentValid ? currentDetachment : defaultDetachment,
          },
        };
      });
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
    const formatConfig = GAME_FORMATS.find(f => f.id === format);

    set(state => {
      // For non-custom formats, set the fixed points value
      // For custom, keep the current points limit
      const newPointsLimit = formatConfig?.points ?? state.currentList.pointsLimit;

      return {
        currentList: {
          ...state.currentList,
          format,
          pointsLimit: newPointsLimit,
        },
      };
    });
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
    const { armyData } = get();

    // Migrate legacy list data and initialize weapon defaults
    const migratedUnits = list.units.map(unit => {
      let weaponCounts = unit.weaponCounts || {};

      if (armyData) {
        // Check regular units first, then allies
        let unitDef = armyData.units.find(u => u.id === unit.unitId);
        if (!unitDef && armyData.allies) {
          for (const faction of Object.values(armyData.allies)) {
            unitDef = faction.units?.find(u => u.id === unit.unitId);
            if (unitDef) break;
          }
        }

        if (unitDef?.loadoutOptions) {
          // Collect valid choice IDs from current data
          const validChoiceIds = new Set<string>();
          for (const option of unitDef.loadoutOptions) {
            for (const choice of option.choices) {
              if (choice.id !== 'none') {
                validChoiceIds.add(choice.id);
              }
            }
          }

          // Check if saved weaponCounts has stale keys that don't match current data
          const savedKeys = Object.keys(weaponCounts);
          const hasStaleKeys = savedKeys.length === 0 ||
            savedKeys.some(key => !validChoiceIds.has(key));

          if (hasStaleKeys) {
            weaponCounts = {};

            // Initialize all choices to 0
            for (const choiceId of validChoiceIds) {
              weaponCounts[choiceId] = 0;
            }

            // Set default for 'choice' type options
            for (const option of unitDef.loadoutOptions) {
              if (option.type === 'choice') {
                const defaultChoice = option.choices.find(c => c.default) || option.choices[0];

                if (defaultChoice && defaultChoice.id !== 'none') {
                  weaponCounts[defaultChoice.id] = unit.modelCount;
                }
              }
            }
          }
        }
      }

      return {
        ...unit,
        weaponCounts,
        currentWounds: unit.currentWounds ?? null,
        leaderCurrentWounds: unit.leaderCurrentWounds ?? null,
        attachedLeader: unit.attachedLeader ?? null,
      };
    });

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

    // Check regular units first, then allies
    let unit = armyData?.units.find(u => u.id === unitId);
    if (!unit && armyData?.allies) {
      for (const faction of Object.values(armyData.allies)) {
        unit = faction.units?.find(u => u.id === unitId);
        if (unit) break;
      }
    }

    if (!unit) {
      return;
    }

    // Initialize weapon counts with all choices at 0, then set defaults
    const weaponCounts: Record<string, number> = {};

    if (unit.loadoutOptions && unit.loadoutOptions.length > 0) {
      // First, initialize all choices to 0
      for (const option of unit.loadoutOptions) {
        for (const choice of option.choices) {
          if (choice.id !== 'none') {
            weaponCounts[choice.id] = 0;
          }
        }
      }

      // Then set default choice to full model count
      const mainOption = unit.loadoutOptions.find(o => o.type === 'choice') || unit.loadoutOptions[0];

      if (mainOption) {
        const defaultChoice = mainOption.choices.find(c => c.default) || mainOption.choices[0];

        if (defaultChoice && defaultChoice.id !== 'none') {
          weaponCounts[defaultChoice.id] = modelCount;
        }
      }
    }

    const newUnit: ListUnit = {
      ...createDefaultListUnit(unitId, modelCount),
      weaponCounts,
    };

    set(state => {
      const units = autoSelectWarlord(
        [...state.currentList.units, newUnit],
        state.currentList.format,
        state.armyData,
      );

      return {
        currentList: {
          ...state.currentList,
          units,
        },
      };
    });
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
          units: autoSelectWarlord(updatedUnits, state.currentList.format, state.armyData),
        },
      };
    });
  },

  updateUnitModelCount: (index: number, newCount: number) => {
    const { armyData, currentList } = get();
    const listUnit = currentList.units[index];

    if (!listUnit || !armyData) {
      return;
    }

    const unit = armyData.units.find(u => u.id === listUnit.unitId);

    if (!unit) {
      return;
    }

    const oldCount = listUnit.modelCount;

    // If no weapon counts yet, initialize them
    if (!listUnit.weaponCounts || Object.keys(listUnit.weaponCounts).length === 0) {
      const weaponCounts: Record<string, number> = {};

      if (unit.loadoutOptions && unit.loadoutOptions.length > 0) {
        for (const option of unit.loadoutOptions) {
          for (const choice of option.choices) {
            if (choice.id !== 'none') {
              weaponCounts[choice.id] = 0;
            }
          }
        }

        const mainOption = unit.loadoutOptions.find(o => o.type === 'choice') || unit.loadoutOptions[0];

        if (mainOption) {
          const defaultChoice = mainOption.choices.find(c => c.default) || mainOption.choices[0];

          if (defaultChoice && defaultChoice.id !== 'none') {
            weaponCounts[defaultChoice.id] = newCount;
          }
        }
      }

      set(state => {
        const units = [...state.currentList.units];
        units[index] = { ...units[index], modelCount: newCount, weaponCounts };

        return { currentList: { ...state.currentList, units } };
      });

      return;
    }

    // Calculate current total weapon count
    const total = Object.values(listUnit.weaponCounts).reduce((sum, c) => sum + c, 0);

    const newWeaponCounts = { ...listUnit.weaponCounts };

    if (newCount < oldCount) {
      // Reducing models - cap each weapon count and adjust to fit
      let excess = total - newCount;

      for (const [choiceId, count] of Object.entries(newWeaponCounts)) {
        if (excess > 0 && count > 0) {
          const reduction = Math.min(count, excess);
          newWeaponCounts[choiceId] = count - reduction;
          excess -= reduction;
        }
      }
    } else if (newCount > oldCount) {
      // Adding models - add to the default weapon
      const options = unit.loadoutOptions || [];
      const mainOption = options.find(o => o.type === 'choice') || options[0];

      if (mainOption) {
        const defaultChoice = mainOption.choices.find(c => c.default) || mainOption.choices[0];

        if (defaultChoice && defaultChoice.id !== 'none') {
          const diff = newCount - total;
          newWeaponCounts[defaultChoice.id] = (newWeaponCounts[defaultChoice.id] || 0) + diff;
        }
      }
    }

    set(state => {
      const units = [...state.currentList.units];
      units[index] = { ...units[index], modelCount: newCount, weaponCounts: newWeaponCounts };

      return { currentList: { ...state.currentList, units } };
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

      // Build new weapon counts
      let newWeaponCounts = {
        ...currentUnit.weaponCounts,
        [choiceId]: newCount,
      };

      // For single-model units, enforce mutual exclusivity
      // When selecting one weapon, zero out all others
      if (currentUnit.modelCount === 1 && newCount === 1) {
        newWeaponCounts = Object.keys(newWeaponCounts).reduce((acc, key) => {
          acc[key] = key === choiceId ? newCount : 0;
          return acc;
        }, {} as Record<string, number>);
      }

      units[index] = {
        ...currentUnit,
        weaponCounts: newWeaponCounts,
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

    // Find the choice being modified and check constraints
    let excludesFromOption: string | undefined;
    if (unit.loadoutOptions) {
      for (const option of unit.loadoutOptions) {
        const choice = option.choices.find(c => c.id === choiceId);

        if (choice) {
          if (choice.maxModels !== undefined) {
            newCount = Math.min(newCount, choice.maxModels);
          }
          excludesFromOption = choice.excludesFromOption;
          break;
        }
      }
    }

    set(state => {
      const units = [...state.currentList.units];
      const currentUnit = units[index];

      if (!currentUnit) {
        return state;
      }

      const currentCount = currentUnit.weaponCounts?.[choiceId] || 0;
      const delta = newCount - currentCount;

      // Build new weapon counts
      let newWeaponCounts = {
        ...currentUnit.weaponCounts,
        [choiceId]: newCount,
      };

      // If this choice excludes models from another option (e.g., Vexilla excludes from main-weapon),
      // automatically reduce the default choice in that option
      if (excludesFromOption && delta !== 0 && unit.loadoutOptions) {
        const targetOption = unit.loadoutOptions.find(o => o.id === excludesFromOption);
        if (targetOption) {
          // Find the default choice or the one with the highest count
          const defaultChoice = targetOption.choices.find(c => c.default);
          if (defaultChoice) {
            const currentDefaultCount = newWeaponCounts[defaultChoice.id] || 0;
            const adjustedDefaultCount = Math.max(0, currentDefaultCount - delta);
            newWeaponCounts[defaultChoice.id] = adjustedDefaultCount;
          }
        }
      }

      // For single-model units, enforce mutual exclusivity
      // When selecting one weapon, zero out all others
      if (currentUnit.modelCount === 1 && newCount === 1) {
        newWeaponCounts = Object.keys(newWeaponCounts).reduce((acc, key) => {
          acc[key] = key === choiceId ? newCount : 0;
          return acc;
        }, {} as Record<string, number>);
      }

      units[index] = {
        ...currentUnit,
        weaponCounts: newWeaponCounts,
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
  // Warlord Selection Actions
  // -------------------------------------------------------------------------

  setWarlord: (index: number) => {
    set(state => {
      const units = state.currentList.units.map((unit, i) => ({
        ...unit,
        isWarlord: i === index ? !unit.isWarlord : false,
      }));

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
}),
    {
      name: 'army-tracker-state',
      partialize: (state) => ({
        currentList: state.currentList,
      }),
    }
  )
);
