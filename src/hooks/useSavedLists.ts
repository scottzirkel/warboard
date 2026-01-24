'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CurrentList, SavedListInfo } from '@/types';

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'army-tracker-saved-lists';

// ============================================================================
// Types
// ============================================================================

interface SavedListsData {
  lists: Record<string, CurrentList>;
}

interface UseSavedListsReturn {
  lists: SavedListInfo[];
  isLoading: boolean;
  error: string | null;
  fetchLists: () => void;
  loadList: (filename: string) => Promise<CurrentList | null>;
  saveList: (list: CurrentList) => Promise<boolean>;
  deleteList: (filename: string) => Promise<boolean>;
}

// ============================================================================
// LocalStorage Helpers
// ============================================================================

function getStoredLists(): SavedListsData {
  if (typeof window === 'undefined') {
    return { lists: {} };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return { lists: {} };
    }

    return JSON.parse(stored) as SavedListsData;
  } catch {
    return { lists: {} };
  }
}

function setStoredLists(data: SavedListsData): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

function generateFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .concat('.json');
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing saved army lists via localStorage.
 *
 * Provides list, load, save, and delete operations with loading and error states.
 */
export function useSavedLists(): UseSavedListsReturn {
  const [lists, setLists] = useState<SavedListInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Fetch all saved lists
  // -------------------------------------------------------------------------

  const fetchLists = useCallback(() => {
    setIsLoading(true);
    setError(null);

    try {
      const data = getStoredLists();
      const listInfos: SavedListInfo[] = Object.entries(data.lists).map(([filename, list]) => ({
        filename,
        name: list.name || filename.replace('.json', ''),
      }));

      // Sort by name
      listInfos.sort((a, b) => a.name.localeCompare(b.name));
      setLists(listInfos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch lists');
      setLists([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch lists on mount
  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  // -------------------------------------------------------------------------
  // Load a specific list
  // -------------------------------------------------------------------------

  const loadList = useCallback(async (filename: string): Promise<CurrentList | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const data = getStoredLists();
      const list = data.lists[filename];

      if (!list) {
        setError('List not found');
        return null;
      }

      return list;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load list');
      return null;
    } finally {
      setIsLoading(false);
    }
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

    try {
      const filename = generateFilename(list.name);
      const data = getStoredLists();

      data.lists[filename] = list;
      setStoredLists(data);

      // Refresh the lists to include the new/updated one
      fetchLists();

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save list');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchLists]);

  // -------------------------------------------------------------------------
  // Delete a list
  // -------------------------------------------------------------------------

  const deleteList = useCallback(async (filename: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const data = getStoredLists();

      if (!data.lists[filename]) {
        setError('List not found');
        return false;
      }

      delete data.lists[filename];
      setStoredLists(data);

      // Refresh the lists to remove the deleted one
      fetchLists();

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete list');
      return false;
    } finally {
      setIsLoading(false);
    }
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

export { generateFilename };

/**
 * Extract display name from a filename.
 */
export function filenameToDisplayName(filename: string): string {
  return filename
    .replace(/\.json$/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
