import { NextResponse } from 'next/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { availableArmies } from '@/stores/armyStore';

const DATA_DIR = join(
  process.cwd(),
  'node_modules',
  '@scottzirkel',
  '40k-data',
  'data'
);

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

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to load army data: ${err instanceof Error ? err.message : 'unknown'}` },
      { status: 500 }
    );
  }
}
