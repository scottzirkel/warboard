import { NextResponse } from 'next/server';
import { availableArmies } from '@/stores/armyStore';
import { getFactionData } from '@/lib/factionData';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ army: string }> }
) {
  const { army } = await params;

  const armyConfig = availableArmies.find(a => a.id === army);

  if (!armyConfig) {
    return NextResponse.json({ error: 'Unknown army' }, { status: 404 });
  }

  const data = getFactionData(armyConfig.id);

  if (!data) {
    return NextResponse.json(
      { error: `Failed to load army data for ${army}` },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
