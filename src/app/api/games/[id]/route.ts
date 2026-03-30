import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getGameResultById, deleteGameResult } from '@/lib/gameResultService';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ============================================================================
// GET /api/games/[id] - Get a single game result
// ============================================================================

export async function GET(_request: NextRequest, context: RouteParams): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const result = await getGameResultById(id, session.user.id);

    if (!result) {
      return NextResponse.json(
        { error: 'Game result not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error reading game result:', error);
    return NextResponse.json(
      { error: 'Failed to read game result' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/games/[id] - Delete a game result
// ============================================================================

export async function DELETE(_request: NextRequest, context: RouteParams): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const deleted = await deleteGameResult(id, session.user.id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Game result not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Game result deleted successfully' });
  } catch (error) {
    console.error('Error deleting game result:', error);
    return NextResponse.json(
      { error: 'Failed to delete game result' },
      { status: 500 }
    );
  }
}
