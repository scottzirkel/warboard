import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWakeLock } from './useWakeLock';

// ============================================================================
// Mock Setup
// ============================================================================

interface MockWakeLockSentinel {
  released: boolean;
  type: 'screen';
  release: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  onrelease?: () => void;
}

const createMockWakeLockSentinel = (): MockWakeLockSentinel => ({
  released: false,
  type: 'screen',
  release: vi.fn().mockResolvedValue(undefined),
  addEventListener: vi.fn((type: string, listener: () => void) => {
    if (type === 'release') {
      // Store the listener so we can trigger it manually
      mockSentinel.onrelease = listener;
    }
  }),
  removeEventListener: vi.fn(),
});

let mockSentinel: MockWakeLockSentinel;
let mockWakeLock: {
  request: ReturnType<typeof vi.fn>;
};

const setupWakeLockMock = () => {
  mockSentinel = createMockWakeLockSentinel();
  mockWakeLock = {
    request: vi.fn().mockResolvedValue(mockSentinel),
  };
  Object.defineProperty(navigator, 'wakeLock', {
    value: mockWakeLock,
    writable: true,
    configurable: true,
  });
};

const removeWakeLockMock = () => {
  // @ts-expect-error - Removing wakeLock property for test cleanup
  delete navigator.wakeLock;
};

// ============================================================================
// Tests
// ============================================================================

describe('useWakeLock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    removeWakeLockMock();
  });

  describe('when Wake Lock API is not supported', () => {
    it('returns isSupported as false', () => {
      const { result } = renderHook(() => useWakeLock(true));

      expect(result.current.isSupported).toBe(false);
      expect(result.current.isActive).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('does not throw when enabled', () => {
      expect(() => {
        renderHook(() => useWakeLock(true));
      }).not.toThrow();
    });

    it('request and release are no-ops', async () => {
      const { result } = renderHook(() => useWakeLock(false));

      await act(async () => {
        await result.current.request();
        await result.current.release();
      });

      expect(result.current.isActive).toBe(false);
    });
  });

  describe('when Wake Lock API is supported', () => {
    beforeEach(() => {
      setupWakeLockMock();
    });

    it('returns isSupported as true', () => {
      const { result } = renderHook(() => useWakeLock(false));

      expect(result.current.isSupported).toBe(true);
    });

    it('does not acquire wake lock when disabled', () => {
      renderHook(() => useWakeLock(false));

      expect(mockWakeLock.request).not.toHaveBeenCalled();
    });

    it('acquires wake lock when enabled', async () => {
      const { result } = renderHook(() => useWakeLock(true));

      await waitFor(() => {
        expect(result.current.isActive).toBe(true);
      });

      expect(mockWakeLock.request).toHaveBeenCalledWith('screen');
    });

    it('calls release when disabled after being enabled', async () => {
      const { rerender } = renderHook(
        ({ enabled }) => useWakeLock(enabled),
        { initialProps: { enabled: true } }
      );

      // Wait for initial acquisition
      await waitFor(() => {
        expect(mockWakeLock.request).toHaveBeenCalled();
      });

      // Disable the wake lock
      rerender({ enabled: false });

      // The release function should be called
      await waitFor(() => {
        expect(mockSentinel.release).toHaveBeenCalled();
      });
    });

    it('registers release event listener', async () => {
      renderHook(() => useWakeLock(true));

      await waitFor(() => {
        expect(mockSentinel.addEventListener).toHaveBeenCalledWith(
          'release',
          expect.any(Function)
        );
      });
    });

    it('updates isActive to false when release event fires', async () => {
      const { result } = renderHook(() => useWakeLock(true));

      await waitFor(() => {
        expect(result.current.isActive).toBe(true);
      });

      // Simulate the release event
      act(() => {
        if (mockSentinel.onrelease) {
          mockSentinel.onrelease();
        }
      });

      expect(result.current.isActive).toBe(false);
    });

    it('handles request error gracefully', async () => {
      const error = new Error('Wake lock denied');
      mockWakeLock.request.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useWakeLock(true));

      await waitFor(() => {
        expect(result.current.error).toEqual(error);
      });

      expect(result.current.isActive).toBe(false);
    });

    it('can manually request wake lock', async () => {
      const { result } = renderHook(() => useWakeLock(false));

      expect(result.current.isActive).toBe(false);

      await act(async () => {
        await result.current.request();
      });

      expect(result.current.isActive).toBe(true);
      expect(mockWakeLock.request).toHaveBeenCalledWith('screen');
    });

    it('can manually release wake lock', async () => {
      const { result } = renderHook(() => useWakeLock(true));

      await waitFor(() => {
        expect(result.current.isActive).toBe(true);
      });

      await act(async () => {
        await result.current.release();
      });

      expect(result.current.isActive).toBe(false);
      expect(mockSentinel.release).toHaveBeenCalled();
    });

    it('releases existing lock before acquiring new one', async () => {
      const { result } = renderHook(() => useWakeLock(true));

      await waitFor(() => {
        expect(result.current.isActive).toBe(true);
      });

      const firstSentinel = mockSentinel;
      mockSentinel = createMockWakeLockSentinel();
      mockWakeLock.request.mockResolvedValueOnce(mockSentinel);

      await act(async () => {
        await result.current.request();
      });

      expect(firstSentinel.release).toHaveBeenCalled();
    });

    it('cleans up wake lock on unmount', async () => {
      const { result, unmount } = renderHook(() => useWakeLock(true));

      await waitFor(() => {
        expect(result.current.isActive).toBe(true);
      });

      unmount();

      expect(mockSentinel.release).toHaveBeenCalled();
    });
  });

  describe('visibility change handling', () => {
    beforeEach(() => {
      setupWakeLockMock();
    });

    it('re-acquires wake lock when tab becomes visible', async () => {
      const { result } = renderHook(() => useWakeLock(true));

      await waitFor(() => {
        expect(result.current.isActive).toBe(true);
      });

      // Clear the call count
      mockWakeLock.request.mockClear();

      // Simulate visibility change to visible
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true,
      });

      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      await waitFor(() => {
        expect(mockWakeLock.request).toHaveBeenCalledWith('screen');
      });
    });

    it('does not re-acquire when disabled', async () => {
      const { result } = renderHook(() => useWakeLock(false));

      expect(result.current.isActive).toBe(false);

      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true,
      });

      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(mockWakeLock.request).not.toHaveBeenCalled();
    });
  });
});
