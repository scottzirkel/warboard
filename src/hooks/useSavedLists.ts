'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
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
  isSignedIn: boolean;
  fetchLists: () => void;
  loadList: (identifier: string) => Promise<CurrentList | null>;
  saveList: (list: CurrentList) => Promise<boolean>;
  deleteList: (identifier: string) => Promise<boolean>;
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
 * Hook for managing saved army lists.
 *
 * Dual-mode: uses localStorage for guests and the /api/lists endpoints
 * for signed-in users.
 */
export function useSavedLists(): UseSavedListsReturn {
  const { data: session, status } = useSession();
  const isSignedIn = status === 'authenticated' && !!session?.user;

  const [lists, setLists] = useState<SavedListInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Fetch all saved lists
  // -------------------------------------------------------------------------

  const fetchLists = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (isSignedIn) {
        const res = await fetch('/api/lists');

        if (!res.ok) {
          throw new Error('Failed to fetch lists from server');
        }

        const data = await res.json();
        const listInfos: SavedListInfo[] = data.map((item: { id: string; filename: string; name: string }) => ({
          id: item.id,
          filename: item.id, // Use ID as filename for LoadModal compatibility
          name: item.name,
        }));

        listInfos.sort((a, b) => a.name.localeCompare(b.name));
        setLists(listInfos);
      } else {
        const data = getStoredLists();
        const listInfos: SavedListInfo[] = Object.entries(data.lists).map(([filename, list]) => ({
          filename,
          name: list.name || filename.replace('.json', ''),
        }));

        listInfos.sort((a, b) => a.name.localeCompare(b.name));
        setLists(listInfos);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch lists');
      setLists([]);
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn]);

  // Re-fetch lists when auth state changes
  useEffect(() => {
    if (status !== 'loading') {
      fetchLists();
    }
  }, [status, fetchLists]);

  // -------------------------------------------------------------------------
  // Load a specific list
  // -------------------------------------------------------------------------

  const loadList = useCallback(async (identifier: string): Promise<CurrentList | null> => {
    setIsLoading(true);
    setError(null);

    try {
      if (isSignedIn) {
        const res = await fetch(`/api/lists/${encodeURIComponent(identifier)}`);

        if (!res.ok) {
          setError('List not found');
          return null;
        }

        const data = await res.json();

        // The API returns the full list data with extra fields
        const list: CurrentList = {
          name: data.name,
          army: data.army,
          pointsLimit: data.pointsLimit,
          format: data.format,
          detachment: data.detachment,
          units: data.units,
        };

        return list;
      }

      // Guest mode: localStorage
      const data = getStoredLists();
      const list = data.lists[identifier];

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
  }, [isSignedIn]);

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
      if (isSignedIn) {
        const res = await fetch('/api/lists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(list),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to save list');
        }

        await fetchLists();
        return true;
      }

      // Guest mode: localStorage
      const filename = generateFilename(list.name);
      const data = getStoredLists();
      data.lists[filename] = list;
      setStoredLists(data);
      await fetchLists();

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save list');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, fetchLists]);

  // -------------------------------------------------------------------------
  // Delete a list
  // -------------------------------------------------------------------------

  const deleteList = useCallback(async (identifier: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      if (isSignedIn) {
        const res = await fetch(`/api/lists/${encodeURIComponent(identifier)}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          setError('Failed to delete list');
          return false;
        }

        await fetchLists();
        return true;
      }

      // Guest mode: localStorage
      const data = getStoredLists();

      if (!data.lists[identifier]) {
        setError('List not found');
        return false;
      }

      delete data.lists[identifier];
      setStoredLists(data);
      await fetchLists();

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete list');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, fetchLists]);

  return {
    lists,
    isLoading,
    error,
    isSignedIn,
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

/**
 * Get all lists currently stored in localStorage.
 * Used by the migration modal to detect lists that can be imported.
 */
export function getLocalStorageLists(): SavedListInfo[] {
  const data = getStoredLists();

  return Object.entries(data.lists).map(([filename, list]) => ({
    filename,
    name: list.name || filename.replace('.json', ''),
  }));
}

/**
 * Load a specific list from localStorage by filename.
 * Used by the migration modal to read list data for import.
 */
export function getLocalStorageList(filename: string): CurrentList | null {
  const data = getStoredLists();
  return data.lists[filename] || null;
}

/**
 * Remove specific lists from localStorage.
 * Used after successful migration to database.
 */
export function removeLocalStorageLists(filenames: string[]): void {
  const data = getStoredLists();

  for (const filename of filenames) {
    delete data.lists[filename];
  }

  setStoredLists(data);
}
