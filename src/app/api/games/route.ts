import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllGameResults, saveGameResult } from '@/lib/gameResultService';
import type { GameResult } from '@/types';

// ============================================================================
// GET /api/games - Returns game result metadata for authenticated user
// ============================================================================

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const results = await getAllGameResults(session.user.id);
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error reading game results:', error);
    return NextResponse.json(
      { error: 'Failed to read game results' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/games - Save a game result
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json() as Omit<GameResult, 'id'>;

    if (!body.result || !body.army) {
      return NextResponse.json(
        { error: 'Game result and army are required' },
        { status: 400 }
      );
    }

    const saved = await saveGameResult(body, session.user.id);

    return NextResponse.json({
      success: true,
      id: saved.id,
      message: 'Game result saved successfully',
    });
  } catch (error) {
    console.error('Error saving game result:', error);
    return NextResponse.json(
      { error: 'Failed to save game result' },
      { status: 500 }
    );
  }
}
