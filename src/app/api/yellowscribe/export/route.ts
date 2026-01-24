import { NextRequest, NextResponse } from 'next/server';
import { transformToYellowscribe } from '@/lib/yellowscribe';
import type { CurrentList, ArmyData } from '@/types';

// ============================================================================
// Configuration
// ============================================================================

const YELLOWSCRIBE_API = 'https://yellowscribe.link';

// ============================================================================
// POST /api/yellowscribe/export - Export list to Yellowscribe
// ============================================================================

interface ExportRequestBody {
  list: CurrentList;
  armyData: ArmyData;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as ExportRequestBody;

    if (!body.list || !body.armyData) {
      return NextResponse.json(
        { error: 'Missing list or armyData' },
        { status: 400 }
      );
    }

    // Transform to Yellowscribe format
    const army = transformToYellowscribe(body.list, body.armyData);

    // POST to Yellowscribe API
    const response = await fetch(`${YELLOWSCRIBE_API}/getArmyCode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(army),
    });

    if (!response.ok) {
      const errorText = await response.text();

      return NextResponse.json(
        { error: `Yellowscribe API error: ${response.status} - ${errorText}` },
        { status: 502 }
      );
    }

    const responseText = await response.text();

    // Yellowscribe may return JSON like {"code": "ABCD1234"} or plain text
    let code = responseText.trim();

    try {
      const parsed = JSON.parse(code);

      if (parsed.code) {
        code = parsed.code;
      }
    } catch {
      // Not JSON, use as-is
    }

    return NextResponse.json({
      success: true,
      code,
    });
  } catch (error) {
    console.error('Error exporting to Yellowscribe:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
