import { describe, it, expect } from 'vitest';
import { abilityMatchesPhase, getPhaseReminders } from './phaseReminders';
import type { ArmyData, GameState, ListUnit, Unit } from '@/types';

describe('abilityMatchesPhase', () => {
  it('matches command phase references', () => {
    expect(abilityMatchesPhase('At the start of your Command phase, roll one D6.', 'command')).toBe(true);
  });

  it('matches fight phase references', () => {
    expect(abilityMatchesPhase('In the Fight phase, this unit gains +1 to hit.', 'fight')).toBe(true);
  });

  it('matches shooting phase references', () => {
    expect(abilityMatchesPhase('During the Shooting phase, improve AP by 1.', 'shooting')).toBe(true);
  });

  it('does not match unrelated phases', () => {
    expect(abilityMatchesPhase('In the Fight phase, this unit gains +1 to hit.', 'command')).toBe(false);
  });

  it('is case insensitive', () => {
    expect(abilityMatchesPhase('In the COMMAND PHASE, roll a D6.', 'command')).toBe(true);
  });

  it('does not match partial words', () => {
    expect(abilityMatchesPhase('The commander phases out.', 'command')).toBe(false);
  });
});

describe('getPhaseReminders', () => {
  const baseGameState: GameState = {
    battleRound: 1,
    currentPhase: 'command',
    playerTurn: 'player',
    goingFirst: true,
    isAttacker: true,
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
    selectedPrimaryMission: 'test-primary',
    selectedSecondaryMissions: ['test-sec-1', 'test-sec-2'],
    discardedSecondaryMissions: [],
    scoredConditions: {},
  };

  const makeUnit = (overrides: Partial<Unit> = {}): Unit => ({
    id: 'test-unit',
    name: 'Test Unit',
    points: { '1': 50 },
    stats: { m: 6, t: 4, sv: '3+', w: 3, ld: '6+', oc: 2 },
    invuln: null,
    weapons: [],
    abilities: [],
    keywords: [],
    loadoutOptions: [],
    ...overrides,
  } as Unit);

  const makeArmyData = (overrides: Partial<ArmyData> = {}): ArmyData => ({
    id: 'test',
    name: 'Test Army',
    units: [],
    detachments: {},
    keywordGlossary: { unit: [], weapon: [] },
    ...overrides,
  } as ArmyData);

  const makeListUnit = (overrides: Partial<ListUnit> = {}): ListUnit => ({
    unitId: 'test-unit',
    modelCount: 1,
    enhancement: '',
    currentWounds: null,
    leaderCurrentWounds: null,
    attachedLeader: null,
    ...overrides,
  });

  it('returns empty array when no army data', () => {
    const result = getPhaseReminders('command', 1, null, [], '', baseGameState);
    expect(result).toEqual([]);
  });

  it('returns empty array when no reminders for phase', () => {
    const armyData = makeArmyData({
      units: [makeUnit({
        abilities: [{
          id: 'test-ability',
          name: 'Test Ability',
          description: 'This unit gets +1 to hit in the Shooting phase.',
        }],
      })],
    });
    const listUnits = [makeListUnit()];

    const result = getPhaseReminders('command', 1, armyData, listUnits, '', baseGameState);
    expect(result).toEqual([]);
  });

  it('returns ability reminders matching phase', () => {
    const armyData = makeArmyData({
      units: [makeUnit({
        abilities: [{
          id: 'psychic-veil',
          name: 'Psychic Veil',
          description: 'At the start of the Command phase, roll one D6 for each enemy unit within 12".',
        }],
      })],
    });
    const listUnits = [makeListUnit()];

    const result = getPhaseReminders('command', 1, armyData, listUnits, '', baseGameState);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Psychic Veil');
    expect(result[0].type).toBe('reminder');
    expect(result[0].unitName).toBe('Test Unit');
  });

  it('includes detachment rule selections when pending in command phase', () => {
    const armyData = makeArmyData({
      detachments: {
        'shield-host': {
          name: 'Shield Host',
          rules: [{
            id: 'martial-mastery',
            name: 'Martial Mastery',
            description: 'At the start of each battle round, select one option.',
            type: 'selection',
            resetsEachRound: true,
            modifiers: [],
            choices: [{ id: 'crit-5', name: 'Critical Hits 5+', effect: 'Crit on 5+', modifiers: [] }],
          }],
          stratagems: [],
          enhancements: [],
        },
      },
    });

    const gameState: GameState = {
      ...baseGameState,
      pendingRoundConfirmations: { 'martial-mastery': true },
    };

    const result = getPhaseReminders('command', 1, armyData, [], 'shield-host', gameState);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('selection');
    expect(result[0].title).toBe('Martial Mastery');
  });

  it('sorts selections before reminders', () => {
    const armyData = makeArmyData({
      units: [makeUnit({
        abilities: [{
          id: 'cmd-ability',
          name: 'Command Aura',
          description: 'At the start of the Command phase, this unit gains...',
        }],
      })],
      detachments: {
        'shield-host': {
          name: 'Shield Host',
          rules: [{
            id: 'rule-1',
            name: 'Test Rule',
            description: 'Select each round.',
            type: 'selection',
            resetsEachRound: true,
            modifiers: [],
            choices: [{ id: 'c1', name: 'Choice 1', effect: 'Effect', modifiers: [] }],
          }],
          stratagems: [],
          enhancements: [],
        },
      },
    });

    const listUnits = [makeListUnit()];

    const gameState: GameState = {
      ...baseGameState,
      pendingRoundConfirmations: { 'rule-1': true },
    };

    const result = getPhaseReminders('command', 1, armyData, listUnits, 'shield-host', gameState);
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0].type).toBe('selection');
    expect(result[1].type).toBe('reminder');
  });

  it('excludes used once-per-battle abilities', () => {
    const armyData = makeArmyData({
      units: [makeUnit({
        abilities: [{
          id: 'big-ability',
          name: 'Big Ability',
          description: 'Once per battle, in the Command phase, do something huge.',
        }],
      })],
    });

    const listUnits = [makeListUnit()];

    const gameState: GameState = {
      ...baseGameState,
      usedAbilities: { 0: { 'big-ability': true } },
    };

    const result = getPhaseReminders('command', 1, armyData, listUnits, '', gameState);
    expect(result).toHaveLength(0);
  });

  it('excludes leader abilities from reminders', () => {
    const armyData = makeArmyData({
      units: [makeUnit({
        abilities: [{
          id: 'leader',
          name: 'Leader',
          description: 'In the Command phase, this model can be attached to...',
          eligibleUnits: ['some-unit'],
        }],
      })],
    });

    const listUnits = [makeListUnit()];

    const result = getPhaseReminders('command', 1, armyData, listUnits, '', baseGameState);
    expect(result).toHaveLength(0);
  });
});
