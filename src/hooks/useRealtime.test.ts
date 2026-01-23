import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRealtime } from './useRealtime';

// ============================================================================
// Mock EventSource
// ============================================================================

// Store instances for test access
const instances: MockEventSource[] = [];

class MockEventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  url: string;
  readyState: number = MockEventSource.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    instances.push(this);
  }

  close() {
    this.readyState = MockEventSource.CLOSED;
  }

  // Test helper to simulate events
  simulateOpen() {
    this.readyState = MockEventSource.OPEN;
    this.onopen?.(new Event('open'));
  }

  simulateMessage(data: unknown) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }));
  }

  simulateError() {
    this.readyState = MockEventSource.CLOSED;
    this.onerror?.(new Event('error'));
  }
}

function clearInstances() {
  instances.length = 0;
}

function getLatestInstance(): MockEventSource | undefined {
  return instances[instances.length - 1];
}

// ============================================================================
// Test Setup
// ============================================================================

beforeEach(() => {
  clearInstances();
  vi.stubGlobal('EventSource', MockEventSource);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

// ============================================================================
// Tests
// ============================================================================

describe('useRealtime', () => {
  describe('connection', () => {
    it('starts disconnected when enabled is false', () => {
      const { result } = renderHook(() =>
        useRealtime({ gameSessionId: 'game-1', enabled: false })
      );

      expect(result.current.status).toBe('disconnected');
      expect(instances).toHaveLength(0);
    });

    it('starts connecting when enabled', () => {
      const { result } = renderHook(() =>
        useRealtime({ gameSessionId: 'game-1', enabled: true })
      );

      expect(result.current.status).toBe('connecting');
      expect(instances).toHaveLength(1);
    });

    it('creates EventSource with correct URL', () => {
      renderHook(() =>
        useRealtime({ gameSessionId: 'my-game-123', enabled: true })
      );

      const es = getLatestInstance();

      expect(es?.url).toBe('/api/realtime?sessionId=my-game-123');
    });

    it('updates status to connected on open', () => {
      const { result } = renderHook(() =>
        useRealtime({ gameSessionId: 'game-1', enabled: true })
      );

      const es = getLatestInstance();

      act(() => {
        es?.simulateOpen();
      });

      expect(result.current.status).toBe('connected');
    });

    it('calls onConnect callback with sessionId', () => {
      const onConnect = vi.fn();
      const { result } = renderHook(() =>
        useRealtime({ gameSessionId: 'game-1', enabled: true, onConnect })
      );

      const es = getLatestInstance();

      act(() => {
        es?.simulateOpen();
        es?.simulateMessage({
          type: 'connected',
          payload: { sessionId: 'sub-123', timestamp: Date.now() },
          timestamp: Date.now(),
        });
      });

      expect(result.current.sessionId).toBe('sub-123');
      expect(onConnect).toHaveBeenCalledWith('sub-123');
    });
  });

  describe('message handling', () => {
    it('updates lastEvent on message', () => {
      const { result } = renderHook(() =>
        useRealtime({ gameSessionId: 'game-1', enabled: true })
      );

      const es = getLatestInstance();

      act(() => {
        es?.simulateOpen();
        es?.simulateMessage({
          type: 'game:round',
          payload: { battleRound: 3 },
          timestamp: 12345,
        });
      });

      expect(result.current.lastEvent).toEqual({
        type: 'game:round',
        payload: { battleRound: 3 },
        timestamp: 12345,
      });
    });
  });

  describe('reconnection', () => {
    it('attempts reconnection on error', () => {
      const { result } = renderHook(() =>
        useRealtime({
          gameSessionId: 'game-1',
          enabled: true,
          reconnectInterval: 1000,
        })
      );

      const es = getLatestInstance();

      act(() => {
        es?.simulateOpen();
        es?.simulateError();
      });

      expect(result.current.status).toBe('reconnecting');
      expect(result.current.reconnectAttempts).toBe(1);

      // Advance timer to trigger reconnect
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      // A new EventSource should be created
      expect(instances.length).toBeGreaterThan(1);
    });

    it('stops reconnecting after max attempts', () => {
      const onError = vi.fn();
      const { result } = renderHook(() =>
        useRealtime({
          gameSessionId: 'game-1',
          enabled: true,
          reconnectInterval: 100,
          maxReconnectAttempts: 2,
          onError,
        })
      );

      // First error
      act(() => {
        getLatestInstance()?.simulateError();
      });

      expect(result.current.reconnectAttempts).toBe(1);

      // Advance and trigger second attempt
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Second error
      act(() => {
        getLatestInstance()?.simulateError();
      });

      expect(result.current.reconnectAttempts).toBe(2);
      expect(result.current.status).toBe('disconnected');
      expect(onError).toHaveBeenCalled();
    });

    it('resets reconnect attempts on successful connection', () => {
      const { result } = renderHook(() =>
        useRealtime({
          gameSessionId: 'game-1',
          enabled: true,
          reconnectInterval: 100,
        })
      );

      // First error
      act(() => {
        getLatestInstance()?.simulateError();
      });

      expect(result.current.reconnectAttempts).toBe(1);

      // Advance and reconnect
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Successful open
      act(() => {
        getLatestInstance()?.simulateOpen();
      });

      expect(result.current.reconnectAttempts).toBe(0);
      expect(result.current.status).toBe('connected');
    });
  });

  describe('disconnect', () => {
    it('closes connection and updates status', () => {
      const onDisconnect = vi.fn();
      const { result } = renderHook(() =>
        useRealtime({
          gameSessionId: 'game-1',
          enabled: true,
          onDisconnect,
        })
      );

      const es = getLatestInstance();

      act(() => {
        es?.simulateOpen();
      });

      expect(result.current.status).toBe('connected');

      act(() => {
        result.current.disconnect();
      });

      expect(result.current.status).toBe('disconnected');
      expect(result.current.sessionId).toBeNull();
      expect(onDisconnect).toHaveBeenCalled();
    });

    it('does not reconnect after manual disconnect', () => {
      const { result } = renderHook(() =>
        useRealtime({
          gameSessionId: 'game-1',
          enabled: true,
          reconnectInterval: 100,
        })
      );

      act(() => {
        getLatestInstance()?.simulateOpen();
      });

      act(() => {
        result.current.disconnect();
      });

      const instanceCount = instances.length;

      // Advance time - should not create new EventSource
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(instances.length).toBe(instanceCount);
    });
  });

  describe('connect', () => {
    it('can manually reconnect after disconnect', () => {
      const { result } = renderHook(() =>
        useRealtime({
          gameSessionId: 'game-1',
          enabled: true,
        })
      );

      act(() => {
        result.current.disconnect();
      });

      const instanceCount = instances.length;

      act(() => {
        result.current.connect();
      });

      expect(instances.length).toBe(instanceCount + 1);
      expect(result.current.status).toBe('connecting');
    });
  });

  describe('cleanup', () => {
    it('closes connection on unmount', () => {
      const { unmount } = renderHook(() =>
        useRealtime({ gameSessionId: 'game-1', enabled: true })
      );

      const es = getLatestInstance();

      act(() => {
        es?.simulateOpen();
      });

      unmount();

      expect(es?.readyState).toBe(MockEventSource.CLOSED);
    });

    it('disconnects when enabled becomes false', () => {
      const { result, rerender } = renderHook(
        ({ enabled }) => useRealtime({ gameSessionId: 'game-1', enabled }),
        { initialProps: { enabled: true } }
      );

      act(() => {
        getLatestInstance()?.simulateOpen();
      });

      expect(result.current.status).toBe('connected');

      rerender({ enabled: false });

      expect(result.current.status).toBe('disconnected');
    });
  });
});
