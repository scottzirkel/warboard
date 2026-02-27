import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './gameStore';

// ============================================================================
// Tests
// ============================================================================

describe('gameStore', () => {
  beforeEach(() => {
    useGameStore.getState().resetGameState();
  });

  // ---------------------------------------------------------------------------
  // Battle Round
  // ---------------------------------------------------------------------------

  describe('battle round', () => {
    it('starts at round 1', () => {
      expect(useGameStore.getState().gameState.battleRound).toBe(1);
    });

    it('sets battle round', () => {
      useGameStore.getState().setBattleRound(3);

      expect(useGameStore.getState().gameState.battleRound).toBe(3);
    });

    it('clamps battle round to 1-5', () => {
      useGameStore.getState().setBattleRound(0);
      expect(useGameStore.getState().gameState.battleRound).toBe(1);

      useGameStore.getState().setBattleRound(6);
      expect(useGameStore.getState().gameState.battleRound).toBe(5);
    });

    it('advances to next round', () => {
      useGameStore.getState().nextRound();

      expect(useGameStore.getState().gameState.battleRound).toBe(2);
    });

    it('goes to previous round', () => {
      useGameStore.getState().setBattleRound(3);
      useGameStore.getState().prevRound();

      expect(useGameStore.getState().gameState.battleRound).toBe(2);
    });

    it('does not go below round 1', () => {
      useGameStore.getState().prevRound();

      expect(useGameStore.getState().gameState.battleRound).toBe(1);
    });

    it('resets activation state when round changes', () => {
      // Set some activation state
      useGameStore.getState().setLoadoutGroupActivated(0, 'melee', true);
      useGameStore.getState().setLeaderActivated(0, true);

      useGameStore.getState().nextRound();

      expect(useGameStore.getState().isLoadoutGroupActivated(0, 'melee')).toBe(false);
      expect(useGameStore.getState().isLeaderActivated(0)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Game Phase
  // ---------------------------------------------------------------------------

  describe('game phase', () => {
    it('starts at command phase', () => {
      expect(useGameStore.getState().gameState.currentPhase).toBe('command');
    });

    it('sets phase', () => {
      useGameStore.getState().setPhase('shooting');

      expect(useGameStore.getState().gameState.currentPhase).toBe('shooting');
    });

    it('clears stratagems when phase changes', () => {
      useGameStore.getState().activateStratagem('test-stratagem');
      useGameStore.getState().setPhase('movement');

      expect(useGameStore.getState().gameState.activeStratagems).toHaveLength(0);
    });

    it('advances through phases in order', () => {
      useGameStore.getState().nextPhase(); // command -> movement
      expect(useGameStore.getState().gameState.currentPhase).toBe('movement');

      useGameStore.getState().nextPhase(); // movement -> shooting
      expect(useGameStore.getState().gameState.currentPhase).toBe('shooting');

      useGameStore.getState().nextPhase(); // shooting -> charge
      expect(useGameStore.getState().gameState.currentPhase).toBe('charge');

      useGameStore.getState().nextPhase(); // charge -> fight
      expect(useGameStore.getState().gameState.currentPhase).toBe('fight');
    });

    it('wraps from fight to command and increments round', () => {
      useGameStore.getState().setPhase('fight');
      useGameStore.getState().nextPhase();

      expect(useGameStore.getState().gameState.currentPhase).toBe('command');
      expect(useGameStore.getState().gameState.battleRound).toBe(2);
    });

    it('goes back through phases', () => {
      useGameStore.getState().setPhase('shooting');
      useGameStore.getState().prevPhase();

      expect(useGameStore.getState().gameState.currentPhase).toBe('movement');
    });

    it('wraps from command to fight of previous round', () => {
      useGameStore.getState().setBattleRound(2);
      useGameStore.getState().setPhase('command');
      useGameStore.getState().prevPhase();

      expect(useGameStore.getState().gameState.currentPhase).toBe('fight');
      expect(useGameStore.getState().gameState.battleRound).toBe(1);
    });

    it('does not go before round 1 command phase', () => {
      useGameStore.getState().prevPhase();

      expect(useGameStore.getState().gameState.battleRound).toBe(1);
      expect(useGameStore.getState().gameState.currentPhase).toBe('command');
    });
  });

  // ---------------------------------------------------------------------------
  // Player Turn
  // ---------------------------------------------------------------------------

  describe('player turn', () => {
    it('starts as player turn', () => {
      expect(useGameStore.getState().gameState.playerTurn).toBe('player');
    });

    it('sets player turn', () => {
      useGameStore.getState().setPlayerTurn('opponent');

      expect(useGameStore.getState().gameState.playerTurn).toBe('opponent');
    });

    it('toggles player turn', () => {
      useGameStore.getState().togglePlayerTurn();
      expect(useGameStore.getState().gameState.playerTurn).toBe('opponent');

      useGameStore.getState().togglePlayerTurn();
      expect(useGameStore.getState().gameState.playerTurn).toBe('player');
    });
  });

  // ---------------------------------------------------------------------------
  // Advance Game State
  // ---------------------------------------------------------------------------

  describe('advanceGameState', () => {
    it('advances through phases within a turn', () => {
      useGameStore.getState().advanceGameState(); // command -> movement

      expect(useGameStore.getState().gameState.currentPhase).toBe('movement');
      expect(useGameStore.getState().gameState.playerTurn).toBe('player');
    });

    it('switches to opponent turn after player fight phase', () => {
      useGameStore.getState().setPhase('fight');
      useGameStore.getState().advanceGameState();

      expect(useGameStore.getState().gameState.currentPhase).toBe('command');
      expect(useGameStore.getState().gameState.playerTurn).toBe('opponent');
    });

    it('grants CP when switching to opponent turn', () => {
      useGameStore.getState().setPhase('fight');
      const cpBefore = useGameStore.getState().gameState.commandPoints;
      useGameStore.getState().advanceGameState();

      expect(useGameStore.getState().gameState.commandPoints).toBe(cpBefore + 1);
    });

    it('advances to next round after opponent fight phase', () => {
      useGameStore.getState().setPlayerTurn('opponent');
      useGameStore.getState().setPhase('fight');
      useGameStore.getState().advanceGameState();

      expect(useGameStore.getState().gameState.battleRound).toBe(2);
      expect(useGameStore.getState().gameState.currentPhase).toBe('command');
      expect(useGameStore.getState().gameState.playerTurn).toBe('player');
    });

    it('does not advance past round 5', () => {
      useGameStore.getState().setBattleRound(5);
      useGameStore.getState().setPlayerTurn('opponent');
      useGameStore.getState().setPhase('fight');
      useGameStore.getState().advanceGameState();

      // Should stay at round 5 fight phase
      expect(useGameStore.getState().gameState.battleRound).toBe(5);
    });

    it('clears active stratagems on advance', () => {
      useGameStore.getState().activateStratagem('test');
      useGameStore.getState().advanceGameState();

      expect(useGameStore.getState().gameState.activeStratagems).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Command Points
  // ---------------------------------------------------------------------------

  describe('command points', () => {
    it('starts at 0', () => {
      expect(useGameStore.getState().gameState.commandPoints).toBe(0);
    });

    it('sets command points', () => {
      useGameStore.getState().setCommandPoints(5);

      expect(useGameStore.getState().gameState.commandPoints).toBe(5);
    });

    it('does not go below 0', () => {
      useGameStore.getState().setCommandPoints(-3);

      expect(useGameStore.getState().gameState.commandPoints).toBe(0);
    });

    it('adjusts command points by delta', () => {
      useGameStore.getState().setCommandPoints(3);
      useGameStore.getState().adjustCommandPoints(-1);

      expect(useGameStore.getState().gameState.commandPoints).toBe(2);
    });

    it('clamps adjustment to 0 minimum', () => {
      useGameStore.getState().setCommandPoints(1);
      useGameStore.getState().adjustCommandPoints(-5);

      expect(useGameStore.getState().gameState.commandPoints).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Victory Points
  // ---------------------------------------------------------------------------

  describe('victory points', () => {
    it('sets and adjusts primary VP', () => {
      useGameStore.getState().setPrimaryVP(10);
      expect(useGameStore.getState().gameState.primaryVP).toBe(10);

      useGameStore.getState().adjustPrimaryVP(5);
      expect(useGameStore.getState().gameState.primaryVP).toBe(15);

      useGameStore.getState().adjustPrimaryVP(-20);
      expect(useGameStore.getState().gameState.primaryVP).toBe(0); // Clamped
    });

    it('sets and adjusts secondary VP', () => {
      useGameStore.getState().setSecondaryVP(8);
      expect(useGameStore.getState().gameState.secondaryVP).toBe(8);

      useGameStore.getState().adjustSecondaryVP(3);
      expect(useGameStore.getState().gameState.secondaryVP).toBe(11);
    });
  });

  // ---------------------------------------------------------------------------
  // Stratagems
  // ---------------------------------------------------------------------------

  describe('stratagems', () => {
    it('activates a stratagem', () => {
      useGameStore.getState().activateStratagem('test-strat');

      expect(useGameStore.getState().gameState.activeStratagems).toContain('test-strat');
    });

    it('does not duplicate active stratagems', () => {
      useGameStore.getState().activateStratagem('test-strat');
      useGameStore.getState().activateStratagem('test-strat');

      expect(useGameStore.getState().gameState.activeStratagems).toHaveLength(1);
    });

    it('deactivates a stratagem', () => {
      useGameStore.getState().activateStratagem('test-strat');
      useGameStore.getState().deactivateStratagem('test-strat');

      expect(useGameStore.getState().gameState.activeStratagems).not.toContain('test-strat');
    });

    it('toggles a stratagem', () => {
      useGameStore.getState().toggleStratagem('test-strat');
      expect(useGameStore.getState().gameState.activeStratagems).toContain('test-strat');

      useGameStore.getState().toggleStratagem('test-strat');
      expect(useGameStore.getState().gameState.activeStratagems).not.toContain('test-strat');
    });

    it('clears all active stratagems', () => {
      useGameStore.getState().activateStratagem('strat-1');
      useGameStore.getState().activateStratagem('strat-2');
      useGameStore.getState().clearActiveStratagems();

      expect(useGameStore.getState().gameState.activeStratagems).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Stratagem Usage Tracking
  // ---------------------------------------------------------------------------

  describe('stratagem usage tracking', () => {
    it('tracks usage count', () => {
      useGameStore.getState().incrementStratagemUsage('strat-1');
      useGameStore.getState().incrementStratagemUsage('strat-1');
      useGameStore.getState().incrementStratagemUsage('strat-2');

      expect(useGameStore.getState().getStratagemUsage('strat-1')).toBe(2);
      expect(useGameStore.getState().getStratagemUsage('strat-2')).toBe(1);
    });

    it('returns 0 for unused stratagems', () => {
      expect(useGameStore.getState().getStratagemUsage('unused')).toBe(0);
    });

    it('resets usage counts', () => {
      useGameStore.getState().incrementStratagemUsage('strat-1');
      useGameStore.getState().resetStratagemUsage();

      expect(useGameStore.getState().getStratagemUsage('strat-1')).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Mission Twists
  // ---------------------------------------------------------------------------

  describe('mission twists', () => {
    it('toggles a twist on', () => {
      useGameStore.getState().toggleTwist('twist-1');

      expect(useGameStore.getState().gameState.activeTwists).toContain('twist-1');
    });

    it('only allows one twist at a time', () => {
      useGameStore.getState().toggleTwist('twist-1');
      useGameStore.getState().toggleTwist('twist-2');

      expect(useGameStore.getState().gameState.activeTwists).toEqual(['twist-2']);
    });

    it('toggles a twist off', () => {
      useGameStore.getState().toggleTwist('twist-1');
      useGameStore.getState().toggleTwist('twist-1');

      expect(useGameStore.getState().gameState.activeTwists).toHaveLength(0);
    });

    it('clears all active twists', () => {
      useGameStore.getState().toggleTwist('twist-1');
      useGameStore.getState().clearActiveTwists();

      expect(useGameStore.getState().gameState.activeTwists).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Martial Ka'tah
  // ---------------------------------------------------------------------------

  describe('katah', () => {
    it('starts as null', () => {
      expect(useGameStore.getState().gameState.katah).toBeNull();
    });

    it('sets katah stance', () => {
      useGameStore.getState().setKatah('dacatarai');

      expect(useGameStore.getState().gameState.katah).toBe('dacatarai');
    });

    it('clears katah', () => {
      useGameStore.getState().setKatah('dacatarai');
      useGameStore.getState().setKatah(null);

      expect(useGameStore.getState().gameState.katah).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Per-Round Confirmations
  // ---------------------------------------------------------------------------

  describe('round confirmations', () => {
    it('marks a rule as pending confirmation', () => {
      useGameStore.getState().markPendingConfirmation('rule-1');

      expect(useGameStore.getState().isPendingConfirmation('rule-1')).toBe(true);
    });

    it('confirms a round selection', () => {
      useGameStore.getState().markPendingConfirmation('rule-1');
      useGameStore.getState().confirmRoundSelection('rule-1');

      expect(useGameStore.getState().isPendingConfirmation('rule-1')).toBe(false);
    });

    it('marks multiple rules pending', () => {
      useGameStore.getState().markPerRoundRulesPending(['rule-1', 'rule-2']);

      expect(useGameStore.getState().isPendingConfirmation('rule-1')).toBe(true);
      expect(useGameStore.getState().isPendingConfirmation('rule-2')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Detachment Rule Choices
  // ---------------------------------------------------------------------------

  describe('rule choices', () => {
    it('sets a rule choice', () => {
      useGameStore.getState().setRuleChoice('rule-1', 'choice-a');

      expect(useGameStore.getState().getRuleChoice('rule-1')).toBe('choice-a');
    });

    it('clears a rule choice', () => {
      useGameStore.getState().setRuleChoice('rule-1', 'choice-a');
      useGameStore.getState().setRuleChoice('rule-1', null);

      expect(useGameStore.getState().getRuleChoice('rule-1')).toBeNull();
    });

    it('clears pending confirmation when making a choice', () => {
      useGameStore.getState().markPendingConfirmation('rule-1');
      useGameStore.getState().setRuleChoice('rule-1', 'choice-a');

      expect(useGameStore.getState().isPendingConfirmation('rule-1')).toBe(false);
    });

    it('returns null for unset rules', () => {
      expect(useGameStore.getState().getRuleChoice('unknown')).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Loadout Group Collapse/Activation
  // ---------------------------------------------------------------------------

  describe('loadout group state', () => {
    it('starts uncollapsed', () => {
      expect(useGameStore.getState().isLoadoutGroupCollapsed(0, 'melee')).toBe(false);
    });

    it('toggles collapse state', () => {
      useGameStore.getState().toggleLoadoutGroupCollapsed(0, 'melee');
      expect(useGameStore.getState().isLoadoutGroupCollapsed(0, 'melee')).toBe(true);

      useGameStore.getState().toggleLoadoutGroupCollapsed(0, 'melee');
      expect(useGameStore.getState().isLoadoutGroupCollapsed(0, 'melee')).toBe(false);
    });

    it('starts unactivated', () => {
      expect(useGameStore.getState().isLoadoutGroupActivated(0, 'melee')).toBe(false);
    });

    it('toggles activation and auto-collapses', () => {
      useGameStore.getState().toggleLoadoutGroupActivated(0, 'melee');

      expect(useGameStore.getState().isLoadoutGroupActivated(0, 'melee')).toBe(true);
      expect(useGameStore.getState().isLoadoutGroupCollapsed(0, 'melee')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Leader Collapse/Activation
  // ---------------------------------------------------------------------------

  describe('leader state', () => {
    it('starts uncollapsed', () => {
      expect(useGameStore.getState().isLeaderCollapsed(0)).toBe(false);
    });

    it('toggles collapse', () => {
      useGameStore.getState().toggleLeaderCollapsed(0);
      expect(useGameStore.getState().isLeaderCollapsed(0)).toBe(true);
    });

    it('toggles activation and auto-collapses', () => {
      useGameStore.getState().toggleLeaderActivated(0);

      expect(useGameStore.getState().isLeaderActivated(0)).toBe(true);
      expect(useGameStore.getState().isLeaderCollapsed(0)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Loadout Casualties
  // ---------------------------------------------------------------------------

  describe('loadout casualties', () => {
    it('starts at 0', () => {
      expect(useGameStore.getState().getLoadoutCasualties(0, 'melee')).toBe(0);
    });

    it('increments casualties', () => {
      useGameStore.getState().incrementLoadoutCasualties(0, 'melee');
      useGameStore.getState().incrementLoadoutCasualties(0, 'melee');

      expect(useGameStore.getState().getLoadoutCasualties(0, 'melee')).toBe(2);
    });

    it('decrements casualties but not below 0', () => {
      useGameStore.getState().incrementLoadoutCasualties(0, 'melee');
      useGameStore.getState().decrementLoadoutCasualties(0, 'melee');
      useGameStore.getState().decrementLoadoutCasualties(0, 'melee'); // Would go negative

      expect(useGameStore.getState().getLoadoutCasualties(0, 'melee')).toBe(0);
    });

    it('sets casualties directly', () => {
      useGameStore.getState().setLoadoutCasualties(0, 'melee', 3);

      expect(useGameStore.getState().getLoadoutCasualties(0, 'melee')).toBe(3);
    });

    it('resets unit casualties', () => {
      useGameStore.getState().setLoadoutCasualties(0, 'melee', 3);
      useGameStore.getState().setLoadoutCasualties(0, 'ranged', 1);
      useGameStore.getState().resetUnitCasualties(0);

      expect(useGameStore.getState().getLoadoutCasualties(0, 'melee')).toBe(0);
      expect(useGameStore.getState().getLoadoutCasualties(0, 'ranged')).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Used Abilities
  // ---------------------------------------------------------------------------

  describe('used abilities', () => {
    it('starts as unused', () => {
      expect(useGameStore.getState().isAbilityUsed(0, 'ability-1')).toBe(false);
    });

    it('marks an ability as used', () => {
      useGameStore.getState().setAbilityUsed(0, 'ability-1', true);

      expect(useGameStore.getState().isAbilityUsed(0, 'ability-1')).toBe(true);
    });

    it('toggles ability used state', () => {
      useGameStore.getState().toggleAbilityUsed(0, 'ability-1');
      expect(useGameStore.getState().isAbilityUsed(0, 'ability-1')).toBe(true);

      useGameStore.getState().toggleAbilityUsed(0, 'ability-1');
      expect(useGameStore.getState().isAbilityUsed(0, 'ability-1')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Activation State Reset
  // ---------------------------------------------------------------------------

  describe('resetActivationState', () => {
    it('clears activated loadout groups and leaders', () => {
      useGameStore.getState().setLoadoutGroupActivated(0, 'melee', true);
      useGameStore.getState().setLeaderActivated(0, true);
      useGameStore.getState().resetActivationState();

      expect(useGameStore.getState().isLoadoutGroupActivated(0, 'melee')).toBe(false);
      expect(useGameStore.getState().isLeaderActivated(0)).toBe(false);
    });

    it('marks active rule choices as pending confirmation', () => {
      useGameStore.getState().setRuleChoice('rule-1', 'choice-a');
      useGameStore.getState().resetActivationState();

      expect(useGameStore.getState().isPendingConfirmation('rule-1')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Full Reset
  // ---------------------------------------------------------------------------

  describe('resetGameState', () => {
    it('resets all game state to defaults', () => {
      useGameStore.getState().setBattleRound(3);
      useGameStore.getState().setPhase('fight');
      useGameStore.getState().setCommandPoints(5);
      useGameStore.getState().setPrimaryVP(10);
      useGameStore.getState().activateStratagem('test');
      useGameStore.getState().setKatah('dacatarai');

      useGameStore.getState().resetGameState();

      const { gameState } = useGameStore.getState();

      expect(gameState.battleRound).toBe(1);
      expect(gameState.currentPhase).toBe('command');
      expect(gameState.commandPoints).toBe(0);
      expect(gameState.primaryVP).toBe(0);
      expect(gameState.activeStratagems).toHaveLength(0);
      expect(gameState.katah).toBeNull();
    });
  });
});
