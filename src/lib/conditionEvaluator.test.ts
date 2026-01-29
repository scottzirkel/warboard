import { describe, it, expect } from 'vitest';
import {
  evaluateCondition,
  createUnitConditionState,
  type UnitConditionState,
} from './conditionEvaluator';

// ============================================================================
// Test Fixtures
// ============================================================================

const createTestState = (overrides: Partial<UnitConditionState> = {}): UnitConditionState => ({
  startingModels: 5,
  currentModels: 5,
  woundsPerModel: 3,
  currentWounds: null,
  ...overrides,
});

// ============================================================================
// evaluateCondition Tests
// ============================================================================

describe('evaluateCondition', () => {
  describe('no condition', () => {
    it('returns true when condition is undefined', () => {
      const state = createTestState();

      expect(evaluateCondition(undefined, state)).toBe(true);
    });

    it('returns true when condition is "none"', () => {
      const state = createTestState();

      expect(evaluateCondition('none', state)).toBe(true);
    });
  });

  describe('below_starting_strength', () => {
    it('returns false when unit is at full strength', () => {
      const state = createTestState({
        startingModels: 5,
        currentWounds: null, // Full health
      });

      expect(evaluateCondition('below_starting_strength', state)).toBe(false);
    });

    it('returns true when unit has lost at least one model', () => {
      const state = createTestState({
        startingModels: 5,
        woundsPerModel: 3,
        currentWounds: 12, // 15 - 3 = lost 1 model
      });

      expect(evaluateCondition('below_starting_strength', state)).toBe(true);
    });

    it('returns false when unit has only taken partial damage', () => {
      const state = createTestState({
        startingModels: 5,
        woundsPerModel: 3,
        currentWounds: 14, // Lost 1 wound but no models
      });

      expect(evaluateCondition('below_starting_strength', state)).toBe(false);
    });

    it('handles different condition string formats', () => {
      const state = createTestState({
        startingModels: 5,
        woundsPerModel: 3,
        currentWounds: 12,
      });

      expect(evaluateCondition('below starting strength', state)).toBe(true);
      expect(evaluateCondition('below-starting-strength', state)).toBe(true);
      expect(evaluateCondition('BELOW_STARTING_STRENGTH', state)).toBe(true);
    });
  });

  describe('below_half_strength', () => {
    it('returns false when unit is at full strength', () => {
      const state = createTestState({
        startingModels: 5,
        currentWounds: null,
      });

      expect(evaluateCondition('below_half_strength', state)).toBe(false);
    });

    it('returns false when unit is at exactly half strength', () => {
      const state = createTestState({
        startingModels: 5,
        woundsPerModel: 3,
        currentWounds: 9, // 3 models remaining, ceil(5/2) = 3, so NOT below half
      });

      expect(evaluateCondition('below_half_strength', state)).toBe(false);
    });

    it('returns true when unit is below half strength', () => {
      const state = createTestState({
        startingModels: 5,
        woundsPerModel: 3,
        currentWounds: 6, // 2 models remaining, below ceil(5/2) = 3
      });

      expect(evaluateCondition('below_half_strength', state)).toBe(true);
    });

    it('handles even model counts correctly', () => {
      const state = createTestState({
        startingModels: 4,
        woundsPerModel: 3,
        currentWounds: 6, // 2 models remaining, ceil(4/2) = 2, so NOT below half
      });

      expect(evaluateCondition('below_half_strength', state)).toBe(false);

      const belowHalf = createTestState({
        startingModels: 4,
        woundsPerModel: 3,
        currentWounds: 3, // 1 model remaining, below ceil(4/2) = 2
      });

      expect(evaluateCondition('below_half_strength', belowHalf)).toBe(true);
    });
  });

  describe('unknown conditions', () => {
    it('returns true for unknown conditions', () => {
      const state = createTestState();

      expect(evaluateCondition('some_unknown_condition', state)).toBe(true);
    });
  });
});

// ============================================================================
// createUnitConditionState Tests
// ============================================================================

describe('createUnitConditionState', () => {
  it('creates state with full health when currentWounds is null', () => {
    const state = createUnitConditionState(5, 3, null);

    expect(state.startingModels).toBe(5);
    expect(state.currentModels).toBe(5);
    expect(state.woundsPerModel).toBe(3);
    expect(state.currentWounds).toBeNull();
  });

  it('calculates currentModels from wounds', () => {
    // 5 models * 3 wounds = 15 total, 12 remaining = 4 models
    const state = createUnitConditionState(5, 3, 12);

    expect(state.startingModels).toBe(5);
    expect(state.currentModels).toBe(4);
    expect(state.currentWounds).toBe(12);
  });

  it('handles single wound models', () => {
    // 10 models * 1 wound = 10 total, 7 remaining = 7 models
    const state = createUnitConditionState(10, 1, 7);

    expect(state.currentModels).toBe(7);
  });

  it('handles high wound models', () => {
    // 3 models * 6 wounds = 18 total, 13 remaining = 3 models (one wounded)
    const state = createUnitConditionState(3, 6, 13);

    expect(state.currentModels).toBe(3);
  });
});
