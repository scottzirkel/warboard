'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ArmyData } from '@/types';
import { availableArmies, type AvailableArmy } from '@/stores/armyStore';

// ============================================================================
// Types
// ============================================================================

interface UseFactionDataReturn {
  data: ArmyData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// ============================================================================
// Cache
// ============================================================================

// Simple in-memory cache for faction data to avoid refetching
const factionCache = new Map<string, ArmyData>();

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for fetching and caching faction JSON data.
 *
 * @param armyId - The army ID to fetch data for (e.g., 'custodes', 'tyranids')
 * @returns Object with data, loading state, error state, and refetch function
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useFactionData('custodes');
 *
 * if (isLoading) return <LoadingSpinner />;
 * if (error) return <ErrorMessage message={error} />;
 * if (!data) return null;
 *
 * return <UnitList units={data.units} />;
 * ```
 */
export function useFactionData(armyId: string | null): UseFactionDataReturn {
  const [data, setData] = useState<ArmyData | null>(() => {
    // Initialize from cache if available
    if (armyId && factionCache.has(armyId)) {
      return factionCache.get(armyId) || null;
    }

    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!armyId) {
      setData(null);
      setError(null);
      return;
    }

    // Check cache first
    if (factionCache.has(armyId)) {
      setData(factionCache.get(armyId) || null);
      setError(null);
      return;
    }

    // Find the army configuration
    const army = availableArmies.find((a: AvailableArmy) => a.id === armyId);

    if (!army) {
      setError(`Unknown army: ${armyId}`);
      setData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/data/${army.file}`);

      if (!response.ok) {
        throw new Error(`Failed to load army data: ${response.statusText}`);
      }

      const jsonData: ArmyData = await response.json();

      // Cache the data
      factionCache.set(armyId, jsonData);

      setData(jsonData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load army data';
      setError(errorMessage);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [armyId]);

  // Fetch data when armyId changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Force refetch (bypasses cache)
  const refetch = useCallback(async () => {
    if (armyId) {
      // Clear cache for this army
      factionCache.delete(armyId);
    }

    await fetchData();
  }, [armyId, fetchData]);

  return { data, isLoading, error, refetch };
}

// ============================================================================
// Cache Utilities
// ============================================================================

/**
 * Clear the faction data cache for a specific army or all armies.
 */
export function clearFactionCache(armyId?: string): void {
  if (armyId) {
    factionCache.delete(armyId);
  } else {
    factionCache.clear();
  }
}

/**
 * Pre-fetch faction data into the cache.
 */
export async function prefetchFactionData(armyId: string): Promise<ArmyData | null> {
  // Check cache first
  if (factionCache.has(armyId)) {
    return factionCache.get(armyId) || null;
  }

  const army = availableArmies.find((a: AvailableArmy) => a.id === armyId);

  if (!army) {
    return null;
  }

  try {
    const response = await fetch(`/data/${army.file}`);

    if (!response.ok) {
      return null;
    }

    const data: ArmyData = await response.json();
    factionCache.set(armyId, data);

    return data;
  } catch {
    return null;
  }
}

/**
 * Get available armies list.
 */
export function getAvailableArmies(): AvailableArmy[] {
  return availableArmies.filter(army => !army.disabled);
}
