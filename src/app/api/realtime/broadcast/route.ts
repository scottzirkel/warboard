// ============================================================================
// POST /api/realtime/broadcast - Broadcast events to connected clients
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { broadcast, getSubscriberCount } from '@/lib/realtimeService';
import type { RealtimeEventType, RealtimeEventMap } from '@/types/realtime';

// ============================================================================
// Request Body Type
// ============================================================================

interface BroadcastRequest {
  gameSessionId: string;
  type: RealtimeEventType;
  payload: RealtimeEventMap[keyof RealtimeEventMap];
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json() as BroadcastRequest;

    if (!body.gameSessionId) {
      return NextResponse.json(
        { error: 'Missing gameSessionId' },
        { status: 400 }
      );
    }

    if (!body.type) {
      return NextResponse.json(
        { error: 'Missing event type' },
        { status: 400 }
      );
    }

    // Broadcast the event
    const sentCount = broadcast(
      body.gameSessionId,
      body.type,
      body.payload
    );

    return NextResponse.json({
      success: true,
      sentCount,
      subscriberCount: getSubscriberCount(body.gameSessionId),
    });
  } catch (error) {
    console.error('Error broadcasting event:', error);

    return NextResponse.json(
      { error: 'Failed to broadcast event' },
      { status: 500 }
    );
  }
}
