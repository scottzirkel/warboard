import { NextRequest, NextResponse } from 'next/server';
import { getAllLists, saveList } from '@/lib/listService';
import type { CurrentList } from '@/types';

// ============================================================================
// GET /api/lists - Returns saved list metadata
// ============================================================================

export async function GET(): Promise<NextResponse> {
  try {
    const lists = await getAllLists();

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
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: 'List name is required' },
        { status: 400 }
      );
    }

    // Normalize incoming data to CurrentList format
    const listData: CurrentList = {
      name: body.name,
      army: body.army || 'custodes',
      pointsLimit: body.pointsLimit || 2000,
      format: body.format || body.gameFormat || 'standard',
      detachment: body.detachment || '',
      units: body.units || [],
    };

    const savedList = await saveList(listData);

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
