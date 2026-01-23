// ============================================================================
// Real-time Event Types for Server-Sent Events
// ============================================================================

import type { GameState, CurrentList, ListUnit } from './index';

// ============================================================================
// Event Categories
// ============================================================================

export type RealtimeEventType =
  | 'connected'
  | 'heartbeat'
  | 'game:state'
  | 'game:round'
  | 'game:cp'
  | 'game:stratagem'
  | 'game:katah'
  | 'list:loaded'
  | 'unit:wounds'
  | 'unit:destroyed';

// ============================================================================
// Event Payloads
// ============================================================================

export interface ConnectedPayload {
  sessionId: string;
  timestamp: number;
}

export interface HeartbeatPayload {
  timestamp: number;
}

export interface GameStatePayload {
  gameState: GameState;
  listName: string;
  armyId: string;
}

export interface GameRoundPayload {
  battleRound: number;
}

export interface GameCPPayload {
  commandPoints: number;
}

export interface GameStratagemPayload {
  stratagemId: string;
  active: boolean;
}

export interface GameKatahPayload {
  katah: string | null;
}

export interface ListLoadedPayload {
  list: CurrentList;
}

export interface UnitWoundsPayload {
  unitIndex: number;
  currentWounds: number | null;
  leaderCurrentWounds: number | null;
  unit: ListUnit;
}

export interface UnitDestroyedPayload {
  unitIndex: number;
  unitName: string;
}

// ============================================================================
// Event Map
// ============================================================================

export interface RealtimeEventMap {
  connected: ConnectedPayload;
  heartbeat: HeartbeatPayload;
  'game:state': GameStatePayload;
  'game:round': GameRoundPayload;
  'game:cp': GameCPPayload;
  'game:stratagem': GameStratagemPayload;
  'game:katah': GameKatahPayload;
  'list:loaded': ListLoadedPayload;
  'unit:wounds': UnitWoundsPayload;
  'unit:destroyed': UnitDestroyedPayload;
}

// ============================================================================
// Generic Event Structure
// ============================================================================

export interface RealtimeEvent<T extends RealtimeEventType = RealtimeEventType> {
  type: T;
  payload: T extends keyof RealtimeEventMap ? RealtimeEventMap[T] : unknown;
  timestamp: number;
  sessionId?: string;
}

// ============================================================================
// Connection State
// ============================================================================

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface ConnectionState {
  status: ConnectionStatus;
  sessionId: string | null;
  lastEventTime: number | null;
  reconnectAttempts: number;
}

// ============================================================================
// Subscriber Types (Server-side)
// ============================================================================

export interface Subscriber {
  id: string;
  userId: string;
  gameSessionId: string;
  controller: ReadableStreamDefaultController<Uint8Array>;
  createdAt: number;
}

// ============================================================================
// Client Hook Options
// ============================================================================

export interface UseRealtimeOptions {
  gameSessionId: string;
  enabled?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onConnect?: (sessionId: string) => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export interface UseRealtimeReturn {
  status: ConnectionStatus;
  sessionId: string | null;
  lastEvent: RealtimeEvent | null;
  reconnectAttempts: number;
  connect: () => void;
  disconnect: () => void;
}
