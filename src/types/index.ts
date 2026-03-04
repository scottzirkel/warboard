// ============================================================================
// Data Schema Types (from @scottzirkel/40k-data)
// ============================================================================

import type { Weapon, ModifierOperation } from '@scottzirkel/40k-data/types';

export type {
  ModifierOperation,
  ModifierScope,
  StatKey,
  ModifierDuration,
  ModifierCondition,
  Modifier,
  WeaponType,
  RangedWeaponStats,
  MeleeWeaponStats,
  EquipmentStats,
  WeaponStats,
  Weapon,
  Ability,
  LoadoutOptionType,
  LoadoutPattern,
  LoadoutChoice,
  LoadoutOption,
  UnitStats,
  ModelType,
  Unit,
  Enhancement,
  StratagemUsageLimit,
  Stratagem,
  ScoringCondition,
  ScoringBlock,
  MissionAction,
  SecondaryMission,
  ChallengerStratagem,
  ChallengerMission,
  ChallengerCard,
  MissionDeployment,
  PrimaryMission,
  MissionData,
  MissionTwist,
  DetachmentRuleType,
  DetachmentRuleBonus,
  DetachmentRuleChoice,
  DetachmentRule,
  Detachment,
  ArmyRuleStance,
  ArmyRule,
  KeywordDefinition,
  KeywordGlossary,
  WeaponKeyword,
  AllyFaction,
  ArmyData,
} from '@scottzirkel/40k-data/types';

// ============================================================================
// List Unit (User's Army List)
// ============================================================================

export interface AttachedLeader {
  unitIndex: number;
}

export interface ListUnit {
  unitId: string;
  modelCount: number;
  enhancement: string; // Enhancement ID or empty string
  loadout?: Record<string, string>; // Legacy format
  weaponCounts?: Record<string, number>;
  currentWounds: number | null; // null = full health
  leaderCurrentWounds: number | null; // null = full health
  attachedLeader: AttachedLeader | null;
  isWarlord?: boolean; // true if this unit is designated as the army's Warlord
  /** For multi-model-type units: wounds per model type (modelTypeId -> wounds, null = full) */
  modelTypeWounds?: Record<string, number | null>;
}

// ============================================================================
// Current List (Full Army List)
// ============================================================================

export type GameFormat = 'colosseum' | 'incursion' | 'strike-force' | 'onslaught' | 'custom';

export const GAME_FORMATS: { id: GameFormat; name: string; points: number | null }[] = [
  { id: 'colosseum', name: 'Colosseum', points: 500 },
  { id: 'incursion', name: 'Incursion', points: 1000 },
  { id: 'strike-force', name: 'Strike Force', points: 2000 },
  { id: 'onslaught', name: 'Onslaught', points: 3000 },
  { id: 'custom', name: 'Custom', points: null },
];

export interface CurrentList {
  name: string;
  army: string;
  pointsLimit: number;
  format: GameFormat;
  detachment: string;
  units: ListUnit[];
}

// ============================================================================
// Game State (Play Mode)
// ============================================================================

export type GamePhase = 'command' | 'movement' | 'shooting' | 'charge' | 'fight';
export type PlayerTurn = 'player' | 'opponent';

export const GAME_PHASES: GamePhase[] = ['command', 'movement', 'shooting', 'charge', 'fight'];

export interface GameState {
  battleRound: number;
  currentPhase: GamePhase;
  playerTurn: PlayerTurn;
  commandPoints: number;
  primaryVP: number;
  secondaryVP: number;
  activeStratagems: string[];
  /** Active mission twists (Chapter Approved) */
  activeTwists: string[];
  /** Tracks stratagem usage count for the battle (stratagemId -> usage count) */
  stratagemUsage: Record<string, number>;
  katah: string | null;
  /** Tracks active detachment rule choices (ruleId -> choiceId) */
  activeRuleChoices: Record<string, string>;
  /** Tracks per-round selections that need confirmation after round change (ruleId -> true) */
  pendingRoundConfirmations: Record<string, boolean>;
  collapsedLoadoutGroups: Record<number, Record<string, boolean>>;
  activatedLoadoutGroups: Record<number, Record<string, boolean>>;
  collapsedLeaders: Record<number, boolean>;
  activatedLeaders: Record<number, boolean>;
  /** Tracks casualties per weapon loadout group per unit (unitIndex -> groupId -> casualty count) */
  loadoutCasualties: Record<number, Record<string, number>>;
  /** Tracks used once-per-battle abilities (unitIndex -> abilityId -> used) */
  usedAbilities?: Record<number, Record<string, boolean>>;
}

// ============================================================================
// UI State
// ============================================================================

export type AppMode = 'build' | 'play';

export interface UIState {
  mode: AppMode;
  selectedUnitIndex: number | null;
  isLoading: boolean;
  error: string | null;
}

// ============================================================================
// Validation Errors
// ============================================================================

export interface ValidationError {
  type: 'points' | 'format' | 'leader' | 'maxModels' | 'loadout';
  message: string;
  unitIndex?: number;
}

// ============================================================================
// Helper Types
// ============================================================================

export interface WeaponWithCount extends Weapon {
  count: number;
  isPaired?: boolean;
}

export interface LoadoutGroup {
  id: string;
  name: string;
  modelCount: number;
  isPaired: boolean;
  weapons: Weapon[];
  rangedWeapons: Weapon[];
  meleeWeapons: Weapon[];
}

export interface AvailableLeader {
  unitIndex: number;
  unitId: string;
  name: string;
  enhancement: string;
}

export interface ModifierSource {
  name: string;
  value: number;
  operation: ModifierOperation;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface SavedListInfo {
  id?: string;        // Database ID (when signed in)
  filename: string;   // localStorage key (for guests) or derived name
  name: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// Database Types (matching Prisma schema)
// ============================================================================

// User record from database
export interface DbUser {
  id: string;
  email: string;
  name: string | null;
  googleId: string | null;
  createdAt: Date;
}

// List record from database
export interface DbList {
  id: string;
  userId: string;
  name: string;
  armyId: string;
  data: string; // JSON string of CurrentList
  createdAt: Date;
  updatedAt: Date;
}

// List with user relation
export interface DbListWithUser extends DbList {
  user: DbUser;
}

// Input type for creating a user
export interface CreateUserInput {
  email: string;
  name?: string;
  googleId?: string;
}

// Input type for creating a list
export interface CreateListInput {
  userId: string;
  name: string;
  armyId: string;
  data: CurrentList;
}

// Input type for updating a list
export interface UpdateListInput {
  name?: string;
  armyId?: string;
  data?: CurrentList;
}

// Re-export realtime types
export * from './realtime';
