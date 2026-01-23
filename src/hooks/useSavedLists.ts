'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CurrentList, SavedListInfo, ApiResponse } from '@/types';
import { migrateList, needsMigration } from '@/lib/migrateList';

// ============================================================================
// Types
// ============================================================================

interface UseSavedListsReturn {
  lists: SavedListInfo[];
  isLoading: boolean;
  error: string | null;
  fetchLists: () => Promise<void>;
  loadList: (filename: string) => Promise<CurrentList | null>;
  saveList: (list: CurrentList) => Promise<boolean>;
  deleteList: (filename: string) => Promise<boolean>;
}

// ============================================================================
// API Helpers
// ============================================================================

const API_BASE = '/api/lists';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Request failed: ${response.statusText}`,
      };
    }

    const data = await response.json();

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Request failed',
    };
  }
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing saved army lists via API.
 *
 * Provides list, load, save, and delete operations with loading and error states.
 *
 * @example
 * ```tsx
 * const { lists, isLoading, error, saveList, loadList, deleteList } = useSavedLists();
 *
 * // Save current list
 * const success = await saveList(currentList);
 *
 * // Load a specific list
 * const loadedList = await loadList('my-list.json');
 *
 * // Delete a list
 * await deleteList('old-list.json');
 * ```
 */
export function useSavedLists(): UseSavedListsReturn {
  const [lists, setLists] = useState<SavedListInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Fetch all saved lists
  // -------------------------------------------------------------------------

  const fetchLists = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await fetchJson<SavedListInfo[]>(API_BASE);

    if (result.success && result.data) {
      setLists(result.data);
    } else {
      setError(result.error || 'Failed to fetch lists');
      setLists([]);
    }

    setIsLoading(false);
  }, []);

  // Fetch lists on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Data fetching on mount is a valid pattern
    void fetchLists();
  }, [fetchLists]);

  // -------------------------------------------------------------------------
  // Load a specific list
  // -------------------------------------------------------------------------

  const loadList = useCallback(async (filename: string): Promise<CurrentList | null> => {
    setIsLoading(true);
    setError(null);

    const result = await fetchJson<unknown>(`${API_BASE}/${encodeURIComponent(filename)}`);

    setIsLoading(false);

    if (result.success && result.data) {
      // Migrate old list format to new format if needed
      if (needsMigration(result.data)) {
        try {
          return migrateList(result.data);
        } catch {
          setError('Failed to migrate old list format');
          return null;
        }
      }

      return result.data as CurrentList;
    }

    setError(result.error || 'Failed to load list');

    return null;
  }, []);

  // -------------------------------------------------------------------------
  // Save a list
  // -------------------------------------------------------------------------

  const saveList = useCallback(async (list: CurrentList): Promise<boolean> => {
    if (!list.name) {
      setError('List name is required');
      return false;
    }

    setIsLoading(true);
    setError(null);

    const result = await fetchJson<{ filename: string }>(API_BASE, {
      method: 'POST',
      body: JSON.stringify(list),
    });

    setIsLoading(false);

    if (result.success) {
      // Refresh the lists to include the new/updated one
      await fetchLists();

      return true;
    }

    setError(result.error || 'Failed to save list');

    return false;
  }, [fetchLists]);

  // -------------------------------------------------------------------------
  // Delete a list
  // -------------------------------------------------------------------------

  const deleteList = useCallback(async (filename: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    const result = await fetchJson<void>(`${API_BASE}/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    });

    setIsLoading(false);

    if (result.success) {
      // Refresh the lists to remove the deleted one
      await fetchLists();

      return true;
    }

    setError(result.error || 'Failed to delete list');

    return false;
  }, [fetchLists]);

  return {
    lists,
    isLoading,
    error,
    fetchLists,
    loadList,
    saveList,
    deleteList,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a filename from a list name.
 * Converts to lowercase, replaces spaces with hyphens, removes special characters.
 */
export function generateFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .concat('.json');
}

/**
 * Extract display name from a filename.
 */
export function filenameToDisplayName(filename: string): string {
  return filename
    .replace(/\.json$/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
