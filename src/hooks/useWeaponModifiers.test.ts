import { describe, it, expect } from 'vitest';
import {
  collectWeaponModifiers,
  applyModifiers,
  getModifiedWeaponStat,
  type ActiveRuleChoice,
} from './useWeaponModifiers';
import type { Weapon, Stratagem, Enhancement, ArmyRuleStance, MissionTwist, StatKey, ModifierOperation, ModifierScope } from '@/types';

// ============================================================================
// Mock Data
// ============================================================================

const meleeWeapon: Weapon = {
  id: 'guardian-spear-melee',
  name: 'Guardian Spear',
  type: 'melee',
  stats: { a: 5, ws: '2+', s: 7, ap: -2, d: 2 },
  abilities: [],
};

const rangedWeapon: Weapon = {
  id: 'guardian-spear-ranged',
  name: 'Guardian Spear (Shooting)',
  type: 'ranged',
  stats: { range: 24, a: 2, bs: '2+', s: 4, ap: -1, d: 2 },
  abilities: [],
};

const stratagemMelee: Stratagem = {
  id: 'melee-strat',
  name: 'Melee Boost',
  cost: 1,
  phase: 'fight',
  description: '+1 attack (melee)',
  modifiers: [{ stat: 'a', operation: 'add', value: 1, scope: 'melee' }],
};

const stratagemRanged: Stratagem = {
  id: 'ranged-strat',
  name: 'Ranged Boost',
  cost: 1,
  phase: 'shooting',
  description: '+1 attack (ranged)',
  modifiers: [{ stat: 'a', operation: 'add', value: 1, scope: 'ranged' }],
};

const stratagemAll: Stratagem = {
  id: 'all-strat',
  name: 'Universal Boost',
  cost: 1,
  phase: 'fight',
  description: '+1 strength (all weapons)',
  modifiers: [{ stat: 's', operation: 'add', value: 1, scope: 'all' }],
};

const stratagemWeapon: Stratagem = {
  id: 'weapon-strat',
  name: 'Weapon Boost',
  cost: 1,
  phase: 'fight',
  description: '+1 damage (weapon scope)',
  modifiers: [{ stat: 'd', operation: 'add', value: 1, scope: 'weapon' }],
};

const stratagemModelScope: Stratagem = {
  id: 'model-strat',
  name: 'Model Only',
  cost: 1,
  phase: 'fight',
  description: '+1 toughness (model scope)',
  modifiers: [{ stat: 't', operation: 'add', value: 1, scope: 'model' }],
};

// ============================================================================
// collectWeaponModifiers
// ============================================================================

describe('collectWeaponModifiers', () => {
  describe('scope filtering', () => {
    it('collects melee-scoped modifiers for melee weapons', () => {
      const mods = collectWeaponModifiers(meleeWeapon, 'a', [stratagemMelee]);

      expect(mods).toHaveLength(1);
      expect(mods[0].source).toBe('Melee Boost');
      expect(mods[0].value).toBe(1);
    });

    it('does not apply melee-scoped modifiers to ranged weapons', () => {
      const mods = collectWeaponModifiers(rangedWeapon, 'a', [stratagemMelee]);

      expect(mods).toHaveLength(0);
    });

    it('collects ranged-scoped modifiers for ranged weapons', () => {
      const mods = collectWeaponModifiers(rangedWeapon, 'a', [stratagemRanged]);

      expect(mods).toHaveLength(1);
    });

    it('does not apply ranged-scoped modifiers to melee weapons', () => {
      const mods = collectWeaponModifiers(meleeWeapon, 'a', [stratagemRanged]);

      expect(mods).toHaveLength(0);
    });

    it('collects all-scoped modifiers for both weapon types', () => {
      const meleeResult = collectWeaponModifiers(meleeWeapon, 's', [stratagemAll]);
      const rangedResult = collectWeaponModifiers(rangedWeapon, 's', [stratagemAll]);

      expect(meleeResult).toHaveLength(1);
      expect(rangedResult).toHaveLength(1);
    });

    it('collects weapon-scoped modifiers for both types', () => {
      const meleeResult = collectWeaponModifiers(meleeWeapon, 'd', [stratagemWeapon]);
      const rangedResult = collectWeaponModifiers(rangedWeapon, 'd', [stratagemWeapon]);

      expect(meleeResult).toHaveLength(1);
      expect(rangedResult).toHaveLength(1);
    });

    it('ignores model-scoped modifiers', () => {
      const mods = collectWeaponModifiers(meleeWeapon, 't', [stratagemModelScope]);

      expect(mods).toHaveLength(0);
    });
  });

  describe('stat filtering', () => {
    it('only collects modifiers for the requested stat', () => {
      const mods = collectWeaponModifiers(meleeWeapon, 's', [stratagemMelee]); // Strat modifies 'a', not 's'

      expect(mods).toHaveLength(0);
    });

    it('collects from multiple active stratagems', () => {
      const mods = collectWeaponModifiers(meleeWeapon, 'a', [stratagemMelee, stratagemMelee]);

      expect(mods).toHaveLength(2);
    });
  });

  describe('additional sources', () => {
    it('collects from enhancement', () => {
      const enhancement: Enhancement = {
        id: 'enh-1',
        name: 'Power Enhancement',
        points: 15,
        description: '+1 strength',
        modifiers: [{ stat: 's', operation: 'add', value: 1, scope: 'melee' }],
      };

      const mods = collectWeaponModifiers(meleeWeapon, 's', [], [], enhancement);

      expect(mods).toHaveLength(1);
      expect(mods[0].source).toBe('Power Enhancement');
    });

    it('collects from active stance', () => {
      const stance: ArmyRuleStance = {
        id: 'dacatarai',
        name: 'Dacatarai',
        description: '+1 attack melee',
        modifiers: [{ stat: 'a', operation: 'add', value: 1, scope: 'melee' }],
      };

      const mods = collectWeaponModifiers(meleeWeapon, 'a', [], [], null, stance);

      expect(mods).toHaveLength(1);
      expect(mods[0].source).toBe('Dacatarai');
    });

    it('collects from active rule choices', () => {
      const ruleChoice: ActiveRuleChoice = {
        rule: { id: 'rule-1', name: 'Test Rule' },
        choice: {
          id: 'choice-a',
          name: 'Boost',
          effect: '+1 AP',
          modifiers: [{ stat: 'ap' as StatKey, operation: 'subtract' as ModifierOperation, value: 1, scope: 'melee' as ModifierScope }],
        },
      };

      const mods = collectWeaponModifiers(meleeWeapon, 'ap', [], [], null, null, [ruleChoice]);

      expect(mods).toHaveLength(1);
    });

    it('collects from mission twists', () => {
      const twist: MissionTwist = {
        id: 'twist-1',
        name: 'Power Surge',
        description: '+1 strength',
        affects: 'both',
        modifiers: [{ stat: 's', operation: 'add', value: 1, scope: 'all' }],
      };

      const mods = collectWeaponModifiers(meleeWeapon, 's', [], [twist]);

      expect(mods).toHaveLength(1);
      expect(mods[0].source).toBe('Power Surge');
    });

    it('ignores sources without modifiers', () => {
      const noModStrat: Stratagem = {
        id: 'no-mod',
        name: 'No Mods',
        cost: 0,
        phase: 'fight',
        description: 'Does nothing',
      };

      const mods = collectWeaponModifiers(meleeWeapon, 'a', [noModStrat]);

      expect(mods).toHaveLength(0);
    });

    it('ignores rule choices without modifiers', () => {
      const ruleChoice: ActiveRuleChoice = {
        rule: { id: 'rule-1', name: 'Test Rule' },
        choice: {
          id: 'choice-a',
          name: 'No Mods',
          effect: 'No effect',
        },
      };

      const mods = collectWeaponModifiers(meleeWeapon, 'a', [], [], null, null, [ruleChoice]);

      expect(mods).toHaveLength(0);
    });
  });
});

// ============================================================================
// applyModifiers
// ============================================================================

describe('applyModifiers', () => {
  it('adds to base value', () => {
    const result = applyModifiers(5, [{ stat: 'a', operation: 'add', value: 2, source: 'test' }]);

    expect(result).toBe(7);
  });

  it('subtracts from base value', () => {
    const result = applyModifiers(5, [{ stat: 'a', operation: 'subtract', value: 2, source: 'test' }]);

    expect(result).toBe(3);
  });

  it('multiplies base value', () => {
    const result = applyModifiers(3, [{ stat: 'a', operation: 'multiply', value: 2, source: 'test' }]);

    expect(result).toBe(6);
  });

  it('sets base value', () => {
    const result = applyModifiers(5, [{ stat: 'a', operation: 'set', value: 10, source: 'test' }]);

    expect(result).toBe(10);
  });

  it('applies multiple modifiers in order', () => {
    const result = applyModifiers(3, [
      { stat: 'a', operation: 'add', value: 2, source: 'a' },     // 3 + 2 = 5
      { stat: 'a', operation: 'multiply', value: 2, source: 'b' }, // 5 * 2 = 10
    ]);

    expect(result).toBe(10);
  });

  it('returns string values unchanged', () => {
    const result = applyModifiers('D6', [{ stat: 'a', operation: 'add', value: 1, source: 'test' }]);

    expect(result).toBe('D6');
  });

  it('returns base value for empty modifiers', () => {
    expect(applyModifiers(5, [])).toBe(5);
  });
});

// ============================================================================
// getModifiedWeaponStat
// ============================================================================

describe('getModifiedWeaponStat', () => {
  it('returns base value with no modifiers', () => {
    const result = getModifiedWeaponStat(meleeWeapon, 'a', []);

    expect(result.value).toBe(5);
    expect(result.modified).toBe(false);
    expect(result.sources).toHaveLength(0);
  });

  it('returns modified value with active stratagem', () => {
    const result = getModifiedWeaponStat(meleeWeapon, 'a', [stratagemMelee]);

    expect(result.value).toBe(6); // 5 + 1
    expect(result.modified).toBe(true);
    expect(result.sources).toContain('Melee Boost');
  });

  it('returns dash for undefined stats', () => {
    // 'range' is not in melee weapon stats
    const result = getModifiedWeaponStat(meleeWeapon, 'range', []);

    expect(result.value).toBe('-');
    expect(result.modified).toBe(false);
  });

  it('handles multiple modifier sources', () => {
    const result = getModifiedWeaponStat(meleeWeapon, 's', [stratagemAll, stratagemAll]);

    expect(result.value).toBe(9); // 7 + 1 + 1
    expect(result.sources).toHaveLength(2);
  });

  it('includes enhancement and stance modifiers', () => {
    const enhancement: Enhancement = {
      id: 'power-enh',
      name: 'Power',
      points: 10,
      description: '+1 strength',
      modifiers: [{ stat: 's', operation: 'add', value: 1, scope: 'melee' }],
    };

    const stance: ArmyRuleStance = {
      id: 'stance-1',
      name: 'Power Stance',
      description: '+1 strength',
      modifiers: [{ stat: 's', operation: 'add', value: 1, scope: 'all' }],
    };

    const result = getModifiedWeaponStat(
      meleeWeapon, 's', [], [], enhancement, stance
    );

    expect(result.value).toBe(9); // 7 + 1 + 1
    expect(result.modified).toBe(true);
    expect(result.sources).toHaveLength(2);
  });

  it('correctly marks unmodified when scope does not match', () => {
    // Ranged strat on melee weapon = no modification
    const result = getModifiedWeaponStat(meleeWeapon, 'a', [stratagemRanged]);

    expect(result.value).toBe(5);
    expect(result.modified).toBe(false);
  });
});
