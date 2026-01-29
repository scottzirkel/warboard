/**
 * Condition Evaluator
 *
 * Evaluates modifier conditions based on unit state.
 * Used to determine if conditional modifiers (like stratagem effects) should apply.
 */

// ============================================================================
// Types
// ============================================================================

export interface UnitConditionState {
  /** Starting number of models in the unit */
  startingModels: number;
  /** Current number of models alive */
  currentModels: number;
  /** Total wounds per model */
  woundsPerModel: number;
  /** Current wounds remaining on the unit */
  currentWounds: number | null;
}

// ============================================================================
// Condition Evaluation
// ============================================================================

/**
 * Normalizes condition strings for comparison.
 * Handles variations like "below starting strength" vs "below_starting_strength"
 */
function normalizeCondition(condition: string): string {
  return condition.toLowerCase().replace(/[\s-]/g, '_');
}

/**
 * Calculate current model count from wounds.
 * If currentWounds is null, unit is at full strength.
 */
function calculateCurrentModels(state: UnitConditionState): number {
  if (state.currentWounds === null) {
    return state.startingModels;
  }

  // Calculate how many full models worth of wounds remain
  // Models are removed when they lose all wounds
  const totalStartingWounds = state.startingModels * state.woundsPerModel;
  const woundsLost = totalStartingWounds - state.currentWounds;
  const modelsLost = Math.floor(woundsLost / state.woundsPerModel);

  return Math.max(0, state.startingModels - modelsLost);
}

/**
 * Check if unit is below starting strength.
 * A unit is below starting strength if it has lost at least one model.
 */
function isBelowStartingStrength(state: UnitConditionState): boolean {
  const currentModels = calculateCurrentModels(state);

  return currentModels < state.startingModels;
}

/**
 * Check if unit is below half strength.
 * A unit is below half strength if it has 50% or fewer models remaining.
 */
function isBelowHalfStrength(state: UnitConditionState): boolean {
  const currentModels = calculateCurrentModels(state);
  const halfStrength = Math.ceil(state.startingModels / 2);

  return currentModels < halfStrength;
}

/**
 * Evaluate a condition string against unit state.
 *
 * @param condition - The condition string (e.g., "below starting strength")
 * @param state - The current unit state
 * @returns true if the condition is met, false otherwise
 *
 * @example
 * ```ts
 * const state = {
 *   startingModels: 5,
 *   currentModels: 4,
 *   woundsPerModel: 3,
 *   currentWounds: 12, // 4 models * 3 wounds
 * };
 *
 * evaluateCondition('below starting strength', state); // true (lost 1 model)
 * evaluateCondition('below half strength', state); // false (4 > ceil(5/2) = 3)
 * ```
 */
export function evaluateCondition(
  condition: string | undefined,
  state: UnitConditionState
): boolean {
  // No condition means always applies
  if (!condition) {
    return true;
  }

  const normalized = normalizeCondition(condition);

  switch (normalized) {
    case 'below_starting_strength':
      return isBelowStartingStrength(state);

    case 'below_half_strength':
      return isBelowHalfStrength(state);

    case 'none':
      return true;

    default:
      // Unknown conditions default to true to avoid blocking modifiers
      // Log for debugging in development
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Unknown modifier condition: "${condition}"`);
      }

      return true;
  }
}

/**
 * Create a UnitConditionState from list unit data.
 */
export function createUnitConditionState(
  startingModels: number,
  woundsPerModel: number,
  currentWounds: number | null
): UnitConditionState {
  return {
    startingModels,
    currentModels: currentWounds === null
      ? startingModels
      : Math.ceil(currentWounds / woundsPerModel),
    woundsPerModel,
    currentWounds,
  };
}
