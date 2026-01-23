'use client';

// ============================================================================
// useRealtime - Client-side hook for SSE connections with auto-reconnection
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  ConnectionStatus,
  RealtimeEvent,
  UseRealtimeOptions,
  UseRealtimeReturn,
} from '@/types/realtime';

// Default configuration
const DEFAULT_RECONNECT_INTERVAL = 3000; // 3 seconds
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 10;

export function useRealtime(options: UseRealtimeOptions): UseRealtimeReturn {
  const {
    gameSessionId,
    enabled = true,
    reconnectInterval = DEFAULT_RECONNECT_INTERVAL,
    maxReconnectAttempts = DEFAULT_MAX_RECONNECT_ATTEMPTS,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // Refs to hold mutable state without causing re-renders
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManualDisconnectRef = useRef(false);
  const connectRef = useRef<() => void>(() => {});

  // Cleanup function
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  // Disconnect function
  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true;
    cleanup();
    setStatus('disconnected');
    setSessionId(null);
    setReconnectAttempts(0);
    onDisconnect?.();
  }, [cleanup, onDisconnect]);

  // Connect function
  const connect = useCallback(() => {
    // Don't connect if disabled or already connected/connecting
    if (!enabled || !gameSessionId) {
      return;
    }

    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      return;
    }

    isManualDisconnectRef.current = false;
    cleanup();
    setStatus('connecting');

    try {
      const url = `/api/realtime?sessionId=${encodeURIComponent(gameSessionId)}`;
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setStatus('connected');
        setReconnectAttempts(0);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as RealtimeEvent;
          setLastEvent(data);

          // Handle connected event specially
          if (data.type === 'connected' && 'sessionId' in data.payload) {
            const payload = data.payload as { sessionId: string };
            setSessionId(payload.sessionId);
            onConnect?.(payload.sessionId);
          }
        } catch (error) {
          console.error('Failed to parse SSE event:', error);
        }
      };

      eventSource.onerror = () => {
        cleanup();

        // Don't reconnect if manually disconnected
        if (isManualDisconnectRef.current) {
          return;
        }

        setStatus('reconnecting');

        // Check if we've exceeded max reconnect attempts
        setReconnectAttempts((prev) => {
          const newAttempts = prev + 1;

          if (newAttempts >= maxReconnectAttempts) {
            setStatus('disconnected');
            onError?.(new Error(`Failed to connect after ${maxReconnectAttempts} attempts`));

            return newAttempts;
          }

          // Schedule reconnect with exponential backoff
          const backoffDelay = Math.min(
            reconnectInterval * Math.pow(1.5, newAttempts - 1),
            30000 // Max 30 seconds
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            if (!isManualDisconnectRef.current) {
              connectRef.current();
            }
          }, backoffDelay);

          return newAttempts;
        });
      };
    } catch (error) {
      setStatus('disconnected');
      onError?.(error instanceof Error ? error : new Error('Failed to create EventSource'));
    }
  }, [
    enabled,
    gameSessionId,
    cleanup,
    reconnectInterval,
    maxReconnectAttempts,
    onConnect,
    onError,
  ]);

  // Auto-connect when enabled changes or gameSessionId changes
  useEffect(() => {
    // Keep the ref updated with the latest connect function
    connectRef.current = connect;
    if (enabled && gameSessionId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Connection setup is a valid side effect
      connect();
    } else {
      disconnect();
    }

    return () => {
      cleanup();
    };
  }, [enabled, gameSessionId, connect, disconnect, cleanup]);

  // Handle visibility change (reconnect when tab becomes visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled && gameSessionId) {
        // Check if connection is still open
        if (eventSourceRef.current?.readyState !== EventSource.OPEN) {
          setReconnectAttempts(0); // Reset attempts on visibility change
          connect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, gameSessionId, connect]);

  return {
    status,
    sessionId,
    lastEvent,
    reconnectAttempts,
    connect,
    disconnect,
  };
}

export default useRealtime;
