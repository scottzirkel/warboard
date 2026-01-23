// ============================================================================
// GET /api/realtime - Server-Sent Events endpoint for real-time updates
// ============================================================================

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  addSubscriber,
  removeSubscriber,
  generateSubscriberId,
  formatSSEEvent,
} from '@/lib/realtimeService';
import type { Subscriber } from '@/types/realtime';

// Disable body parsing for streaming
export const dynamic = 'force-dynamic';

// ============================================================================
// SSE Connection Handler
// ============================================================================

export async function GET(request: NextRequest): Promise<Response> {
  // Get game session ID from query params
  const { searchParams } = new URL(request.url);
  const gameSessionId = searchParams.get('sessionId');

  if (!gameSessionId) {
    return new Response(
      JSON.stringify({ error: 'Missing sessionId query parameter' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Check authentication
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const userId = session.user.id;
  const subscriberId = generateSubscriberId();

  // Create a readable stream for SSE
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Create subscriber object
      const subscriber: Subscriber = {
        id: subscriberId,
        userId,
        gameSessionId,
        controller,
        createdAt: Date.now(),
      };

      // Add to subscriber pool
      addSubscriber(subscriber);

      // Send initial connected event
      const connectedEvent = formatSSEEvent('connected', {
        sessionId: subscriberId,
        timestamp: Date.now(),
      });
      controller.enqueue(new TextEncoder().encode(connectedEvent));

      // Set up heartbeat interval (every 30 seconds)
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = formatSSEEvent('heartbeat', { timestamp: Date.now() });
          controller.enqueue(new TextEncoder().encode(heartbeat));
        } catch {
          // Connection closed, clean up
          clearInterval(heartbeatInterval);
          removeSubscriber(gameSessionId, subscriberId);
        }
      }, 30000);

      // Handle client disconnect via AbortSignal
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        removeSubscriber(gameSessionId, subscriberId);
        try {
          controller.close();
        } catch {
          // Controller already closed
        }
      });
    },

    cancel() {
      // Clean up when stream is cancelled
      removeSubscriber(gameSessionId, subscriberId);
    },
  });

  // Return SSE response with appropriate headers
  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
