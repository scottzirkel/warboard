import type { CurrentList } from '../src/types';

/**
 * A known-good Custodes army list with mixed loadouts for testing.
 *
 * Units:
 *   0: Shield-Captain (1 model, Castellan Axe, Auric Mantle enhancement, Warlord)
 *   1: Custodian Guard (5 models, 3 Guardian Spear + 2 Sentinel Blade/Shield, 1 Vexilla)
 *   2: Vertus Praetors (3 models, Hurricane Bolter loadout)
 *   3: Blade Champion (1 model, default Vaultswords)
 *
 * Shield-Captain attached as leader to Custodian Guard (unit index 1).
 */
export const TEST_LIST: CurrentList = {
  name: 'E2E Test Custodes',
  army: 'custodes',
  pointsLimit: 1000,
  format: 'incursion',
  detachment: 'shield_host',
  units: [
    // 0: Shield-Captain — Castellan Axe, Auric Mantle, Warlord, attached to unit 1
    {
      unitId: 'shield-captain',
      modelCount: 1,
      enhancement: 'auric-mantle',
      weaponCounts: { 'castellan-axe': 1 },
      currentWounds: null,
      leaderCurrentWounds: null,
      attachedLeader: null, // This unit IS the leader
      isWarlord: true,
    },
    // 1: Custodian Guard — 3 Spears + 2 Sentinel Blades, 1 Vexilla, leader attached
    {
      unitId: 'custodian-guard',
      modelCount: 5,
      enhancement: '',
      weaponCounts: {
        'guardian-spear': 3,
        'sentinel-blade-praesidium-shield': 2,
        'vexilla-praesidium-shield-misericordia': 1,
      },
      currentWounds: null,
      leaderCurrentWounds: null,
      attachedLeader: { unitIndex: 0 }, // Shield-Captain
    },
    // 2: Vertus Praetors — Hurricane Bolters
    {
      unitId: 'vertus-praetors',
      modelCount: 3,
      enhancement: '',
      weaponCounts: { 'hurricane-bolter': 3 },
      currentWounds: null,
      leaderCurrentWounds: null,
      attachedLeader: null,
    },
    // 3: Blade Champion — default Vaultswords (no loadout choice needed)
    {
      unitId: 'blade-champion',
      modelCount: 1,
      enhancement: '',
      weaponCounts: {},
      currentWounds: null,
      leaderCurrentWounds: null,
      attachedLeader: null,
    },
  ],
};

/**
 * Expected display data for each unit in Play Mode.
 * Used to verify units render correctly after loading the test list.
 */
export const EXPECTED_PLAY_UNITS = [
  // Unit index 0: Shield-Captain (attached as leader to Guard — hidden from overview as standalone)
  // Unit index 1: Custodian Guard + Shield-Captain (combined display)
  {
    listIndex: 1,
    displayName: 'Custodian Guard + Shield-Captain',
    stats: { m: 6, t: 6, sv: '2+', w: 3, ld: '6+', oc: 2 },
    invuln: '4+',
    totalModels: 6, // 5 guard + 1 leader
    enhancementName: 'Auric Mantle',
    hasWeapons: true,
    isWarlord: true,
  },
  // Unit index 2: Vertus Praetors
  {
    listIndex: 2,
    displayName: 'Vertus Praetors',
    stats: { m: 12, t: 7, sv: '2+', w: 5, ld: '6+', oc: 2 },
    invuln: '4+',
    totalModels: 3,
    enhancementName: null,
    hasWeapons: true,
    isWarlord: false,
  },
  // Unit index 3: Blade Champion
  {
    listIndex: 3,
    displayName: 'Blade Champion',
    stats: { m: 6, t: 6, sv: '2+', w: 6, ld: '6+', oc: 2 },
    invuln: '4+',
    totalModels: 1,
    enhancementName: null,
    hasWeapons: true,
    isWarlord: false,
  },
];

/**
 * Seeds the browser's localStorage with the Zustand state needed
 * to have the test list loaded and the app in build mode for Custodes.
 */
export function buildLocalStorageState(list: CurrentList) {
  return {
    // Zustand army store persistence key
    'army-tracker-state': JSON.stringify({
      state: { currentList: list },
      version: 0,
    }),
    // Zustand UI store persistence key
    'army-tracker-ui': JSON.stringify({
      state: {
        hasEnteredApp: true,
        mode: 'build',
        selectedUnitIndex: null,
        mobilePanel: 'list',
      },
      version: 0,
    }),
    // Guest saved lists (localStorage)
    'army-tracker-saved-lists': JSON.stringify({
      lists: {
        'e2e-test-custodes.json': list,
      },
    }),
  };
}
