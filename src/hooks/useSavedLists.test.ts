import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSavedLists, generateFilename, filenameToDisplayName } from './useSavedLists';
import type { CurrentList } from '@/types';

// ============================================================================
// Mock Setup
// ============================================================================

const STORAGE_KEY = 'army-tracker-saved-lists';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// ============================================================================
// Test Data
// ============================================================================

const mockList: CurrentList = {
  name: 'Test Army',
  army: 'custodes',
  pointsLimit: 2000,
  format: 'standard',
  detachment: 'shield_host',
  units: [],
};

const mockList2: CurrentList = {
  name: 'Another List',
  army: 'custodes',
  pointsLimit: 1000,
  format: 'standard',
  detachment: 'shield_host',
  units: [],
};

// ============================================================================
// Tests
// ============================================================================

describe('useSavedLists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  // --------------------------------------------------------------------------
  // Initial State and Fetch
  // --------------------------------------------------------------------------

  describe('initial fetch', () => {
    it('fetches lists on mount from localStorage', async () => {
      const storedData = {
        lists: {
          'test-army.json': mockList,
          'another-list.json': mockList2,
        },
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));

      const { result } = renderHook(() => useSavedLists());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.lists).toHaveLength(2);
      expect(result.current.error).toBeNull();
      expect(localStorageMock.getItem).toHaveBeenCalledWith(STORAGE_KEY);
    });

    it('returns empty list when localStorage is empty', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useSavedLists());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.lists).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('handles malformed localStorage data gracefully', async () => {
      localStorageMock.getItem.mockReturnValue('not valid json');

      const { result } = renderHook(() => useSavedLists());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.lists).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // Load List
  // --------------------------------------------------------------------------

  describe('loadList', () => {
    it('loads a list by filename', async () => {
      const storedData = {
        lists: {
          'test-army.json': mockList,
        },
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));

      const { result } = renderHook(() => useSavedLists());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let loadedList: CurrentList | null = null;
      await act(async () => {
        loadedList = await result.current.loadList('test-army.json');
      });

      expect(loadedList).toEqual(mockList);
      expect(result.current.error).toBeNull();
    });

    it('returns null and sets error when list not found', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({ lists: {} }));

      const { result } = renderHook(() => useSavedLists());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let loadedList: CurrentList | null = null;
      await act(async () => {
        loadedList = await result.current.loadList('nonexistent.json');
      });

      expect(loadedList).toBeNull();
      expect(result.current.error).toBe('List not found');
    });

    it('shows loading state during operation', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({ lists: { 'test-army.json': mockList } }));

      const { result } = renderHook(() => useSavedLists());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.loadList('test-army.json');
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Save List
  // --------------------------------------------------------------------------

  describe('saveList', () => {
    it('saves a list successfully to localStorage', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({ lists: {} }));

      const { result } = renderHook(() => useSavedLists());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success = false;
      await act(async () => {
        success = await result.current.saveList(mockList);
      });

      expect(success).toBe(true);
      expect(result.current.error).toBeNull();
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('updates existing list when saving with same name', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        lists: { 'test-army.json': mockList },
      }));

      const { result } = renderHook(() => useSavedLists());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const updatedList = { ...mockList, pointsLimit: 1500 };

      await act(async () => {
        await result.current.saveList(updatedList);
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('returns false when name is empty', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({ lists: {} }));

      const { result } = renderHook(() => useSavedLists());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const listWithoutName = { ...mockList, name: '' };

      let success = false;
      await act(async () => {
        success = await result.current.saveList(listWithoutName);
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('List name is required');
    });

    it('shows loading state during operation', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({ lists: {} }));

      const { result } = renderHook(() => useSavedLists());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.saveList(mockList);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Delete List
  // --------------------------------------------------------------------------

  describe('deleteList', () => {
    it('deletes a list successfully from localStorage', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        lists: {
          'test-army.json': mockList,
          'another-list.json': mockList2,
        },
      }));

      const { result } = renderHook(() => useSavedLists());

      await waitFor(() => {
        expect(result.current.lists).toHaveLength(2);
      });

      let success = false;
      await act(async () => {
        success = await result.current.deleteList('test-army.json');
      });

      expect(success).toBe(true);
      expect(result.current.error).toBeNull();
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('returns false when list not found', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({ lists: {} }));

      const { result } = renderHook(() => useSavedLists());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success = false;
      await act(async () => {
        success = await result.current.deleteList('nonexistent.json');
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('List not found');
    });

    it('shows loading state during operation', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        lists: { 'test-army.json': mockList },
      }));

      const { result } = renderHook(() => useSavedLists());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteList('test-army.json');
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Fetch Lists
  // --------------------------------------------------------------------------

  describe('fetchLists', () => {
    it('can manually refresh the list', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({ lists: {} }));

      const { result } = renderHook(() => useSavedLists());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.lists).toEqual([]);

      // Update localStorage and refresh
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        lists: { 'test-army.json': mockList },
      }));

      act(() => {
        result.current.fetchLists();
      });

      await waitFor(() => {
        expect(result.current.lists).toHaveLength(1);
      });
    });

    it('sorts lists alphabetically by name', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        lists: {
          'zebra.json': { ...mockList, name: 'Zebra' },
          'alpha.json': { ...mockList, name: 'Alpha' },
          'beta.json': { ...mockList, name: 'Beta' },
        },
      }));

      const { result } = renderHook(() => useSavedLists());

      await waitFor(() => {
        expect(result.current.lists).toHaveLength(3);
      });

      expect(result.current.lists[0].name).toBe('Alpha');
      expect(result.current.lists[1].name).toBe('Beta');
      expect(result.current.lists[2].name).toBe('Zebra');
    });
  });
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe('generateFilename', () => {
  it('converts spaces to hyphens', () => {
    expect(generateFilename('My Test List')).toBe('my-test-list.json');
  });

  it('removes special characters', () => {
    expect(generateFilename('Test @#$% List!')).toBe('test--list.json');
  });

  it('converts to lowercase', () => {
    expect(generateFilename('MyTestList')).toBe('mytestlist.json');
  });

  it('adds .json extension', () => {
    expect(generateFilename('test')).toBe('test.json');
  });
});

describe('filenameToDisplayName', () => {
  it('removes .json extension', () => {
    expect(filenameToDisplayName('test.json')).toBe('Test');
  });

  it('replaces hyphens with spaces', () => {
    expect(filenameToDisplayName('my-test-list.json')).toBe('My Test List');
  });

  it('capitalizes first letter of each word', () => {
    expect(filenameToDisplayName('my-list.json')).toBe('My List');
  });
});
