// ============================================================================
// Data Loading Hooks
// ============================================================================

export {
  useFactionData,
  clearFactionCache,
  prefetchFactionData,
  getAvailableArmies,
} from './useFactionData';

export {
  useSavedLists,
  generateFilename,
  filenameToDisplayName,
} from './useSavedLists';

// ============================================================================
// Weapon & Loadout Hooks
// ============================================================================

export {
  useWeaponCounts,
  calculateDefaultWeaponCounts,
  validateWeaponCounts,
} from './useWeaponCounts';

export type {
  WeaponCountState,
  LoadoutOptionState,
  WeaponCountsResult,
} from './useWeaponCounts';

// ============================================================================
// Leader Attachment Hook
// ============================================================================

export {
  useLeaderAttachment,
} from './useLeaderAttachment';

export type {
  LeaderAttachmentResult,
  UseLeaderAttachmentReturn,
} from './useLeaderAttachment';

// ============================================================================
// Wake Lock Hook
// ============================================================================

export {
  useWakeLock,
} from './useWakeLock';

export type {
  UseWakeLockResult,
} from './useWakeLock';
