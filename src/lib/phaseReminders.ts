import type { GamePhase, ArmyData, ListUnit, GameState, Unit } from '@/types';
import { findUnitById } from '@/lib/armyDataUtils';

export type PhaseReminder = {
  type: 'selection' | 'reminder';
  source: 'ability' | 'army_rule' | 'detachment_rule';
  unitName?: string;
  unitIndex?: number;
  title: string;
  description: string;
};

const PHASE_PATTERNS: Record<GamePhase, RegExp> = {
  deployment: /\bdeployment\b/i,
  command: /\bcommand phase\b/i,
  movement: /\bmovement phase\b/i,
  shooting: /\bshooting phase\b/i,
  charge: /\bcharge phase\b/i,
  fight: /\bfight phase\b/i,
};

export function abilityMatchesPhase(description: string, phase: GamePhase): boolean {
  return PHASE_PATTERNS[phase].test(description);
}

export function getPhaseReminders(
  phase: GamePhase,
  battleRound: number,
  armyData: ArmyData | null,
  listUnits: ListUnit[],
  detachmentId: string,
  gameState: GameState,
): PhaseReminder[] {
  if (!armyData) return [];

  const reminders: PhaseReminder[] = [];

  // 1. Detachment rules with pending confirmations (command phase)
  if (phase === 'command') {
    const detachment = armyData.detachments[detachmentId];

    if (detachment?.rules && gameState.playerTurn === 'player') {
      for (const rule of detachment.rules) {
        if (!rule.resetsEachRound || !rule.choices) continue;

        const isPending = gameState.pendingRoundConfirmations[rule.id] === true;
        const hasChoice = !!gameState.activeRuleChoices[rule.id];

        // Show reminder if pending confirmation OR no choice made yet
        if (isPending || !hasChoice) {
          reminders.push({
            type: 'selection',
            source: 'detachment_rule',
            title: rule.name,
            description: rule.description,
          });
        }
      }
    }
  }

  // 2. Secondary mission reminder (player's command phase, only if none selected)
  if (phase === 'command' && gameState.playerTurn === 'player' && (gameState.selectedSecondaryMissions ?? []).length === 0) {
    reminders.push({
      type: 'reminder',
      source: 'army_rule',
      title: 'Select Secondaries',
      description: 'Choose your secondary missions for this battle round if you haven\'t already.',
    });
  }

  // 3. Unit abilities that mention the incoming phase
  for (let i = 0; i < listUnits.length; i++) {
    const listUnit = listUnits[i];
    const unit = findUnitById(armyData, listUnit.unitId);

    if (!unit) continue;

    // Skip standalone leader if it's attached to another unit
    // (its abilities will be collected via the bodyguard's attachedLeader path)
    const isAttachedElsewhere = listUnits.some(
      (other) => other.attachedLeader?.unitIndex === i
    );
    if (isAttachedElsewhere) continue;

    // Check unit abilities
    collectAbilityReminders(unit, i, phase, gameState, reminders);

    // Check attached leader abilities
    if (listUnit.attachedLeader) {
      const leaderListUnit = listUnits[listUnit.attachedLeader.unitIndex];

      if (leaderListUnit) {
        const leaderUnit = findUnitById(armyData, leaderListUnit.unitId);

        if (leaderUnit) {
          collectAbilityReminders(leaderUnit, listUnit.attachedLeader.unitIndex, phase, gameState, reminders);
        }
      }
    }
  }

  // 3. Army rules that mention the phase (excluding Ka'tah from modal — handled on datasheet)
  // Army rules that say "your Command phase" only show on player's turn
  if (armyData.armyRules && (phase !== 'command' || gameState.playerTurn === 'player')) {
    for (const [key, rule] of Object.entries(armyData.armyRules)) {
      if (key === 'martial_katah') continue;

      if (abilityMatchesPhase(rule.description, phase)) {
        reminders.push({
          type: 'reminder',
          source: 'army_rule',
          title: rule.name,
          description: rule.description,
        });
      }
    }
  }

  // Sort: selections first, then reminders
  reminders.sort((a, b) => {
    if (a.type === 'selection' && b.type !== 'selection') return -1;
    if (a.type !== 'selection' && b.type === 'selection') return 1;
    return 0;
  });

  return reminders;
}

function collectAbilityReminders(
  unit: Unit,
  unitIndex: number,
  phase: GamePhase,
  gameState: GameState,
  reminders: PhaseReminder[],
): void {
  if (!unit.abilities) return;

  for (const ability of unit.abilities) {
    if (ability.id === 'leader') continue;

    // Skip used once-per-battle abilities
    if (/once per battle/i.test(ability.description)) {
      if (gameState.usedAbilities?.[unitIndex]?.[ability.id]) continue;
    }

    if (abilityMatchesPhase(ability.description, phase)) {
      reminders.push({
        type: 'reminder',
        source: 'ability',
        unitName: unit.name,
        unitIndex,
        title: ability.name,
        description: ability.description,
      });
    }
  }
}
