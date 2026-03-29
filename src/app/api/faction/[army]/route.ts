import { NextResponse } from 'next/server';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { availableArmies } from '@/stores/armyStore';

const DATA_DIR = join(
  process.cwd(),
  'node_modules',
  '@scottzirkel',
  '40k-data',
  'data'
);

function loadDetachments(armyId: string): Record<string, unknown> | null {
  const detachmentsDir = join(DATA_DIR, 'detachments', armyId);

  if (!existsSync(detachmentsDir)) {
    return null;
  }

  const detachments: Record<string, unknown> = {};
  const files = readdirSync(detachmentsDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const id = file.replace('.json', '');
    detachments[id] = JSON.parse(readFileSync(join(detachmentsDir, file), 'utf-8'));
  }

  return detachments;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ army: string }> }
) {
  const { army } = await params;

  const armyConfig = availableArmies.find(a => a.id === army);

  if (!armyConfig) {
    return NextResponse.json({ error: 'Unknown army' }, { status: 404 });
  }

  try {
    const filePath = join(DATA_DIR, armyConfig.file);
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));

    if (!data.detachments || Object.keys(data.detachments).length === 0) {
      const separateDetachments = loadDetachments(armyConfig.id);

      if (separateDetachments) {
        data.detachments = separateDetachments;
      }
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to load army data: ${err instanceof Error ? err.message : 'unknown'}` },
      { status: 500 }
    );
  }
}
