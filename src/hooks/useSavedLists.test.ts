import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSavedLists, generateFilename, filenameToDisplayName } from './useSavedLists';
import type { CurrentList } from '@/types';

// ============================================================================
// Mock Setup
// ============================================================================

const mockFetch = vi.fn();
global.fetch = mockFetch;

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

const mockSavedLists = [
  { filename: 'Test_Army.json', name: 'Test Army' },
  { filename: 'Another_List.json', name: 'Another List' },
];

// ============================================================================
// Helper Functions
// ============================================================================

function createMockResponse<T>(data: T, ok = true, statusText = 'OK'): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    statusText,
    json: () => Promise.resolve(data),
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: '',
    clone: () => createMockResponse(data, ok, statusText),
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    text: () => Promise.resolve(JSON.stringify(data)),
    bytes: () => Promise.resolve(new Uint8Array()),
  } as Response;
}

// ============================================================================
// Tests
// ============================================================================

describe('useSavedLists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // Initial State and Fetch
  // --------------------------------------------------------------------------

  describe('initial fetch', () => {
    it('fetches lists on mount', async () => {
      mockFetch.mockResolvedValue(createMockResponse(mockSavedLists));

      const { result } = renderHook(() => useSavedLists());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.lists).toEqual(mockSavedLists);
      expect(result.current.error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith('/api/lists', expect.any(Object));
    });

    it('sets error when fetch fails', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ error: 'Server error' }, false, 'Error'));

      const { result } = renderHook(() => useSavedLists());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Request failed: Error');
      expect(result.current.lists).toEqual([]);
    });

    it('handles network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useSavedLists());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.lists).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // Load List
  // --------------------------------------------------------------------------

  describe('loadList', () => {
    it('loads a list by filename', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse([])) // Initial fetch
        .mockResolvedValueOnce(createMockResponse(mockList)); // Load list

      const { result } = renderHook(() => useSavedLists());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let loadedList: CurrentList | null = null;
      await act(async () => {
        loadedList = await result.current.loadList('Test_Army.json');
      });

      expect(loadedList).toEqual(mockList);
      expect(result.current.error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/lists/Test_Army.json',
        expect.any(Object)
      );
    });

    it('encodes filename in URL', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse([])) // Initial fetch
        .mockResolvedValueOnce(createMockResponse(mockList)); // Load list

      const { result } = renderHook(() => useSavedLists());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.loadList('My List.json');
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/lists/My%20List.json',
        expect.any(Object)
      );
    });

    it('returns null and sets error on failure', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse([])) // Initial fetch
        .mockResolvedValueOnce(createMockResponse({ error: 'Not found' }, false, 'Error')); // Load list

      const { result } = renderHook(() => useSavedLists());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let loadedList: CurrentList | null = null;
      await act(async () => {
        loadedList = await result.current.loadList('Nonexistent.json');
      });

      expect(loadedList).toBeNull();
      expect(result.current.error).toBe('Request failed: Error');
    });

    it('shows loading state during operation', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse([])) // Initial fetch
        .mockResolvedValueOnce(createMockResponse(mockList)); // Load list

      const { result } = renderHook(() => useSavedLists());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify isLoading goes false after operation
      await act(async () => {
        await result.current.loadList('Test_Army.json');
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Save List
  // --------------------------------------------------------------------------

  describe('saveList', () => {
    it('saves a list successfully', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse([])) // Initial fetch
        .mockResolvedValueOnce(createMockResponse({ success: true, filename: 'Test_Army.json' })) // Save
        .mockResolvedValueOnce(createMockResponse(mockSavedLists)); // Refresh lists

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
      expect(mockFetch).toHaveBeenCalledWith('/api/lists', {
        method: 'POST',
        body: JSON.stringify(mockList),
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('refreshes list after successful save', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse([])) // Initial fetch
        .mockResolvedValueOnce(createMockResponse({ success: true, filename: 'Test_Army.json' })) // Save
        .mockResolvedValueOnce(createMockResponse(mockSavedLists)); // Refresh lists

      const { result } = renderHook(() => useSavedLists());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.saveList(mockList);
      });

      await waitFor(() => {
        expect(result.current.lists).toEqual(mockSavedLists);
      });
    });

    it('returns false when name is empty', async () => {
      mockFetch.mockResolvedValue(createMockResponse([])); // Initial fetch

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

    it('returns false and sets error on failure', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse([])) // Initial fetch
        .mockResolvedValueOnce(createMockResponse({ error: 'Save failed' }, false, 'Error')); // Save failure

      const { result } = renderHook(() => useSavedLists());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success = false;
      await act(async () => {
        success = await result.current.saveList(mockList);
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Request failed: Error');
    });

    it('shows loading state during operation', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse([])) // Initial fetch
        .mockResolvedValueOnce(createMockResponse({ success: true, filename: 'Test_Army.json' })) // Save
        .mockResolvedValueOnce(createMockResponse(mockSavedLists)); // Refresh lists

      const { result } = renderHook(() => useSavedLists());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify isLoading goes false after operation
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
    it('deletes a list successfully', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse(mockSavedLists)) // Initial fetch
        .mockResolvedValueOnce(createMockResponse({ success: true })) // Delete
        .mockResolvedValueOnce(createMockResponse([mockSavedLists[1]])); // Refresh lists

      const { result } = renderHook(() => useSavedLists());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success = false;
      await act(async () => {
        success = await result.current.deleteList('Test_Army.json');
      });

      expect(success).toBe(true);
      expect(result.current.error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith('/api/lists/Test_Army.json', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('refreshes list after successful delete', async () => {
      const remainingLists = [mockSavedLists[1]];

      mockFetch
        .mockResolvedValueOnce(createMockResponse(mockSavedLists)) // Initial fetch
        .mockResolvedValueOnce(createMockResponse({ success: true })) // Delete
        .mockResolvedValueOnce(createMockResponse(remainingLists)); // Refresh lists

      const { result } = renderHook(() => useSavedLists());

      await waitFor(() => {
        expect(result.current.lists).toEqual(mockSavedLists);
      });

      await act(async () => {
        await result.current.deleteList('Test_Army.json');
      });

      await waitFor(() => {
        expect(result.current.lists).toEqual(remainingLists);
      });
    });

    it('returns false and sets error on failure', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse([])) // Initial fetch
        .mockResolvedValueOnce(createMockResponse({ error: 'Not found' }, false, 'Error')); // Delete failure

      const { result } = renderHook(() => useSavedLists());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success = false;
      await act(async () => {
        success = await result.current.deleteList('Nonexistent.json');
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Request failed: Error');
    });

    it('encodes filename in URL', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse([])) // Initial fetch
        .mockResolvedValueOnce(createMockResponse({ success: true })) // Delete
        .mockResolvedValueOnce(createMockResponse([])); // Refresh lists

      const { result } = renderHook(() => useSavedLists());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteList('My List.json');
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/lists/My%20List.json',
        expect.any(Object)
      );
    });

    it('shows loading state during operation', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse(mockSavedLists)) // Initial fetch
        .mockResolvedValueOnce(createMockResponse({ success: true })) // Delete
        .mockResolvedValueOnce(createMockResponse([])); // Refresh lists

      const { result } = renderHook(() => useSavedLists());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify isLoading goes false after operation
      await act(async () => {
        await result.current.deleteList('Test_Army.json');
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Fetch Lists
  // --------------------------------------------------------------------------

  describe('fetchLists', () => {
    it('can manually refresh the list', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse([])) // Initial fetch
        .mockResolvedValueOnce(createMockResponse(mockSavedLists)); // Manual refresh

      const { result } = renderHook(() => useSavedLists());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.lists).toEqual([]);

      await act(async () => {
        await result.current.fetchLists();
      });

      expect(result.current.lists).toEqual(mockSavedLists);
    });

    it('clears error on successful refresh', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse({ error: 'Error' }, false, 'Error')) // Initial fetch fails
        .mockResolvedValueOnce(createMockResponse(mockSavedLists)); // Manual refresh succeeds

      const { result } = renderHook(() => useSavedLists());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      await act(async () => {
        await result.current.fetchLists();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.lists).toEqual(mockSavedLists);
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
