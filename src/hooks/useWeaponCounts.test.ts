import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useWeaponCounts,
  calculateDefaultWeaponCounts,
  validateWeaponCounts,
} from './useWeaponCounts';
import type { Unit, ListUnit, LoadoutOption } from '@/types';

// ============================================================================
// Test Fixtures
// ============================================================================

const createReplacementOption = (): LoadoutOption => ({
  id: 'main-weapon',
  name: 'Main Weapon',
  type: 'choice',
  pattern: 'replacement',
  choices: [
    { id: 'spears', name: 'Guardian Spears', default: true },
    { id: 'blades', name: 'Sentinel Blades + Shield', paired: true },
  ],
});

const createAdditionOption = (): LoadoutOption => ({
  id: 'vexilla',
  name: 'Vexilla',
  type: 'optional',
  pattern: 'addition',
  choices: [
    { id: 'vexilla-standard', name: 'Vexilla', maxModels: 1 },
  ],
});

const createMockUnit = (loadoutOptions?: LoadoutOption[]): Unit => ({
  id: 'custodian-guard',
  name: 'Custodian Guard',
  points: { '4': 150, '5': 190 },
  stats: { m: 6, t: 6, sv: '2+', w: 3, ld: '6+', oc: 2 },
  invuln: '4+',
  weapons: [],
  loadoutOptions,
  abilities: [],
  keywords: ['Infantry', 'Battleline'],
});

const createMockListUnit = (
  modelCount: number,
  weaponCounts: Record<string, number> = {}
): ListUnit => ({
  unitId: 'custodian-guard',
  modelCount,
  enhancement: '',
  weaponCounts,
  currentWounds: null,
  leaderCurrentWounds: null,
  attachedLeader: null,
});

// ============================================================================
// calculateDefaultWeaponCounts Tests
// ============================================================================

describe('calculateDefaultWeaponCounts', () => {
  it('returns empty object for unit without loadout options', () => {
    const unit = createMockUnit();
    const result = calculateDefaultWeaponCounts(unit, 5);

    expect(result).toEqual({});
  });

  it('sets default choice count to model count', () => {
    const unit = createMockUnit([createReplacementOption()]);
    const result = calculateDefaultWeaponCounts(unit, 5);

    expect(result).toEqual({ spears: 5 });
  });

  it('handles multiple loadout options with defaults', () => {
    const option1: LoadoutOption = {
      id: 'option1',
      name: 'Option 1',
      type: 'choice',
      pattern: 'replacement',
      choices: [
        { id: 'choice1a', name: 'Choice 1A', default: true },
        { id: 'choice1b', name: 'Choice 1B' },
      ],
    };
    const option2: LoadoutOption = {
      id: 'option2',
      name: 'Option 2',
      type: 'choice',
      pattern: 'replacement',
      choices: [
        { id: 'choice2a', name: 'Choice 2A', default: true },
        { id: 'choice2b', name: 'Choice 2B' },
      ],
    };

    const unit = createMockUnit([option1, option2]);
    const result = calculateDefaultWeaponCounts(unit, 3);

    expect(result).toEqual({
      choice1a: 3,
      choice2a: 3,
    });
  });

  it('ignores options without default choices', () => {
    const option: LoadoutOption = {
      id: 'no-default',
      name: 'No Default',
      type: 'optional',
      pattern: 'addition',
      choices: [
        { id: 'optional-choice', name: 'Optional', maxModels: 1 },
      ],
    };

    const unit = createMockUnit([option]);
    const result = calculateDefaultWeaponCounts(unit, 5);

    expect(result).toEqual({});
  });
});

// ============================================================================
// validateWeaponCounts Tests
// ============================================================================

describe('validateWeaponCounts', () => {
  it('returns empty array for valid weapon counts', () => {
    const unit = createMockUnit([createReplacementOption()]);
    const listUnit = createMockListUnit(5, { spears: 5 });

    const errors = validateWeaponCounts(unit, listUnit);

    expect(errors).toEqual([]);
  });

  it('returns error when maxModels constraint is violated', () => {
    const unit = createMockUnit([createAdditionOption()]);
    const listUnit = createMockListUnit(5, { 'vexilla-standard': 3 });

    const errors = validateWeaponCounts(unit, listUnit);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('limited to 1 model(s)');
    expect(errors[0]).toContain('3 assigned');
  });

  it('returns error when replacement total does not equal model count', () => {
    const unit = createMockUnit([createReplacementOption()]);
    const listUnit = createMockListUnit(5, { spears: 3, blades: 1 });

    const errors = validateWeaponCounts(unit, listUnit);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('4 models assigned');
    expect(errors[0]).toContain('unit has 5 models');
  });

  it('returns empty array for unit without loadout options', () => {
    const unit = createMockUnit();
    const listUnit = createMockListUnit(5);

    const errors = validateWeaponCounts(unit, listUnit);

    expect(errors).toEqual([]);
  });
});

// ============================================================================
// useWeaponCounts Hook Tests
// ============================================================================

describe('useWeaponCounts', () => {
  it('returns empty loadoutOptions for undefined unit', () => {
    const onCountChange = vi.fn();
    const listUnit = createMockListUnit(5);

    const { result } = renderHook(() =>
      useWeaponCounts(undefined, listUnit, onCountChange)
    );

    expect(result.current.loadoutOptions).toEqual([]);
  });

  it('returns correct loadout option state', () => {
    const onCountChange = vi.fn();
    const unit = createMockUnit([createReplacementOption()]);
    const listUnit = createMockListUnit(5, { spears: 5 });

    const { result } = renderHook(() =>
      useWeaponCounts(unit, listUnit, onCountChange)
    );

    expect(result.current.loadoutOptions).toHaveLength(1);

    const optionState = result.current.loadoutOptions[0];

    expect(optionState.isReplacement).toBe(true);
    expect(optionState.isAddition).toBe(false);
    expect(optionState.totalAssigned).toBe(5);
    expect(optionState.choices).toHaveLength(2);
    expect(optionState.choices[0].choiceId).toBe('spears');
    expect(optionState.choices[0].count).toBe(5);
    expect(optionState.choices[0].isDefault).toBe(true);
  });

  it('setCount clamps to valid range', () => {
    const onCountChange = vi.fn();
    const unit = createMockUnit([createReplacementOption()]);
    const listUnit = createMockListUnit(5, { spears: 5 });

    const { result } = renderHook(() =>
      useWeaponCounts(unit, listUnit, onCountChange)
    );

    act(() => {
      result.current.setCount('spears', 10);
    });

    // Should be clamped to 5 (model count)
    expect(onCountChange).toHaveBeenCalledWith('spears', 5);
  });

  it('setCount clamps to zero for negative values', () => {
    const onCountChange = vi.fn();
    const unit = createMockUnit([createReplacementOption()]);
    const listUnit = createMockListUnit(5, { spears: 5 });

    const { result } = renderHook(() =>
      useWeaponCounts(unit, listUnit, onCountChange)
    );

    act(() => {
      result.current.setCount('spears', -5);
    });

    expect(onCountChange).toHaveBeenCalledWith('spears', 0);
  });

  it('setCount respects maxModels constraint', () => {
    const onCountChange = vi.fn();
    const unit = createMockUnit([createAdditionOption()]);
    const listUnit = createMockListUnit(5, {});

    const { result } = renderHook(() =>
      useWeaponCounts(unit, listUnit, onCountChange)
    );

    act(() => {
      result.current.setCount('vexilla-standard', 5);
    });

    // Should be clamped to maxModels: 1
    expect(onCountChange).toHaveBeenCalledWith('vexilla-standard', 1);
  });

  it('setCount handles mutual exclusivity for replacement patterns', () => {
    const onCountChange = vi.fn();
    const unit = createMockUnit([createReplacementOption()]);
    const listUnit = createMockListUnit(5, { spears: 3, blades: 0 });

    const { result } = renderHook(() =>
      useWeaponCounts(unit, listUnit, onCountChange)
    );

    // Try to set blades to 4 when spears is already 3
    // Max available should be 5 - 3 = 2
    act(() => {
      result.current.setCount('blades', 4);
    });

    expect(onCountChange).toHaveBeenCalledWith('blades', 2);
  });

  it('adjustCount increments correctly', () => {
    const onCountChange = vi.fn();
    const unit = createMockUnit([createReplacementOption()]);
    const listUnit = createMockListUnit(5, { spears: 3 });

    const { result } = renderHook(() =>
      useWeaponCounts(unit, listUnit, onCountChange)
    );

    act(() => {
      result.current.adjustCount('spears', 1);
    });

    expect(onCountChange).toHaveBeenCalledWith('spears', 4);
  });

  it('adjustCount decrements correctly', () => {
    const onCountChange = vi.fn();
    const unit = createMockUnit([createReplacementOption()]);
    const listUnit = createMockListUnit(5, { spears: 3 });

    const { result } = renderHook(() =>
      useWeaponCounts(unit, listUnit, onCountChange)
    );

    act(() => {
      result.current.adjustCount('spears', -1);
    });

    expect(onCountChange).toHaveBeenCalledWith('spears', 2);
  });

  it('isAtMaxLimit returns true when at limit', () => {
    const onCountChange = vi.fn();
    const unit = createMockUnit([createAdditionOption()]);
    const listUnit = createMockListUnit(5, { 'vexilla-standard': 1 });

    const { result } = renderHook(() =>
      useWeaponCounts(unit, listUnit, onCountChange)
    );

    expect(result.current.isAtMaxLimit('vexilla-standard')).toBe(true);
  });

  it('isAtMaxLimit returns false when not at limit', () => {
    const onCountChange = vi.fn();
    const unit = createMockUnit([createReplacementOption()]);
    const listUnit = createMockListUnit(5, { spears: 3 });

    const { result } = renderHook(() =>
      useWeaponCounts(unit, listUnit, onCountChange)
    );

    expect(result.current.isAtMaxLimit('spears')).toBe(false);
  });

  it('isAtMaxLimit considers mutual exclusivity', () => {
    const onCountChange = vi.fn();
    const unit = createMockUnit([createReplacementOption()]);
    const listUnit = createMockListUnit(5, { spears: 5, blades: 0 });

    const { result } = renderHook(() =>
      useWeaponCounts(unit, listUnit, onCountChange)
    );

    // blades should be at max limit because all models are using spears
    expect(result.current.isAtMaxLimit('blades')).toBe(true);
  });

  it('isAtMinLimit returns true when count is zero', () => {
    const onCountChange = vi.fn();
    const unit = createMockUnit([createReplacementOption()]);
    const listUnit = createMockListUnit(5, { spears: 5, blades: 0 });

    const { result } = renderHook(() =>
      useWeaponCounts(unit, listUnit, onCountChange)
    );

    expect(result.current.isAtMinLimit('blades')).toBe(true);
    expect(result.current.isAtMinLimit('spears')).toBe(false);
  });

  it('getEffectiveMax returns correct value with maxModels', () => {
    const onCountChange = vi.fn();
    const unit = createMockUnit([createAdditionOption()]);
    const listUnit = createMockListUnit(5);

    const { result } = renderHook(() =>
      useWeaponCounts(unit, listUnit, onCountChange)
    );

    // maxModels is 1
    expect(result.current.getEffectiveMax('vexilla-standard')).toBe(1);
  });

  it('getEffectiveMax considers mutual exclusivity', () => {
    const onCountChange = vi.fn();
    const unit = createMockUnit([createReplacementOption()]);
    const listUnit = createMockListUnit(5, { spears: 3 });

    const { result } = renderHook(() =>
      useWeaponCounts(unit, listUnit, onCountChange)
    );

    // 5 - 3 = 2 models available for blades
    expect(result.current.getEffectiveMax('blades')).toBe(2);
  });

  it('validate returns errors for invalid counts', () => {
    const onCountChange = vi.fn();
    const unit = createMockUnit([createAdditionOption()]);
    const listUnit = createMockListUnit(5, { 'vexilla-standard': 3 });

    const { result } = renderHook(() =>
      useWeaponCounts(unit, listUnit, onCountChange)
    );

    const errors = result.current.validate();

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('limited to 1 model(s)');
  });

  it('validate returns empty array for valid counts', () => {
    const onCountChange = vi.fn();
    const unit = createMockUnit([createReplacementOption()]);
    const listUnit = createMockListUnit(5, { spears: 5 });

    const { result } = renderHook(() =>
      useWeaponCounts(unit, listUnit, onCountChange)
    );

    const errors = result.current.validate();

    expect(errors).toEqual([]);
  });

  it('tracks paired choice state correctly', () => {
    const onCountChange = vi.fn();
    const unit = createMockUnit([createReplacementOption()]);
    const listUnit = createMockListUnit(5, { blades: 2 });

    const { result } = renderHook(() =>
      useWeaponCounts(unit, listUnit, onCountChange)
    );

    const bladesChoice = result.current.loadoutOptions[0].choices.find(
      c => c.choiceId === 'blades'
    );

    expect(bladesChoice?.isPaired).toBe(true);
  });
});
