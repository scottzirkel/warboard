import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllLists, saveList } from '@/lib/listService';
import type { CurrentList, GameFormat } from '@/types';

// ============================================================================
// GET /api/lists - Returns saved list metadata for authenticated user
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

    const lists = await getAllLists(session.user.id);

    // Map to backward-compatible format for existing clients
    const response = lists.map(list => ({
      id: list.id,
      filename: `${list.name.replace(/\s+/g, '_')}.json`, // For backward compatibility
      name: list.name,
      armyId: list.armyId,
      updatedAt: list.updatedAt.toISOString(),
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error reading lists:', error);

    return NextResponse.json(
      { error: 'Failed to read lists' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/lists - Save list to database
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

    const body = await request.json() as Record<string, unknown>;

    if (!body.name) {
      return NextResponse.json(
        { error: 'List name is required' },
        { status: 400 }
      );
    }

    // Normalize incoming data to CurrentList format
    const rawFormat = String(body.format || body.gameFormat || 'strike-force');
    const listData: CurrentList = {
      name: String(body.name),
      army: String(body.army || 'custodes'),
      pointsLimit: Number(body.pointsLimit) || 2000,
      format: (rawFormat === 'standard' ? 'strike-force' : rawFormat) as GameFormat,
      detachment: String(body.detachment || ''),
      units: (body.units || []) as CurrentList['units'],
    };

    const savedList = await saveList(listData, session.user.id);

    return NextResponse.json({
      success: true,
      id: savedList.id,
      filename: `${savedList.name.replace(/\s+/g, '_')}.json`, // For backward compatibility
      message: 'List saved successfully',
    });
  } catch (error) {
    console.error('Error saving list:', error);

    return NextResponse.json(
      { error: 'Failed to save list' },
      { status: 500 }
    );
  }
}
