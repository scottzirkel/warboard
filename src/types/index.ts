// ============================================================================
// Stat Modifiers
// ============================================================================

export type ModifierOperation = 'add' | 'subtract' | 'multiply' | 'set';
export type ModifierScope = 'model' | 'unit' | 'melee' | 'ranged' | 'weapon' | 'all';
export type StatKey = 'm' | 't' | 'sv' | 'w' | 'ld' | 'oc' | 'a' | 's' | 'ap' | 'd' | 'bs' | 'ws' | 'range';

export interface Modifier {
  stat: StatKey;
  operation: ModifierOperation;
  value: number;
  scope: ModifierScope;
  source?: string;
  condition?: string;
}

// ============================================================================
// Weapon Types
// ============================================================================

export type WeaponType = 'melee' | 'ranged' | 'equipment';

export interface RangedWeaponStats {
  range: number;
  a: number | string; // Can be "D6", "D6+1", etc.
  bs: string; // "2+", "3+", "N/A"
  s: number;
  ap: number;
  d: number | string; // Can be "D6", "D6+1", etc.
}

export interface MeleeWeaponStats {
  a: number | string; // Can be "D6", "D6+1", etc.
  ws: string; // "2+", "3+"
  s: number;
  ap: number;
  d: number | string; // Can be "D6", "D6+1", etc.
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface EquipmentStats {
  // Empty object for equipment type weapons - represents equipment with no stats
}

export type WeaponStats = RangedWeaponStats | MeleeWeaponStats | EquipmentStats;

export interface Weapon {
  id: string;
  name: string;
  type: WeaponType;
  stats: WeaponStats;
  abilities: string[];
  loadoutGroup?: string;
  modifiers?: Modifier[];
}

// ============================================================================
// Abilities
// ============================================================================

export interface Ability {
  id: string;
  name: string;
  description: string;
  loadoutGroup?: string;
  eligibleUnits?: string[]; // For Leader ability
}

// ============================================================================
// Loadout Options
// ============================================================================

export type LoadoutOptionType = 'choice' | 'optional';
export type LoadoutPattern = 'replacement' | 'addition';

export interface LoadoutChoice {
  id: string;
  name: string;
  default?: boolean;
  maxModels?: number;
  paired?: boolean;
}

export interface LoadoutOption {
  id: string;
  name: string;
  type: LoadoutOptionType;
  pattern: LoadoutPattern;
  choices: LoadoutChoice[];
}

// ============================================================================
// Units
// ============================================================================

export interface UnitStats {
  m: number;
  t: number;
  sv: string; // "2+", "3+"
  w: number;
  ld: string; // "6+", "5+"
  oc: number;
}

export interface Unit {
  id: string;
  bsdataId?: string; // BSData entry ID for .rosz export
  name: string;
  points: Record<string, number>; // { "4": 150, "5": 190 }
  stats: UnitStats;
  invuln: string | null; // "4+", "5+", or null
  weapons: Weapon[];
  loadoutOptions?: LoadoutOption[];
  abilities: Ability[];
  keywords: string[];
}

// ============================================================================
// Enhancements
// ============================================================================

export interface Enhancement {
  id: string;
  name: string;
  points: number;
  description: string;
  modifiers?: Modifier[];
  eligibleKeywords?: string[]; // Unit must have at least one of these keywords
}

// ============================================================================
// Stratagems
// ============================================================================

export interface Stratagem {
  id: string;
  name: string;
  cost: number;
  phase: string;
  description: string;
  modifiers?: Modifier[];
}

// ============================================================================
// Mission Twists (Chapter Approved)
// ============================================================================

export interface MissionTwist {
  id: string;
  name: string;
  description: string;
  /** Which player this affects: 'both', 'attacker', 'defender', 'overlord', 'underdog' */
  affects: 'both' | 'attacker' | 'defender' | 'overlord' | 'underdog';
  modifiers?: Modifier[];
}

// ============================================================================
// Detachment Rules
// ============================================================================

export type DetachmentRuleType = 'passive' | 'aura' | 'selection';

export interface DetachmentRuleBonus {
  condition: string;
  effect: string;
}

export interface DetachmentRuleChoice {
  id: string;
  name: string;
  effect: string;
}

export interface DetachmentRule {
  id: string;
  name: string;
  description: string;
  type?: DetachmentRuleType;
  modifiers?: Modifier[];
  bonuses?: DetachmentRuleBonus[];
  choices?: DetachmentRuleChoice[];
}

// ============================================================================
// Detachments
// ============================================================================

export interface Detachment {
  name: string;
  rules: DetachmentRule[];
  stratagems: Stratagem[];
  enhancements: Enhancement[];
}

// ============================================================================
// Army Rules
// ============================================================================

export interface ArmyRuleStance {
  id: string;
  name: string;
  description: string;
  modifiers?: Modifier[];
}

export interface ArmyRule {
  name: string;
  description: string;
  range?: number;
  keywords?: string[];
  oncePerBattle?: boolean;
  stances?: ArmyRuleStance[];
}

// ============================================================================
// Keyword Glossary
// ============================================================================

export interface KeywordDefinition {
  name: string;
  description: string;
}

export interface KeywordGlossary {
  faction?: Record<string, KeywordDefinition>;
  unit?: KeywordDefinition[];
  weapon?: KeywordDefinition[];
}

// ============================================================================
// Weapon Keywords
// ============================================================================

export interface WeaponKeyword {
  name: string;
  description: string;
}

// ============================================================================
// Army Data (Full Faction JSON)
// ============================================================================

export interface AllyFaction {
  name: string;
  description: string;
  units: Unit[];
}

export interface ArmyData {
  faction: string;
  lastUpdated: string;
  // BSData metadata for .rosz export
  catalogueId?: string; // BSData catalogue ID (e.g., "1f19-6509-d906-ca10")
  gameSystemId?: string; // BSData game system ID (e.g., "sys-352e-adc2-7639-d6a9")
  armyRules?: Record<string, ArmyRule>;
  units: Unit[];
  detachments: Record<string, Detachment>;
  allies?: Record<string, AllyFaction>;
  weaponKeywords?: Record<string, WeaponKeyword>;
  keywordGlossary?: KeywordGlossary;
  glossary?: Record<string, unknown>;
}

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
}

// ============================================================================
// Current List (Full Army List)
// ============================================================================

export type GameFormat = 'standard' | 'colosseum';

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

export interface GameState {
  battleRound: number;
  commandPoints: number;
  activeStratagems: string[];
  /** Active mission twists (Chapter Approved) */
  activeTwists: string[];
  katah: string | null;
  collapsedLoadoutGroups: Record<number, Record<string, boolean>>;
  activatedLoadoutGroups: Record<number, Record<string, boolean>>;
  collapsedLeaders: Record<number, boolean>;
  activatedLeaders: Record<number, boolean>;
  /** Tracks casualties per weapon loadout group per unit (unitIndex -> groupId -> casualty count) */
  loadoutCasualties: Record<number, Record<string, number>>;
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
  filename: string;
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
