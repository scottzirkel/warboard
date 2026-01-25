import { NextRequest, NextResponse } from 'next/server';
import { generateRosterXml } from '@/lib/roszExport';
import type { CurrentList, ArmyData } from '@/types';
import archiver from 'archiver';
import { PassThrough } from 'stream';

// ============================================================================
// Configuration
// ============================================================================

const YELLOWSCRIBE_API = 'https://yellowscribe.link';

// ============================================================================
// POST /api/yellowscribe/export - Export list to Yellowscribe via .rosz
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

    // Generate .rosz XML with BSData IDs
    const rosterXml = generateRosterXml(body.list, body.armyData);
    console.log('[Yellowscribe] Generated roster XML:', rosterXml.substring(0, 500));

    // Build filename from list name
    const listName = (body.list.name || 'army-list')
      .replace(/[^a-z0-9-_]/gi, '-')
      .toLowerCase();
    const filename = listName + '.rosz';
    const rosFilename = listName + '.ros';

    // Create .rosz file (ZIP archive containing .ros XML file)
    const roszBuffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const passthrough = new PassThrough();

      passthrough.on('data', (chunk: Buffer) => chunks.push(chunk));
      passthrough.on('end', () => resolve(Buffer.concat(chunks)));
      passthrough.on('error', reject);

      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.on('error', reject);
      archive.pipe(passthrough);

      // Add the .ros XML file to the ZIP archive
      archive.append(rosterXml, { name: rosFilename });
      archive.finalize();
    });

    // POST to Yellowscribe API with .rosz file
    // Using /makeArmyAndReturnCode which accepts binary .rosz data
    const queryParams = new URLSearchParams({
      filename,
      uiHeight: '700',
      uiWidth: '1200',
      decorativeNames: '',
      modules: 'MatchedPlay',
    });

    const response = await fetch(
      `${YELLOWSCRIBE_API}/makeArmyAndReturnCode?${queryParams.toString()}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: new Uint8Array(roszBuffer),
      }
    );

    const responseText = await response.text();
    console.log('[Yellowscribe] Response status:', response.status);
    console.log('[Yellowscribe] Response body:', responseText);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Yellowscribe API error: ${response.status} - ${responseText}` },
        { status: 502 }
      );
    }

    // Yellowscribe returns JSON like {"code": "ABCD1234"} or plain text
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
