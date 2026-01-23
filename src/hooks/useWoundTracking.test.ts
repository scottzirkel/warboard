import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWoundTracking } from './useWoundTracking';
import type {
  ArmyData,
  Unit,
  ListUnit,
  Detachment,
  Enhancement,
} from '@/types';

// ============================================================================
// Test Fixtures
// ============================================================================

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

const createMockDetachment = (enhancements: Enhancement[] = []): Detachment => ({
  name: 'Test Detachment',
  rules: [],
  stratagems: [],
  enhancements,
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
// Tests
// ============================================================================

describe('useWoundTracking', () => {
  describe('basic unit wound tracking', () => {
    it('calculates total wounds correctly', () => {
      const onSetUnitWounds = vi.fn();
      const onSetLeaderWounds = vi.fn();
      const unit = createMockUnit({ stats: { m: 6, t: 6, sv: '2+', w: 3, ld: '6+', oc: 2 } });
      const listUnit = createMockListUnit({ modelCount: 5 });
      const armyData = createMockArmyData([unit]);

      const { result } = renderHook(() =>
        useWoundTracking(
          armyData,
          unit,
          listUnit,
          0,
          [listUnit],
          '',
          onSetUnitWounds,
          onSetLeaderWounds
        )
      );

      // 5 models × 3 wounds = 15 total wounds
      expect(result.current.unitWounds.totalWounds).toBe(15);
      expect(result.current.unitWounds.currentWounds).toBe(15);
      expect(result.current.unitWounds.woundsTaken).toBe(0);
    });

    it('handles null currentWounds as full health', () => {
      const onSetUnitWounds = vi.fn();
      const onSetLeaderWounds = vi.fn();
      const unit = createMockUnit({ stats: { m: 6, t: 6, sv: '2+', w: 3, ld: '6+', oc: 2 } });
      const listUnit = createMockListUnit({ currentWounds: null, modelCount: 5 });
      const armyData = createMockArmyData([unit]);

      const { result } = renderHook(() =>
        useWoundTracking(
          armyData,
          unit,
          listUnit,
          0,
          [listUnit],
          '',
          onSetUnitWounds,
          onSetLeaderWounds
        )
      );

      expect(result.current.unitWounds.isFullHealth).toBe(true);
      expect(result.current.unitWounds.currentWounds).toBe(15);
    });

    it('tracks wounds taken correctly', () => {
      const onSetUnitWounds = vi.fn();
      const onSetLeaderWounds = vi.fn();
      const unit = createMockUnit({ stats: { m: 6, t: 6, sv: '2+', w: 3, ld: '6+', oc: 2 } });
      const listUnit = createMockListUnit({ currentWounds: 12, modelCount: 5 }); // 3 damage taken
      const armyData = createMockArmyData([unit]);

      const { result } = renderHook(() =>
        useWoundTracking(
          armyData,
          unit,
          listUnit,
          0,
          [listUnit],
          '',
          onSetUnitWounds,
          onSetLeaderWounds
        )
      );

      expect(result.current.unitWounds.currentWounds).toBe(12);
      expect(result.current.unitWounds.woundsTaken).toBe(3);
      expect(result.current.unitWounds.isFullHealth).toBe(false);
    });
  });

  describe('models alive calculation', () => {
    it('calculates models alive with no damage', () => {
      const onSetUnitWounds = vi.fn();
      const onSetLeaderWounds = vi.fn();
      const unit = createMockUnit({ stats: { m: 6, t: 6, sv: '2+', w: 3, ld: '6+', oc: 2 } });
      const listUnit = createMockListUnit({ modelCount: 5 });
      const armyData = createMockArmyData([unit]);

      const { result } = renderHook(() =>
        useWoundTracking(
          armyData,
          unit,
          listUnit,
          0,
          [listUnit],
          '',
          onSetUnitWounds,
          onSetLeaderWounds
        )
      );

      expect(result.current.unitWounds.modelsAlive).toBe(5);
      expect(result.current.unitWounds.modelCount).toBe(5);
    });

    it('calculates models alive when one model is killed', () => {
      const onSetUnitWounds = vi.fn();
      const onSetLeaderWounds = vi.fn();
      const unit = createMockUnit({ stats: { m: 6, t: 6, sv: '2+', w: 3, ld: '6+', oc: 2 } });
      // 15 total wounds - 12 current = 3 wounds taken = 1 model killed
      const listUnit = createMockListUnit({ currentWounds: 12, modelCount: 5 });
      const armyData = createMockArmyData([unit]);

      const { result } = renderHook(() =>
        useWoundTracking(
          armyData,
          unit,
          listUnit,
          0,
          [listUnit],
          '',
          onSetUnitWounds,
          onSetLeaderWounds
        )
      );

      expect(result.current.unitWounds.modelsAlive).toBe(4);
    });

    it('calculates models alive when multiple models are killed', () => {
      const onSetUnitWounds = vi.fn();
      const onSetLeaderWounds = vi.fn();
      const unit = createMockUnit({ stats: { m: 6, t: 6, sv: '2+', w: 3, ld: '6+', oc: 2 } });
      // 15 total wounds - 6 current = 9 wounds taken = 3 models killed
      const listUnit = createMockListUnit({ currentWounds: 6, modelCount: 5 });
      const armyData = createMockArmyData([unit]);

      const { result } = renderHook(() =>
        useWoundTracking(
          armyData,
          unit,
          listUnit,
          0,
          [listUnit],
          '',
          onSetUnitWounds,
          onSetLeaderWounds
        )
      );

      expect(result.current.unitWounds.modelsAlive).toBe(2);
    });

    it('handles partial damage on a model', () => {
      const onSetUnitWounds = vi.fn();
      const onSetLeaderWounds = vi.fn();
      const unit = createMockUnit({ stats: { m: 6, t: 6, sv: '2+', w: 3, ld: '6+', oc: 2 } });
      // 15 total wounds - 14 current = 1 wound taken (partial damage, no model killed yet)
      const listUnit = createMockListUnit({ currentWounds: 14, modelCount: 5 });
      const armyData = createMockArmyData([unit]);

      const { result } = renderHook(() =>
        useWoundTracking(
          armyData,
          unit,
          listUnit,
          0,
          [listUnit],
          '',
          onSetUnitWounds,
          onSetLeaderWounds
        )
      );

      expect(result.current.unitWounds.modelsAlive).toBe(5);
    });

    it('handles unit destruction', () => {
      const onSetUnitWounds = vi.fn();
      const onSetLeaderWounds = vi.fn();
      const unit = createMockUnit({ stats: { m: 6, t: 6, sv: '2+', w: 3, ld: '6+', oc: 2 } });
      const listUnit = createMockListUnit({ currentWounds: 0, modelCount: 5 });
      const armyData = createMockArmyData([unit]);

      const { result } = renderHook(() =>
        useWoundTracking(
          armyData,
          unit,
          listUnit,
          0,
          [listUnit],
          '',
          onSetUnitWounds,
          onSetLeaderWounds
        )
      );

      expect(result.current.unitWounds.modelsAlive).toBe(0);
      expect(result.current.unitWounds.isDestroyed).toBe(true);
    });
  });

  describe('leader wound tracking', () => {
    it('returns empty leader state when no leader attached', () => {
      const onSetUnitWounds = vi.fn();
      const onSetLeaderWounds = vi.fn();
      const unit = createMockUnit();
      const listUnit = createMockListUnit({ attachedLeader: null });
      const armyData = createMockArmyData([unit]);

      const { result } = renderHook(() =>
        useWoundTracking(
          armyData,
          unit,
          listUnit,
          0,
          [listUnit],
          '',
          onSetUnitWounds,
          onSetLeaderWounds
        )
      );

      expect(result.current.hasAttachedLeader).toBe(false);
      expect(result.current.leaderWounds.totalWounds).toBe(0);
      expect(result.current.leaderWounds.leaderName).toBeNull();
    });

    it('tracks leader wounds when leader is attached', () => {
      const onSetUnitWounds = vi.fn();
      const onSetLeaderWounds = vi.fn();
      const leaderUnit = createMockUnit({
        id: 'shield-captain',
        name: 'Shield-Captain',
        stats: { m: 6, t: 6, sv: '2+', w: 6, ld: '6+', oc: 1 },
        abilities: [{ id: 'leader', name: 'Leader', description: 'Can attach', eligibleUnits: ['test-unit'] }],
      });
      const bodyguardUnit = createMockUnit({ id: 'test-unit', name: 'Test Unit' });

      const leaderListUnit = createMockListUnit({
        unitId: 'shield-captain',
        modelCount: 1,
      });
      const bodyguardListUnit = createMockListUnit({
        unitId: 'test-unit',
        modelCount: 5,
        attachedLeader: { unitIndex: 0 },
      });

      const units = [leaderListUnit, bodyguardListUnit];
      const armyData = createMockArmyData([leaderUnit, bodyguardUnit]);

      const { result } = renderHook(() =>
        useWoundTracking(
          armyData,
          bodyguardUnit,
          bodyguardListUnit,
          1,
          units,
          '',
          onSetUnitWounds,
          onSetLeaderWounds
        )
      );

      expect(result.current.hasAttachedLeader).toBe(true);
      expect(result.current.leaderWounds.totalWounds).toBe(6);
      expect(result.current.leaderWounds.currentWounds).toBe(6);
      expect(result.current.leaderWounds.leaderName).toBe('Shield-Captain');
    });

    it('tracks leader wounds taken separately', () => {
      const onSetUnitWounds = vi.fn();
      const onSetLeaderWounds = vi.fn();
      const leaderUnit = createMockUnit({
        id: 'shield-captain',
        name: 'Shield-Captain',
        stats: { m: 6, t: 6, sv: '2+', w: 6, ld: '6+', oc: 1 },
        abilities: [{ id: 'leader', name: 'Leader', description: 'Can attach', eligibleUnits: ['test-unit'] }],
      });
      const bodyguardUnit = createMockUnit({ id: 'test-unit' });

      const leaderListUnit = createMockListUnit({
        unitId: 'shield-captain',
        modelCount: 1,
      });
      const bodyguardListUnit = createMockListUnit({
        unitId: 'test-unit',
        modelCount: 5,
        attachedLeader: { unitIndex: 0 },
        leaderCurrentWounds: 4, // 2 wounds taken on leader
      });

      const units = [leaderListUnit, bodyguardListUnit];
      const armyData = createMockArmyData([leaderUnit, bodyguardUnit]);

      const { result } = renderHook(() =>
        useWoundTracking(
          armyData,
          bodyguardUnit,
          bodyguardListUnit,
          1,
          units,
          '',
          onSetUnitWounds,
          onSetLeaderWounds
        )
      );

      expect(result.current.leaderWounds.currentWounds).toBe(4);
      expect(result.current.leaderWounds.woundsTaken).toBe(2);
      expect(result.current.leaderWounds.isFullHealth).toBe(false);
    });

    it('detects leader death', () => {
      const onSetUnitWounds = vi.fn();
      const onSetLeaderWounds = vi.fn();
      const leaderUnit = createMockUnit({
        id: 'shield-captain',
        stats: { m: 6, t: 6, sv: '2+', w: 6, ld: '6+', oc: 1 },
      });
      const bodyguardUnit = createMockUnit({ id: 'test-unit' });

      const leaderListUnit = createMockListUnit({
        unitId: 'shield-captain',
        modelCount: 1,
      });
      const bodyguardListUnit = createMockListUnit({
        unitId: 'test-unit',
        modelCount: 5,
        attachedLeader: { unitIndex: 0 },
        leaderCurrentWounds: 0,
      });

      const units = [leaderListUnit, bodyguardListUnit];
      const armyData = createMockArmyData([leaderUnit, bodyguardUnit]);

      const { result } = renderHook(() =>
        useWoundTracking(
          armyData,
          bodyguardUnit,
          bodyguardListUnit,
          1,
          units,
          '',
          onSetUnitWounds,
          onSetLeaderWounds
        )
      );

      expect(result.current.leaderWounds.isDead).toBe(true);
    });
  });

  describe('combined state', () => {
    it('combines unit and leader wounds', () => {
      const onSetUnitWounds = vi.fn();
      const onSetLeaderWounds = vi.fn();
      const leaderUnit = createMockUnit({
        id: 'shield-captain',
        stats: { m: 6, t: 6, sv: '2+', w: 6, ld: '6+', oc: 1 },
      });
      const bodyguardUnit = createMockUnit({
        id: 'test-unit',
        stats: { m: 6, t: 6, sv: '2+', w: 3, ld: '6+', oc: 2 },
      });

      const leaderListUnit = createMockListUnit({
        unitId: 'shield-captain',
        modelCount: 1,
      });
      const bodyguardListUnit = createMockListUnit({
        unitId: 'test-unit',
        modelCount: 5,
        attachedLeader: { unitIndex: 0 },
      });

      const units = [leaderListUnit, bodyguardListUnit];
      const armyData = createMockArmyData([leaderUnit, bodyguardUnit]);

      const { result } = renderHook(() =>
        useWoundTracking(
          armyData,
          bodyguardUnit,
          bodyguardListUnit,
          1,
          units,
          '',
          onSetUnitWounds,
          onSetLeaderWounds
        )
      );

      // Unit: 5 models × 3 wounds = 15
      // Leader: 1 model × 6 wounds = 6
      // Combined: 21
      expect(result.current.combined.combinedTotalWounds).toBe(21);
      expect(result.current.combined.combinedCurrentWounds).toBe(21);
      expect(result.current.combined.combinedModelCount).toBe(6); // 5 + 1
    });

    it('excludes leader from combined when no leader attached', () => {
      const onSetUnitWounds = vi.fn();
      const onSetLeaderWounds = vi.fn();
      const unit = createMockUnit({
        stats: { m: 6, t: 6, sv: '2+', w: 3, ld: '6+', oc: 2 },
      });
      const listUnit = createMockListUnit({ modelCount: 5, attachedLeader: null });
      const armyData = createMockArmyData([unit]);

      const { result } = renderHook(() =>
        useWoundTracking(
          armyData,
          unit,
          listUnit,
          0,
          [listUnit],
          '',
          onSetUnitWounds,
          onSetLeaderWounds
        )
      );

      expect(result.current.combined.combinedTotalWounds).toBe(15);
      expect(result.current.combined.combinedModelCount).toBe(5);
    });
  });

  describe('damage and healing actions', () => {
    it('applies unit damage correctly', () => {
      const onSetUnitWounds = vi.fn();
      const onSetLeaderWounds = vi.fn();
      const unit = createMockUnit({ stats: { m: 6, t: 6, sv: '2+', w: 3, ld: '6+', oc: 2 } });
      const listUnit = createMockListUnit({ currentWounds: 15, modelCount: 5 });
      const armyData = createMockArmyData([unit]);

      const { result } = renderHook(() =>
        useWoundTracking(
          armyData,
          unit,
          listUnit,
          0,
          [listUnit],
          '',
          onSetUnitWounds,
          onSetLeaderWounds
        )
      );

      act(() => {
        result.current.applyUnitDamage(5);
      });

      expect(onSetUnitWounds).toHaveBeenCalledWith(10);
    });

    it('does not allow negative wounds on unit', () => {
      const onSetUnitWounds = vi.fn();
      const onSetLeaderWounds = vi.fn();
      const unit = createMockUnit({ stats: { m: 6, t: 6, sv: '2+', w: 3, ld: '6+', oc: 2 } });
      const listUnit = createMockListUnit({ currentWounds: 3, modelCount: 5 });
      const armyData = createMockArmyData([unit]);

      const { result } = renderHook(() =>
        useWoundTracking(
          armyData,
          unit,
          listUnit,
          0,
          [listUnit],
          '',
          onSetUnitWounds,
          onSetLeaderWounds
        )
      );

      act(() => {
        result.current.applyUnitDamage(10);
      });

      expect(onSetUnitWounds).toHaveBeenCalledWith(0);
    });

    it('heals unit correctly', () => {
      const onSetUnitWounds = vi.fn();
      const onSetLeaderWounds = vi.fn();
      const unit = createMockUnit({ stats: { m: 6, t: 6, sv: '2+', w: 3, ld: '6+', oc: 2 } });
      const listUnit = createMockListUnit({ currentWounds: 10, modelCount: 5 });
      const armyData = createMockArmyData([unit]);

      const { result } = renderHook(() =>
        useWoundTracking(
          armyData,
          unit,
          listUnit,
          0,
          [listUnit],
          '',
          onSetUnitWounds,
          onSetLeaderWounds
        )
      );

      act(() => {
        result.current.healUnit(3);
      });

      expect(onSetUnitWounds).toHaveBeenCalledWith(13);
    });

    it('sets wounds to null when fully healed', () => {
      const onSetUnitWounds = vi.fn();
      const onSetLeaderWounds = vi.fn();
      const unit = createMockUnit({ stats: { m: 6, t: 6, sv: '2+', w: 3, ld: '6+', oc: 2 } });
      const listUnit = createMockListUnit({ currentWounds: 14, modelCount: 5 });
      const armyData = createMockArmyData([unit]);

      const { result } = renderHook(() =>
        useWoundTracking(
          armyData,
          unit,
          listUnit,
          0,
          [listUnit],
          '',
          onSetUnitWounds,
          onSetLeaderWounds
        )
      );

      act(() => {
        result.current.healUnit(10); // Heals beyond max
      });

      expect(onSetUnitWounds).toHaveBeenCalledWith(null);
    });

    it('applies leader damage correctly', () => {
      const onSetUnitWounds = vi.fn();
      const onSetLeaderWounds = vi.fn();
      const leaderUnit = createMockUnit({
        id: 'shield-captain',
        stats: { m: 6, t: 6, sv: '2+', w: 6, ld: '6+', oc: 1 },
      });
      const bodyguardUnit = createMockUnit({ id: 'test-unit' });

      const leaderListUnit = createMockListUnit({
        unitId: 'shield-captain',
        modelCount: 1,
      });
      const bodyguardListUnit = createMockListUnit({
        unitId: 'test-unit',
        modelCount: 5,
        attachedLeader: { unitIndex: 0 },
        leaderCurrentWounds: 6,
      });

      const units = [leaderListUnit, bodyguardListUnit];
      const armyData = createMockArmyData([leaderUnit, bodyguardUnit]);

      const { result } = renderHook(() =>
        useWoundTracking(
          armyData,
          bodyguardUnit,
          bodyguardListUnit,
          1,
          units,
          '',
          onSetUnitWounds,
          onSetLeaderWounds
        )
      );

      act(() => {
        result.current.applyLeaderDamage(3);
      });

      expect(onSetLeaderWounds).toHaveBeenCalledWith(3);
    });

    it('does not apply leader damage when no leader attached', () => {
      const onSetUnitWounds = vi.fn();
      const onSetLeaderWounds = vi.fn();
      const unit = createMockUnit();
      const listUnit = createMockListUnit({ attachedLeader: null });
      const armyData = createMockArmyData([unit]);

      const { result } = renderHook(() =>
        useWoundTracking(
          armyData,
          unit,
          listUnit,
          0,
          [listUnit],
          '',
          onSetUnitWounds,
          onSetLeaderWounds
        )
      );

      act(() => {
        result.current.applyLeaderDamage(3);
      });

      expect(onSetLeaderWounds).not.toHaveBeenCalled();
    });
  });

  describe('reset actions', () => {
    it('resets unit wounds', () => {
      const onSetUnitWounds = vi.fn();
      const onSetLeaderWounds = vi.fn();
      const unit = createMockUnit();
      const listUnit = createMockListUnit({ currentWounds: 10 });
      const armyData = createMockArmyData([unit]);

      const { result } = renderHook(() =>
        useWoundTracking(
          armyData,
          unit,
          listUnit,
          0,
          [listUnit],
          '',
          onSetUnitWounds,
          onSetLeaderWounds
        )
      );

      act(() => {
        result.current.resetUnitWounds();
      });

      expect(onSetUnitWounds).toHaveBeenCalledWith(null);
    });

    it('resets leader wounds', () => {
      const onSetUnitWounds = vi.fn();
      const onSetLeaderWounds = vi.fn();
      const unit = createMockUnit();
      const listUnit = createMockListUnit();
      const armyData = createMockArmyData([unit]);

      const { result } = renderHook(() =>
        useWoundTracking(
          armyData,
          unit,
          listUnit,
          0,
          [listUnit],
          '',
          onSetUnitWounds,
          onSetLeaderWounds
        )
      );

      act(() => {
        result.current.resetLeaderWounds();
      });

      expect(onSetLeaderWounds).toHaveBeenCalledWith(null);
    });

    it('resets all wounds', () => {
      const onSetUnitWounds = vi.fn();
      const onSetLeaderWounds = vi.fn();
      const unit = createMockUnit();
      const listUnit = createMockListUnit({ currentWounds: 10, leaderCurrentWounds: 3 });
      const armyData = createMockArmyData([unit]);

      const { result } = renderHook(() =>
        useWoundTracking(
          armyData,
          unit,
          listUnit,
          0,
          [listUnit],
          '',
          onSetUnitWounds,
          onSetLeaderWounds
        )
      );

      act(() => {
        result.current.resetAllWounds();
      });

      expect(onSetUnitWounds).toHaveBeenCalledWith(null);
      expect(onSetLeaderWounds).toHaveBeenCalledWith(null);
    });
  });

  describe('stat modifiers integration', () => {
    it('uses modified wounds from enhancements', () => {
      const onSetUnitWounds = vi.fn();
      const onSetLeaderWounds = vi.fn();
      const enhancement = createMockEnhancement({
        id: 'wounds-enhancement',
        name: 'Auric Mantle',
        modifiers: [
          { stat: 'w', operation: 'add', value: 2, scope: 'model' },
        ],
      });

      const detachment = createMockDetachment([enhancement]);
      const unit = createMockUnit({ stats: { m: 6, t: 6, sv: '2+', w: 6, ld: '6+', oc: 1 } });
      const listUnit = createMockListUnit({
        modelCount: 1,
        enhancement: 'wounds-enhancement',
      });
      const armyData = createMockArmyData([unit], { 'test-detachment': detachment });

      const { result } = renderHook(() =>
        useWoundTracking(
          armyData,
          unit,
          listUnit,
          0,
          [listUnit],
          'test-detachment',
          onSetUnitWounds,
          onSetLeaderWounds
        )
      );

      // Base 6 wounds + 2 from enhancement = 8 wounds
      expect(result.current.unitWounds.totalWounds).toBe(8);
    });
  });

  describe('edge cases', () => {
    it('handles null/undefined data gracefully', () => {
      const onSetUnitWounds = vi.fn();
      const onSetLeaderWounds = vi.fn();

      const { result } = renderHook(() =>
        useWoundTracking(
          null,
          undefined,
          undefined,
          0,
          [],
          '',
          onSetUnitWounds,
          onSetLeaderWounds
        )
      );

      expect(result.current.unitWounds.totalWounds).toBe(0);
      expect(result.current.unitWounds.isDestroyed).toBe(true);
      expect(result.current.hasAttachedLeader).toBe(false);
    });

    it('handles zero model count', () => {
      const onSetUnitWounds = vi.fn();
      const onSetLeaderWounds = vi.fn();
      const unit = createMockUnit();
      const listUnit = createMockListUnit({ modelCount: 0 });
      const armyData = createMockArmyData([unit]);

      const { result } = renderHook(() =>
        useWoundTracking(
          armyData,
          unit,
          listUnit,
          0,
          [listUnit],
          '',
          onSetUnitWounds,
          onSetLeaderWounds
        )
      );

      expect(result.current.unitWounds.totalWounds).toBe(0);
      expect(result.current.unitWounds.modelsAlive).toBe(0);
    });

    it('ignores negative damage', () => {
      const onSetUnitWounds = vi.fn();
      const onSetLeaderWounds = vi.fn();
      const unit = createMockUnit();
      const listUnit = createMockListUnit({ currentWounds: 15, modelCount: 5 });
      const armyData = createMockArmyData([unit]);

      const { result } = renderHook(() =>
        useWoundTracking(
          armyData,
          unit,
          listUnit,
          0,
          [listUnit],
          '',
          onSetUnitWounds,
          onSetLeaderWounds
        )
      );

      act(() => {
        result.current.applyUnitDamage(-5);
      });

      expect(onSetUnitWounds).not.toHaveBeenCalled();
    });

    it('ignores negative healing', () => {
      const onSetUnitWounds = vi.fn();
      const onSetLeaderWounds = vi.fn();
      const unit = createMockUnit();
      const listUnit = createMockListUnit({ currentWounds: 10, modelCount: 5 });
      const armyData = createMockArmyData([unit]);

      const { result } = renderHook(() =>
        useWoundTracking(
          armyData,
          unit,
          listUnit,
          0,
          [listUnit],
          '',
          onSetUnitWounds,
          onSetLeaderWounds
        )
      );

      act(() => {
        result.current.healUnit(-5);
      });

      expect(onSetUnitWounds).not.toHaveBeenCalled();
    });

    it('does not apply damage to destroyed unit', () => {
      const onSetUnitWounds = vi.fn();
      const onSetLeaderWounds = vi.fn();
      const unit = createMockUnit();
      const listUnit = createMockListUnit({ currentWounds: 0, modelCount: 5 });
      const armyData = createMockArmyData([unit]);

      const { result } = renderHook(() =>
        useWoundTracking(
          armyData,
          unit,
          listUnit,
          0,
          [listUnit],
          '',
          onSetUnitWounds,
          onSetLeaderWounds
        )
      );

      act(() => {
        result.current.applyUnitDamage(5);
      });

      expect(onSetUnitWounds).not.toHaveBeenCalled();
    });

    it('does not heal unit already at full health', () => {
      const onSetUnitWounds = vi.fn();
      const onSetLeaderWounds = vi.fn();
      const unit = createMockUnit();
      const listUnit = createMockListUnit({ currentWounds: null, modelCount: 5 }); // Full health
      const armyData = createMockArmyData([unit]);

      const { result } = renderHook(() =>
        useWoundTracking(
          armyData,
          unit,
          listUnit,
          0,
          [listUnit],
          '',
          onSetUnitWounds,
          onSetLeaderWounds
        )
      );

      act(() => {
        result.current.healUnit(5);
      });

      expect(onSetUnitWounds).not.toHaveBeenCalled();
    });
  });
});
