import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateSubscriberId,
  generateGameSessionId,
  addSubscriber,
  removeSubscriber,
  getSessionSubscribers,
  getSubscriberCount,
  getActiveGameSessions,
  formatSSEEvent,
  broadcast,
  sendToSubscriber,
  sendHeartbeat,
  clearSession,
  clearAllSubscribers,
  getStats,
} from './realtimeService';
import type { Subscriber } from '@/types/realtime';

// ============================================================================
// Test Setup
// ============================================================================

function createMockController(): ReadableStreamDefaultController<Uint8Array> {
  const enqueuedMessages: Uint8Array[] = [];

  return {
    enqueue: vi.fn((chunk: Uint8Array) => {
      enqueuedMessages.push(chunk);
    }),
    close: vi.fn(),
    error: vi.fn(),
    desiredSize: 1,
  } as unknown as ReadableStreamDefaultController<Uint8Array>;
}

function createMockSubscriber(
  gameSessionId: string,
  overrides: Partial<Subscriber> = {}
): Subscriber {
  return {
    id: generateSubscriberId(),
    userId: 'user-123',
    gameSessionId,
    controller: createMockController(),
    createdAt: Date.now(),
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('realtimeService', () => {
  beforeEach(() => {
    clearAllSubscribers();
  });

  // --------------------------------------------------------------------------
  // ID Generation
  // --------------------------------------------------------------------------

  describe('generateSubscriberId', () => {
    it('generates unique IDs', () => {
      const id1 = generateSubscriberId();
      const id2 = generateSubscriberId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^sub_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^sub_\d+_[a-z0-9]+$/);
    });
  });

  describe('generateGameSessionId', () => {
    it('generates unique game session IDs', () => {
      const id1 = generateGameSessionId();
      const id2 = generateGameSessionId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^game_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^game_\d+_[a-z0-9]+$/);
    });
  });

  // --------------------------------------------------------------------------
  // Subscriber Management
  // --------------------------------------------------------------------------

  describe('addSubscriber', () => {
    it('adds a subscriber to a game session', () => {
      const gameSessionId = 'game-1';
      const subscriber = createMockSubscriber(gameSessionId);

      addSubscriber(subscriber);

      expect(getSubscriberCount(gameSessionId)).toBe(1);
      expect(getSessionSubscribers(gameSessionId)).toContain(subscriber);
    });

    it('adds multiple subscribers to the same session', () => {
      const gameSessionId = 'game-1';
      const sub1 = createMockSubscriber(gameSessionId);
      const sub2 = createMockSubscriber(gameSessionId);

      addSubscriber(sub1);
      addSubscriber(sub2);

      expect(getSubscriberCount(gameSessionId)).toBe(2);
    });

    it('adds subscribers to different sessions', () => {
      const sub1 = createMockSubscriber('game-1');
      const sub2 = createMockSubscriber('game-2');

      addSubscriber(sub1);
      addSubscriber(sub2);

      expect(getSubscriberCount('game-1')).toBe(1);
      expect(getSubscriberCount('game-2')).toBe(1);
      expect(getActiveGameSessions()).toHaveLength(2);
    });
  });

  describe('removeSubscriber', () => {
    it('removes a subscriber from a game session', () => {
      const gameSessionId = 'game-1';
      const subscriber = createMockSubscriber(gameSessionId);

      addSubscriber(subscriber);
      expect(getSubscriberCount(gameSessionId)).toBe(1);

      removeSubscriber(gameSessionId, subscriber.id);
      expect(getSubscriberCount(gameSessionId)).toBe(0);
    });

    it('cleans up empty sessions', () => {
      const gameSessionId = 'game-1';
      const subscriber = createMockSubscriber(gameSessionId);

      addSubscriber(subscriber);
      expect(getActiveGameSessions()).toContain(gameSessionId);

      removeSubscriber(gameSessionId, subscriber.id);
      expect(getActiveGameSessions()).not.toContain(gameSessionId);
    });

    it('handles removing non-existent subscriber gracefully', () => {
      expect(() => {
        removeSubscriber('non-existent', 'sub-123');
      }).not.toThrow();
    });
  });

  describe('getSessionSubscribers', () => {
    it('returns empty array for non-existent session', () => {
      expect(getSessionSubscribers('non-existent')).toEqual([]);
    });

    it('returns all subscribers for a session', () => {
      const gameSessionId = 'game-1';
      const sub1 = createMockSubscriber(gameSessionId);
      const sub2 = createMockSubscriber(gameSessionId);

      addSubscriber(sub1);
      addSubscriber(sub2);

      const subscribers = getSessionSubscribers(gameSessionId);

      expect(subscribers).toHaveLength(2);
      expect(subscribers).toContain(sub1);
      expect(subscribers).toContain(sub2);
    });
  });

  // --------------------------------------------------------------------------
  // Event Formatting
  // --------------------------------------------------------------------------

  describe('formatSSEEvent', () => {
    it('formats event as SSE data line', () => {
      const result = formatSSEEvent('heartbeat', { timestamp: 12345 });

      expect(result).toMatch(/^data: .+\n\n$/);

      const parsed = JSON.parse(result.replace('data: ', '').trim());

      expect(parsed.type).toBe('heartbeat');
      expect(parsed.payload.timestamp).toBe(12345);
      expect(parsed.timestamp).toBeDefined();
    });

    it('includes sessionId when provided', () => {
      const result = formatSSEEvent('connected', { sessionId: 'sub-1', timestamp: 12345 }, 'game-1');
      const parsed = JSON.parse(result.replace('data: ', '').trim());

      expect(parsed.sessionId).toBe('game-1');
    });
  });

  // --------------------------------------------------------------------------
  // Broadcasting
  // --------------------------------------------------------------------------

  describe('broadcast', () => {
    it('sends event to all subscribers in a session', () => {
      const gameSessionId = 'game-1';
      const sub1 = createMockSubscriber(gameSessionId);
      const sub2 = createMockSubscriber(gameSessionId);

      addSubscriber(sub1);
      addSubscriber(sub2);

      const sentCount = broadcast(gameSessionId, 'game:round', { battleRound: 2 });

      expect(sentCount).toBe(2);
      expect(sub1.controller.enqueue).toHaveBeenCalled();
      expect(sub2.controller.enqueue).toHaveBeenCalled();
    });

    it('excludes specified subscriber', () => {
      const gameSessionId = 'game-1';
      const sub1 = createMockSubscriber(gameSessionId);
      const sub2 = createMockSubscriber(gameSessionId);

      addSubscriber(sub1);
      addSubscriber(sub2);

      const sentCount = broadcast(gameSessionId, 'game:round', { battleRound: 2 }, sub1.id);

      expect(sentCount).toBe(1);
      expect(sub1.controller.enqueue).not.toHaveBeenCalled();
      expect(sub2.controller.enqueue).toHaveBeenCalled();
    });

    it('returns 0 for non-existent session', () => {
      const sentCount = broadcast('non-existent', 'game:round', { battleRound: 1 });

      expect(sentCount).toBe(0);
    });

    it('removes subscriber if enqueue throws', () => {
      const gameSessionId = 'game-1';
      const failingController = createMockController();
      (failingController.enqueue as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Connection closed');
      });

      const subscriber = createMockSubscriber(gameSessionId, { controller: failingController });

      addSubscriber(subscriber);
      expect(getSubscriberCount(gameSessionId)).toBe(1);

      broadcast(gameSessionId, 'heartbeat', { timestamp: Date.now() });
      expect(getSubscriberCount(gameSessionId)).toBe(0);
    });
  });

  describe('sendToSubscriber', () => {
    it('sends event to a specific subscriber', () => {
      const subscriber = createMockSubscriber('game-1');

      addSubscriber(subscriber);
      const result = sendToSubscriber(subscriber, 'connected', { sessionId: 'sub-1', timestamp: 12345 });

      expect(result).toBe(true);
      expect(subscriber.controller.enqueue).toHaveBeenCalled();
    });

    it('returns false and removes subscriber if send fails', () => {
      const gameSessionId = 'game-1';
      const failingController = createMockController();
      (failingController.enqueue as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Connection closed');
      });

      const subscriber = createMockSubscriber(gameSessionId, { controller: failingController });

      addSubscriber(subscriber);
      const result = sendToSubscriber(subscriber, 'heartbeat', { timestamp: 12345 });

      expect(result).toBe(false);
      expect(getSubscriberCount(gameSessionId)).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Heartbeat
  // --------------------------------------------------------------------------

  describe('sendHeartbeat', () => {
    it('sends heartbeat to all subscribers in a session', () => {
      const gameSessionId = 'game-1';
      const sub1 = createMockSubscriber(gameSessionId);
      const sub2 = createMockSubscriber(gameSessionId);

      addSubscriber(sub1);
      addSubscriber(sub2);

      const sentCount = sendHeartbeat(gameSessionId);

      expect(sentCount).toBe(2);
    });
  });

  // --------------------------------------------------------------------------
  // Cleanup
  // --------------------------------------------------------------------------

  describe('clearSession', () => {
    it('removes all subscribers from a session', () => {
      const gameSessionId = 'game-1';
      const sub1 = createMockSubscriber(gameSessionId);
      const sub2 = createMockSubscriber(gameSessionId);

      addSubscriber(sub1);
      addSubscriber(sub2);

      clearSession(gameSessionId);

      expect(getSubscriberCount(gameSessionId)).toBe(0);
      expect(getActiveGameSessions()).not.toContain(gameSessionId);
    });
  });

  describe('clearAllSubscribers', () => {
    it('removes all subscribers from all sessions', () => {
      addSubscriber(createMockSubscriber('game-1'));
      addSubscriber(createMockSubscriber('game-2'));
      addSubscriber(createMockSubscriber('game-3'));

      expect(getActiveGameSessions()).toHaveLength(3);

      clearAllSubscribers();

      expect(getActiveGameSessions()).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // Stats
  // --------------------------------------------------------------------------

  describe('getStats', () => {
    it('returns correct statistics', () => {
      addSubscriber(createMockSubscriber('game-1'));
      addSubscriber(createMockSubscriber('game-1'));
      addSubscriber(createMockSubscriber('game-2'));

      const stats = getStats();

      expect(stats.totalSessions).toBe(2);
      expect(stats.totalSubscribers).toBe(3);
      expect(stats.sessions).toHaveLength(2);

      const game1Stats = stats.sessions.find(s => s.id === 'game-1');

      expect(game1Stats?.subscriberCount).toBe(2);
    });

    it('returns empty stats when no subscribers', () => {
      const stats = getStats();

      expect(stats.totalSessions).toBe(0);
      expect(stats.totalSubscribers).toBe(0);
      expect(stats.sessions).toEqual([]);
    });
  });
});
