import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useStatModifiers } from './useStatModifiers';
import type {
  ArmyData,
  Unit,
  ListUnit,
  Detachment,
  Enhancement,
  Weapon,
  Stratagem,
  GameState,
} from '@/types';

// ============================================================================
// Test Fixtures
// ============================================================================

const createMockWeapon = (overrides: Partial<Weapon> = {}): Weapon => ({
  id: 'test-weapon',
  name: 'Test Weapon',
  type: 'melee',
  stats: { a: 5, ws: '2+', s: 6, ap: -2, d: 1 },
  abilities: [],
  ...overrides,
});

const createMockUnit = (overrides: Partial<Unit> = {}): Unit => ({
  id: 'test-unit',
  name: 'Test Unit',
  points: { '5': 150 },
  stats: { m: 6, t: 6, sv: '2+', w: 3, ld: '6+', oc: 2 },
  invuln: '4+',
  weapons: [],
  abilities: [],
  keywords: ['Infantry'],
  ...overrides,
});

const createMockListUnit = (overrides: Partial<ListUnit> = {}): ListUnit => ({
  unitId: 'test-unit',
  modelCount: 5,
  enhancement: '',
  weaponCounts: {},
  currentWounds: null,
  leaderCurrentWounds: null,
  attachedLeader: null,
  ...overrides,
});

const createMockEnhancement = (overrides: Partial<Enhancement> = {}): Enhancement => ({
  id: 'test-enhancement',
  name: 'Test Enhancement',
  points: 15,
  description: 'Test description',
  ...overrides,
});

const createMockStratagem = (overrides: Partial<Stratagem> = {}): Stratagem => ({
  id: 'test-stratagem',
  name: 'Test Stratagem',
  cost: 1,
  phase: 'Fight',
  description: 'Test description',
  ...overrides,
});

const createMockDetachment = (
  enhancements: Enhancement[] = [],
  stratagems: Stratagem[] = []
): Detachment => ({
  name: 'Test Detachment',
  rules: [],
  stratagems,
  enhancements,
});

const createMockGameState = (overrides: Partial<GameState> = {}): GameState => ({
  battleRound: 1,
  currentPhase: 'command',
  playerTurn: 'player',
  commandPoints: 0,
  primaryVP: 0,
  secondaryVP: 0,
  activeStratagems: [],
  activeTwists: [],
  stratagemUsage: {},
  katah: null,
  activeRuleChoices: {},
  pendingRoundConfirmations: {},
  collapsedLoadoutGroups: {},
  activatedLoadoutGroups: {},
  collapsedLeaders: {},
  activatedLeaders: {},
  loadoutCasualties: {},
  ...overrides,
});

const createMockArmyData = (
  units: Unit[] = [],
  detachments: Record<string, Detachment> = {}
): ArmyData => ({
  faction: 'Test Faction',
  lastUpdated: '2026-01',
  units,
  detachments,
});

// ============================================================================
// useStatModifiers Tests
// ============================================================================

describe('useStatModifiers', () => {
  describe('basic functionality', () => {
    it('returns empty modifiers when no data provided', () => {
      const { result } = renderHook(() =>
        useStatModifiers(null, undefined, undefined, 0, [], '')
      );

      expect(result.current.modifiers).toEqual([]);
      expect(result.current.modifiedStats.w.hasModifier).toBe(false);
    });

    it('returns base stats when no modifiers present', () => {
      const unit = createMockUnit();
      const listUnit = createMockListUnit();
      const armyData = createMockArmyData([unit]);

      const { result } = renderHook(() =>
        useStatModifiers(armyData, unit, listUnit, 0, [listUnit], '')
      );

      expect(result.current.modifiedStats.w.baseValue).toBe(3);
      expect(result.current.modifiedStats.w.modifiedValue).toBe(3);
      expect(result.current.modifiedStats.w.hasModifier).toBe(false);
    });
  });

  describe('enhancement modifiers', () => {
    it('collects modifiers from enhancement', () => {
      const enhancement = createMockEnhancement({
        id: 'wounds-enhancement',
        name: 'Auric Mantle',
        modifiers: [
          { stat: 'w', operation: 'add', value: 2, scope: 'model' },
        ],
      });

      const detachment = createMockDetachment([enhancement]);
      const unit = createMockUnit();
      const listUnit = createMockListUnit({ enhancement: 'wounds-enhancement' });
      const armyData = createMockArmyData([unit], { 'test-detachment': detachment });

      const { result } = renderHook(() =>
        useStatModifiers(armyData, unit, listUnit, 0, [listUnit], 'test-detachment')
      );

      expect(result.current.modifiers).toHaveLength(1);
      expect(result.current.modifiers[0].sourceName).toBe('Auric Mantle');
      expect(result.current.modifiers[0].sourceType).toBe('enhancement');
    });

    it('applies enhancement modifiers to stats', () => {
      const enhancement = createMockEnhancement({
        id: 'wounds-enhancement',
        modifiers: [
          { stat: 'w', operation: 'add', value: 2, scope: 'model' },
        ],
      });

      const detachment = createMockDetachment([enhancement]);
      const unit = createMockUnit({ stats: { m: 6, t: 6, sv: '2+', w: 6, ld: '6+', oc: 2 } });
      const listUnit = createMockListUnit({ enhancement: 'wounds-enhancement' });
      const armyData = createMockArmyData([unit], { 'test-detachment': detachment });

      const { result } = renderHook(() =>
        useStatModifiers(armyData, unit, listUnit, 0, [listUnit], 'test-detachment')
      );

      expect(result.current.modifiedStats.w.baseValue).toBe(6);
      expect(result.current.modifiedStats.w.modifiedValue).toBe(8);
      expect(result.current.modifiedStats.w.hasModifier).toBe(true);
    });
  });

  describe('weapon modifiers', () => {
    it('collects modifiers from equipped weapons', () => {
      const weapon = createMockWeapon({
        id: 'sentinel-blade',
        name: 'Sentinel Blade',
        loadoutGroup: 'blades',
        modifiers: [
          { stat: 'w', operation: 'add', value: 1, scope: 'model', source: 'Praesidium Shield' },
        ],
      });

      const unit = createMockUnit({ weapons: [weapon] });
      const listUnit = createMockListUnit({ weaponCounts: { blades: 3 } });
      const armyData = createMockArmyData([unit]);

      const { result } = renderHook(() =>
        useStatModifiers(armyData, unit, listUnit, 0, [listUnit], '')
      );

      expect(result.current.modifiers).toHaveLength(1);
      expect(result.current.modifiers[0].sourceName).toBe('Praesidium Shield');
      expect(result.current.modifiers[0].sourceType).toBe('weapon');
    });

    it('does not collect modifiers from unequipped weapons', () => {
      const weapon = createMockWeapon({
        id: 'sentinel-blade',
        loadoutGroup: 'blades',
        modifiers: [
          { stat: 'w', operation: 'add', value: 1, scope: 'model' },
        ],
      });

      const unit = createMockUnit({ weapons: [weapon] });
      const listUnit = createMockListUnit({ weaponCounts: { spears: 5 } }); // Different loadout
      const armyData = createMockArmyData([unit]);

      const { result } = renderHook(() =>
        useStatModifiers(armyData, unit, listUnit, 0, [listUnit], '')
      );

      expect(result.current.modifiers).toHaveLength(0);
    });

    it('collects modifiers from weapons without loadoutGroup', () => {
      const weapon = createMockWeapon({
        id: 'always-equipped',
        modifiers: [
          { stat: 't', operation: 'add', value: 1, scope: 'model' },
        ],
      });

      const unit = createMockUnit({ weapons: [weapon] });
      const listUnit = createMockListUnit();
      const armyData = createMockArmyData([unit]);

      const { result } = renderHook(() =>
        useStatModifiers(armyData, unit, listUnit, 0, [listUnit], '')
      );

      expect(result.current.modifiers).toHaveLength(1);
    });

    it('does not duplicate modifiers from same loadoutGroup', () => {
      const weaponMelee = createMockWeapon({
        id: 'sentinel-blade-melee',
        name: 'Sentinel Blade',
        type: 'melee',
        loadoutGroup: 'blades',
        modifiers: [
          { stat: 'w', operation: 'add', value: 1, scope: 'model', source: 'Praesidium Shield' },
        ],
      });

      const weaponRanged = createMockWeapon({
        id: 'sentinel-blade-ranged',
        name: 'Sentinel Blade',
        type: 'ranged',
        loadoutGroup: 'blades',
        modifiers: [
          { stat: 'w', operation: 'add', value: 1, scope: 'model', source: 'Praesidium Shield' },
        ],
      });

      const unit = createMockUnit({ weapons: [weaponMelee, weaponRanged] });
      const listUnit = createMockListUnit({ weaponCounts: { blades: 3 } });
      const armyData = createMockArmyData([unit]);

      const { result } = renderHook(() =>
        useStatModifiers(armyData, unit, listUnit, 0, [listUnit], '')
      );

      // Should only have one modifier, not two
      expect(result.current.modifiers).toHaveLength(1);
    });
  });

  describe('leader modifiers', () => {
    it('collects unit-scope modifiers from attached leader enhancement', () => {
      const leaderEnhancement = createMockEnhancement({
        id: 'leader-enhancement',
        name: 'Leader Enhancement',
        modifiers: [
          { stat: 't', operation: 'add', value: 1, scope: 'unit' },
        ],
      });

      const detachment = createMockDetachment([leaderEnhancement]);

      const leaderUnit = createMockUnit({
        id: 'shield-captain',
        name: 'Shield-Captain',
        abilities: [{ id: 'leader', name: 'Leader', description: 'Can attach', eligibleUnits: ['test-unit'] }],
      });

      const bodyguardUnit = createMockUnit({ id: 'test-unit', name: 'Test Unit' });

      const leaderListUnit = createMockListUnit({
        unitId: 'shield-captain',
        enhancement: 'leader-enhancement',
      });

      const bodyguardListUnit = createMockListUnit({
        unitId: 'test-unit',
        attachedLeader: { unitIndex: 0 },
      });

      const units = [leaderListUnit, bodyguardListUnit];
      const armyData = createMockArmyData([leaderUnit, bodyguardUnit], { 'test-detachment': detachment });

      const { result } = renderHook(() =>
        useStatModifiers(armyData, bodyguardUnit, bodyguardListUnit, 1, units, 'test-detachment')
      );

      expect(result.current.modifiers).toHaveLength(1);
      expect(result.current.modifiers[0].sourceType).toBe('leaderEnhancement');
    });

    it('does not collect model-scope modifiers from leader enhancement', () => {
      const leaderEnhancement = createMockEnhancement({
        id: 'leader-enhancement',
        modifiers: [
          { stat: 'w', operation: 'add', value: 2, scope: 'model' }, // Model scope - should not apply to attached unit
        ],
      });

      const detachment = createMockDetachment([leaderEnhancement]);

      const leaderUnit = createMockUnit({
        id: 'shield-captain',
        abilities: [{ id: 'leader', name: 'Leader', description: 'Can attach', eligibleUnits: ['test-unit'] }],
      });

      const bodyguardUnit = createMockUnit({ id: 'test-unit' });

      const leaderListUnit = createMockListUnit({
        unitId: 'shield-captain',
        enhancement: 'leader-enhancement',
      });

      const bodyguardListUnit = createMockListUnit({
        unitId: 'test-unit',
        attachedLeader: { unitIndex: 0 },
      });

      const units = [leaderListUnit, bodyguardListUnit];
      const armyData = createMockArmyData([leaderUnit, bodyguardUnit], { 'test-detachment': detachment });

      const { result } = renderHook(() =>
        useStatModifiers(armyData, bodyguardUnit, bodyguardListUnit, 1, units, 'test-detachment')
      );

      // Model scope modifiers from leader should not apply to the attached unit
      expect(result.current.modifiers).toHaveLength(0);
    });
  });

  describe('stat calculation', () => {
    it('applies add operation correctly', () => {
      const enhancement = createMockEnhancement({
        id: 'add-enhancement',
        modifiers: [{ stat: 'w', operation: 'add', value: 2, scope: 'model' }],
      });

      const detachment = createMockDetachment([enhancement]);
      const unit = createMockUnit({ stats: { m: 6, t: 6, sv: '2+', w: 5, ld: '6+', oc: 2 } });
      const listUnit = createMockListUnit({ enhancement: 'add-enhancement' });
      const armyData = createMockArmyData([unit], { 'test-detachment': detachment });

      const { result } = renderHook(() =>
        useStatModifiers(armyData, unit, listUnit, 0, [listUnit], 'test-detachment')
      );

      expect(result.current.modifiedStats.w.modifiedValue).toBe(7);
    });

    it('applies subtract operation correctly', () => {
      const enhancement = createMockEnhancement({
        id: 'subtract-enhancement',
        modifiers: [{ stat: 'oc', operation: 'subtract', value: 1, scope: 'model' }],
      });

      const detachment = createMockDetachment([enhancement]);
      const unit = createMockUnit({ stats: { m: 6, t: 6, sv: '2+', w: 3, ld: '6+', oc: 3 } });
      const listUnit = createMockListUnit({ enhancement: 'subtract-enhancement' });
      const armyData = createMockArmyData([unit], { 'test-detachment': detachment });

      const { result } = renderHook(() =>
        useStatModifiers(armyData, unit, listUnit, 0, [listUnit], 'test-detachment')
      );

      expect(result.current.modifiedStats.oc.modifiedValue).toBe(2);
    });

    it('applies set operation correctly', () => {
      const enhancement = createMockEnhancement({
        id: 'set-enhancement',
        modifiers: [{ stat: 'm', operation: 'set', value: 12, scope: 'model' }],
      });

      const detachment = createMockDetachment([enhancement]);
      const unit = createMockUnit({ stats: { m: 6, t: 6, sv: '2+', w: 3, ld: '6+', oc: 2 } });
      const listUnit = createMockListUnit({ enhancement: 'set-enhancement' });
      const armyData = createMockArmyData([unit], { 'test-detachment': detachment });

      const { result } = renderHook(() =>
        useStatModifiers(armyData, unit, listUnit, 0, [listUnit], 'test-detachment')
      );

      expect(result.current.modifiedStats.m.modifiedValue).toBe(12);
    });

    it('applies multiply operation correctly', () => {
      const enhancement = createMockEnhancement({
        id: 'multiply-enhancement',
        modifiers: [{ stat: 'oc', operation: 'multiply', value: 2, scope: 'model' }],
      });

      const detachment = createMockDetachment([enhancement]);
      const unit = createMockUnit({ stats: { m: 6, t: 6, sv: '2+', w: 3, ld: '6+', oc: 2 } });
      const listUnit = createMockListUnit({ enhancement: 'multiply-enhancement' });
      const armyData = createMockArmyData([unit], { 'test-detachment': detachment });

      const { result } = renderHook(() =>
        useStatModifiers(armyData, unit, listUnit, 0, [listUnit], 'test-detachment')
      );

      expect(result.current.modifiedStats.oc.modifiedValue).toBe(4);
    });

    it('preserves save format (e.g., "2+")', () => {
      const enhancement = createMockEnhancement({
        id: 'save-enhancement',
        modifiers: [{ stat: 'sv', operation: 'add', value: 1, scope: 'model' }],
      });

      const detachment = createMockDetachment([enhancement]);
      const unit = createMockUnit({ stats: { m: 6, t: 6, sv: '2+', w: 3, ld: '6+', oc: 2 } });
      const listUnit = createMockListUnit({ enhancement: 'save-enhancement' });
      const armyData = createMockArmyData([unit], { 'test-detachment': detachment });

      const { result } = renderHook(() =>
        useStatModifiers(armyData, unit, listUnit, 0, [listUnit], 'test-detachment')
      );

      expect(result.current.modifiedStats.sv.modifiedValue).toBe('3+');
    });

    it('stacks multiple modifiers correctly', () => {
      const enhancement = createMockEnhancement({
        id: 'stacking-enhancement',
        modifiers: [{ stat: 'w', operation: 'add', value: 2, scope: 'model' }],
      });

      const weapon = createMockWeapon({
        loadoutGroup: 'blades',
        modifiers: [{ stat: 'w', operation: 'add', value: 1, scope: 'model' }],
      });

      const detachment = createMockDetachment([enhancement]);
      const unit = createMockUnit({
        stats: { m: 6, t: 6, sv: '2+', w: 3, ld: '6+', oc: 2 },
        weapons: [weapon],
      });
      const listUnit = createMockListUnit({
        enhancement: 'stacking-enhancement',
        weaponCounts: { blades: 1 },
      });
      const armyData = createMockArmyData([unit], { 'test-detachment': detachment });

      const { result } = renderHook(() =>
        useStatModifiers(armyData, unit, listUnit, 0, [listUnit], 'test-detachment')
      );

      // Base 3 + 2 (enhancement) + 1 (weapon) = 6
      expect(result.current.modifiedStats.w.modifiedValue).toBe(6);
    });
  });

  describe('helper functions', () => {
    it('getModifiersForStat returns correct modifiers', () => {
      const enhancement = createMockEnhancement({
        id: 'multi-enhancement',
        modifiers: [
          { stat: 'w', operation: 'add', value: 2, scope: 'model' },
          { stat: 't', operation: 'add', value: 1, scope: 'model' },
        ],
      });

      const detachment = createMockDetachment([enhancement]);
      const unit = createMockUnit();
      const listUnit = createMockListUnit({ enhancement: 'multi-enhancement' });
      const armyData = createMockArmyData([unit], { 'test-detachment': detachment });

      const { result } = renderHook(() =>
        useStatModifiers(armyData, unit, listUnit, 0, [listUnit], 'test-detachment')
      );

      const woundModifiers = result.current.getModifiersForStat('w');
      const toughnessModifiers = result.current.getModifiersForStat('t');

      expect(woundModifiers).toHaveLength(1);
      expect(woundModifiers[0].stat).toBe('w');
      expect(toughnessModifiers).toHaveLength(1);
      expect(toughnessModifiers[0].stat).toBe('t');
    });

    it('hasModifiersForStat returns correct boolean', () => {
      const enhancement = createMockEnhancement({
        id: 'wounds-enhancement',
        modifiers: [{ stat: 'w', operation: 'add', value: 2, scope: 'model' }],
      });

      const detachment = createMockDetachment([enhancement]);
      const unit = createMockUnit();
      const listUnit = createMockListUnit({ enhancement: 'wounds-enhancement' });
      const armyData = createMockArmyData([unit], { 'test-detachment': detachment });

      const { result } = renderHook(() =>
        useStatModifiers(armyData, unit, listUnit, 0, [listUnit], 'test-detachment')
      );

      expect(result.current.hasModifiersForStat('w')).toBe(true);
      expect(result.current.hasModifiersForStat('t')).toBe(false);
    });

    it('calculateModifiedValue works for individual stats', () => {
      const enhancement = createMockEnhancement({
        id: 'wounds-enhancement',
        modifiers: [{ stat: 'w', operation: 'add', value: 3, scope: 'model' }],
      });

      const detachment = createMockDetachment([enhancement]);
      const unit = createMockUnit();
      const listUnit = createMockListUnit({ enhancement: 'wounds-enhancement' });
      const armyData = createMockArmyData([unit], { 'test-detachment': detachment });

      const { result } = renderHook(() =>
        useStatModifiers(armyData, unit, listUnit, 0, [listUnit], 'test-detachment')
      );

      expect(result.current.calculateModifiedValue('w', 5)).toBe(8);
      expect(result.current.calculateModifiedValue('t', 6)).toBe(6); // No modifier for T
    });
  });

  describe('modifier source tracking', () => {
    it('provides modifier sources for tooltips', () => {
      const enhancement = createMockEnhancement({
        id: 'wounds-enhancement',
        name: 'Auric Mantle',
        modifiers: [{ stat: 'w', operation: 'add', value: 2, scope: 'model' }],
      });

      const detachment = createMockDetachment([enhancement]);
      const unit = createMockUnit();
      const listUnit = createMockListUnit({ enhancement: 'wounds-enhancement' });
      const armyData = createMockArmyData([unit], { 'test-detachment': detachment });

      const { result } = renderHook(() =>
        useStatModifiers(armyData, unit, listUnit, 0, [listUnit], 'test-detachment')
      );

      const woundStat = result.current.modifiedStats.w;

      expect(woundStat.modifiers).toHaveLength(1);
      expect(woundStat.modifiers[0].name).toBe('Auric Mantle');
      expect(woundStat.modifiers[0].value).toBe(2);
      expect(woundStat.modifiers[0].operation).toBe('add');
    });
  });

  describe('stratagem modifiers', () => {
    it('collects modifiers from active stratagems', () => {
      const stratagem = createMockStratagem({
        id: 'avenge-the-fallen',
        name: 'Avenge the Fallen',
        modifiers: [
          { stat: 'a', operation: 'add', value: 1, scope: 'melee' },
        ],
      });

      const detachment = createMockDetachment([], [stratagem]);
      const unit = createMockUnit();
      const listUnit = createMockListUnit();
      const armyData = createMockArmyData([unit], { 'test-detachment': detachment });
      const gameState = createMockGameState({
        activeStratagems: ['avenge-the-fallen'],
      });

      const { result } = renderHook(() =>
        useStatModifiers(armyData, unit, listUnit, 0, [listUnit], 'test-detachment', gameState)
      );

      expect(result.current.modifiers).toHaveLength(1);
      expect(result.current.modifiers[0].sourceName).toBe('Avenge the Fallen');
      expect(result.current.modifiers[0].sourceType).toBe('stratagem');
    });

    it('does not collect modifiers from inactive stratagems', () => {
      const stratagem = createMockStratagem({
        id: 'avenge-the-fallen',
        modifiers: [
          { stat: 'a', operation: 'add', value: 1, scope: 'melee' },
        ],
      });

      const detachment = createMockDetachment([], [stratagem]);
      const unit = createMockUnit();
      const listUnit = createMockListUnit();
      const armyData = createMockArmyData([unit], { 'test-detachment': detachment });
      const gameState = createMockGameState({
        activeStratagems: [], // No active stratagems
      });

      const { result } = renderHook(() =>
        useStatModifiers(armyData, unit, listUnit, 0, [listUnit], 'test-detachment', gameState)
      );

      expect(result.current.modifiers).toHaveLength(0);
    });

    it('evaluates conditions for stratagem modifiers', () => {
      const stratagem = createMockStratagem({
        id: 'conditional-stratagem',
        name: 'Conditional Stratagem',
        modifiers: [
          { stat: 'a', operation: 'add', value: 1, scope: 'melee', condition: 'below_starting_strength' },
        ],
      });

      const detachment = createMockDetachment([], [stratagem]);
      const unit = createMockUnit({ stats: { m: 6, t: 6, sv: '2+', w: 3, ld: '6+', oc: 2 } });
      const armyData = createMockArmyData([unit], { 'test-detachment': detachment });
      const gameState = createMockGameState({
        activeStratagems: ['conditional-stratagem'],
      });

      // Unit at full strength - condition not met
      const fullStrengthListUnit = createMockListUnit({
        modelCount: 5,
        currentWounds: null, // Full health
      });

      const { result: fullResult } = renderHook(() =>
        useStatModifiers(armyData, unit, fullStrengthListUnit, 0, [fullStrengthListUnit], 'test-detachment', gameState)
      );

      expect(fullResult.current.modifiers).toHaveLength(0); // Condition not met

      // Unit below starting strength - condition met (lost wounds equivalent to 1 model)
      const damagedListUnit = createMockListUnit({
        modelCount: 5,
        currentWounds: 12, // 5 models * 3 wounds = 15 total, 12 remaining = 1 model lost
      });

      const { result: damagedResult } = renderHook(() =>
        useStatModifiers(armyData, unit, damagedListUnit, 0, [damagedListUnit], 'test-detachment', gameState)
      );

      expect(damagedResult.current.modifiers).toHaveLength(1); // Condition met
    });

    it('does not apply game state modifiers without gameState parameter', () => {
      const stratagem = createMockStratagem({
        id: 'avenge-the-fallen',
        modifiers: [
          { stat: 'a', operation: 'add', value: 1, scope: 'melee' },
        ],
      });

      const detachment = createMockDetachment([], [stratagem]);
      const unit = createMockUnit();
      const listUnit = createMockListUnit();
      const armyData = createMockArmyData([unit], { 'test-detachment': detachment });

      // No gameState provided
      const { result } = renderHook(() =>
        useStatModifiers(armyData, unit, listUnit, 0, [listUnit], 'test-detachment')
      );

      expect(result.current.modifiers).toHaveLength(0);
    });
  });
});
