// ============================================================================
// Real-time Service - Server-side event broadcasting
// ============================================================================

import type {
  Subscriber,
  RealtimeEvent,
  RealtimeEventType,
  RealtimeEventMap,
} from '@/types/realtime';

// ============================================================================
// In-memory subscriber store
// ============================================================================

// Map of gameSessionId -> Map of subscriberId -> Subscriber
const subscribers = new Map<string, Map<string, Subscriber>>();

// ============================================================================
// Subscriber Management
// ============================================================================

/**
 * Generates a unique subscriber ID
 */
export function generateSubscriberId(): string {
  return `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generates a unique game session ID
 */
export function generateGameSessionId(): string {
  return `game_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Adds a subscriber to a game session
 */
export function addSubscriber(subscriber: Subscriber): void {
  const { gameSessionId, id } = subscriber;

  if (!subscribers.has(gameSessionId)) {
    subscribers.set(gameSessionId, new Map());
  }

  subscribers.get(gameSessionId)!.set(id, subscriber);
}

/**
 * Removes a subscriber from a game session
 */
export function removeSubscriber(gameSessionId: string, subscriberId: string): void {
  const sessionSubscribers = subscribers.get(gameSessionId);

  if (sessionSubscribers) {
    sessionSubscribers.delete(subscriberId);

    // Clean up empty sessions
    if (sessionSubscribers.size === 0) {
      subscribers.delete(gameSessionId);
    }
  }
}

/**
 * Gets all subscribers for a game session
 */
export function getSessionSubscribers(gameSessionId: string): Subscriber[] {
  const sessionSubscribers = subscribers.get(gameSessionId);

  return sessionSubscribers ? Array.from(sessionSubscribers.values()) : [];
}

/**
 * Gets the count of active subscribers for a game session
 */
export function getSubscriberCount(gameSessionId: string): number {
  return subscribers.get(gameSessionId)?.size ?? 0;
}

/**
 * Gets all active game session IDs
 */
export function getActiveGameSessions(): string[] {
  return Array.from(subscribers.keys());
}

// ============================================================================
// Event Formatting
// ============================================================================

/**
 * Formats an event for SSE transmission
 */
export function formatSSEEvent<T extends RealtimeEventType>(
  type: T,
  payload: T extends keyof RealtimeEventMap ? RealtimeEventMap[T] : unknown,
  sessionId?: string
): string {
  const event: RealtimeEvent<T> = {
    type,
    payload,
    timestamp: Date.now(),
    sessionId,
  };

  // SSE format: data: <json>\n\n
  return `data: ${JSON.stringify(event)}\n\n`;
}

// ============================================================================
// Broadcasting
// ============================================================================

/**
 * Broadcasts an event to all subscribers of a game session
 */
export function broadcast<T extends RealtimeEventType>(
  gameSessionId: string,
  type: T,
  payload: T extends keyof RealtimeEventMap ? RealtimeEventMap[T] : unknown,
  excludeSubscriberId?: string
): number {
  const sessionSubscribers = getSessionSubscribers(gameSessionId);
  const message = formatSSEEvent(type, payload, gameSessionId);
  const encoder = new TextEncoder();
  const encodedMessage = encoder.encode(message);

  let sentCount = 0;

  for (const subscriber of sessionSubscribers) {
    if (excludeSubscriberId && subscriber.id === excludeSubscriberId) {
      continue;
    }

    try {
      subscriber.controller.enqueue(encodedMessage);
      sentCount++;
    } catch {
      // Subscriber disconnected, remove them
      removeSubscriber(gameSessionId, subscriber.id);
    }
  }

  return sentCount;
}

/**
 * Broadcasts an event to a specific subscriber
 */
export function sendToSubscriber<T extends RealtimeEventType>(
  subscriber: Subscriber,
  type: T,
  payload: T extends keyof RealtimeEventMap ? RealtimeEventMap[T] : unknown
): boolean {
  const message = formatSSEEvent(type, payload, subscriber.gameSessionId);
  const encoder = new TextEncoder();

  try {
    subscriber.controller.enqueue(encoder.encode(message));

    return true;
  } catch {
    // Subscriber disconnected
    removeSubscriber(subscriber.gameSessionId, subscriber.id);

    return false;
  }
}

// ============================================================================
// Heartbeat
// ============================================================================

/**
 * Sends a heartbeat to all subscribers of a game session
 * Returns the number of subscribers that received the heartbeat
 */
export function sendHeartbeat(gameSessionId: string): number {
  return broadcast(gameSessionId, 'heartbeat', { timestamp: Date.now() });
}

/**
 * Sends heartbeats to all active game sessions
 * Returns total number of heartbeats sent
 */
export function sendHeartbeatToAll(): number {
  let total = 0;

  for (const gameSessionId of getActiveGameSessions()) {
    total += sendHeartbeat(gameSessionId);
  }

  return total;
}

// ============================================================================
// Cleanup
// ============================================================================

/**
 * Removes all subscribers from a game session
 */
export function clearSession(gameSessionId: string): void {
  subscribers.delete(gameSessionId);
}

/**
 * Removes all subscribers (for testing/shutdown)
 */
export function clearAllSubscribers(): void {
  subscribers.clear();
}

// ============================================================================
// Debug/Stats
// ============================================================================

export interface RealtimeStats {
  totalSessions: number;
  totalSubscribers: number;
  sessions: Array<{
    id: string;
    subscriberCount: number;
  }>;
}

/**
 * Gets statistics about current connections
 */
export function getStats(): RealtimeStats {
  const sessions: RealtimeStats['sessions'] = [];
  let totalSubscribers = 0;

  for (const [id, sessionSubscribers] of subscribers.entries()) {
    const count = sessionSubscribers.size;
    totalSubscribers += count;
    sessions.push({ id, subscriberCount: count });
  }

  return {
    totalSessions: subscribers.size,
    totalSubscribers,
    sessions,
  };
}
