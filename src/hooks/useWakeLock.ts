'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Result type for the useWakeLock hook
 */
export interface UseWakeLockResult {
  /** Whether the wake lock is currently active */
  isActive: boolean;
  /** Whether the Wake Lock API is supported by the browser */
  isSupported: boolean;
  /** Any error that occurred while acquiring/managing the wake lock */
  error: Error | null;
  /** Manually request the wake lock */
  request: () => Promise<void>;
  /** Manually release the wake lock */
  release: () => Promise<void>;
}

/**
 * Hook to manage Screen Wake Lock API for preventing device sleep.
 *
 * The Wake Lock API prevents the device screen from dimming or locking
 * while the app is in use. This is useful for Play Mode where users
 * need to reference their army list during a game.
 *
 * @param enabled - Whether to acquire the wake lock (typically true in Play Mode)
 * @returns Object with wake lock state and control functions
 *
 * @example
 * ```tsx
 * function PlayMode({ isActive }: { isActive: boolean }) {
 *   const { isActive: wakeLockActive, isSupported, error } = useWakeLock(isActive);
 *
 *   return (
 *     <div>
 *       {isSupported && wakeLockActive && (
 *         <span>Screen will stay awake</span>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useWakeLock(enabled: boolean = false): UseWakeLockResult {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Check if Wake Lock API is supported
  const isSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

  // Request wake lock
  const request = useCallback(async () => {
    if (!isSupported) {
      return;
    }

    try {
      // Release any existing wake lock first
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }

      // Request new wake lock
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      setIsActive(true);
      setError(null);

      // Listen for the wake lock being released (e.g., when tab loses visibility)
      wakeLockRef.current.addEventListener('release', () => {
        setIsActive(false);
      });
    } catch (err) {
      // Wake lock can fail for various reasons:
      // - Document not visible
      // - Low battery mode
      // - System policy restrictions
      setError(err instanceof Error ? err : new Error('Failed to acquire wake lock'));
      setIsActive(false);
    }
  }, [isSupported]);

  // Release wake lock
  const release = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setIsActive(false);
      } catch (err) {
        // Ignore release errors - the lock may already be released
        setError(err instanceof Error ? err : new Error('Failed to release wake lock'));
      }
    }
  }, []);

  // Effect to acquire/release wake lock based on enabled state
  useEffect(() => {
    if (!isSupported) {
      return;
    }

    if (enabled) {
      request();
    } else {
      release();
    }

    // Cleanup on unmount
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {
          // Ignore cleanup errors
        });
        wakeLockRef.current = null;
      }
    };
  }, [enabled, isSupported, request, release]);

  // Effect to re-acquire wake lock when tab regains visibility
  useEffect(() => {
    if (!isSupported || !enabled) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled) {
        // Re-acquire wake lock when tab becomes visible again
        request();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, isSupported, request]);

  return {
    isActive,
    isSupported,
    error,
    request,
    release,
  };
}
