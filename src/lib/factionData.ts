// Static faction data imports — replaces runtime readFileSync for Workers compatibility
// Data sourced from @scottzirkel/40k-data package (single source of truth)

import aeldari from '@scottzirkel/40k-data/data/aeldari.json';
import blacktemplars from '@scottzirkel/40k-data/data/blacktemplars.json';
import custodes from '@scottzirkel/40k-data/data/custodes.json';
import chaosmarines from '@scottzirkel/40k-data/data/chaosmarines.json';
import darkangels from '@scottzirkel/40k-data/data/darkangels.json';
import necrons from '@scottzirkel/40k-data/data/necrons.json';
import orks from '@scottzirkel/40k-data/data/orks.json';
import spacemarines from '@scottzirkel/40k-data/data/spacemarines.json';
import tau from '@scottzirkel/40k-data/data/tau.json';
import tyranids from '@scottzirkel/40k-data/data/tyranids.json';
import coreGlossary from '@scottzirkel/40k-data/data/core-glossary.json';

// Aeldari detachments (only faction with separate detachment files)
import aeldariArmouredWarhost from '@scottzirkel/40k-data/data/detachments/aeldari/armoured-warhost.json';
import aeldariAspectHost from '@scottzirkel/40k-data/data/detachments/aeldari/aspect-host.json';
import aeldariDevotedOfYnnead from '@scottzirkel/40k-data/data/detachments/aeldari/devoted-of-ynnead.json';
import aeldariGhostsOfTheWebway from '@scottzirkel/40k-data/data/detachments/aeldari/ghosts-of-the-webway.json';
import aeldariGuardianBattlehost from '@scottzirkel/40k-data/data/detachments/aeldari/guardian-battlehost.json';
import aeldariSeerCouncil from '@scottzirkel/40k-data/data/detachments/aeldari/seer-council.json';
import aeldariSpiritConclave from '@scottzirkel/40k-data/data/detachments/aeldari/spirit-conclave.json';
import aeldariWarhost from '@scottzirkel/40k-data/data/detachments/aeldari/warhost.json';
import aeldariWindriderHost from '@scottzirkel/40k-data/data/detachments/aeldari/windrider-host.json';

const aeldariDetachments: Record<string, unknown> = {
  'armoured-warhost': aeldariArmouredWarhost,
  'aspect-host': aeldariAspectHost,
  'devoted-of-ynnead': aeldariDevotedOfYnnead,
  'ghosts-of-the-webway': aeldariGhostsOfTheWebway,
  'guardian-battlehost': aeldariGuardianBattlehost,
  'seer-council': aeldariSeerCouncil,
  'spirit-conclave': aeldariSpiritConclave,
  'warhost': aeldariWarhost,
  'windrider-host': aeldariWindriderHost,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const factions: Record<string, any> = {
  aeldari,
  blacktemplars,
  custodes,
  chaosmarines,
  darkangels,
  necrons,
  orks,
  spacemarines,
  tau,
  tyranids,
};

const detachments: Record<string, Record<string, unknown>> = {
  aeldari: aeldariDetachments,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- faction schema varies per army
export function getFactionData(armyId: string): any | null {
  const data = factions[armyId];
  if (!data) return null;

  const needsDetachments = !data.detachments || Object.keys(data.detachments).length === 0;
  const needsGlossary = !data.keywordGlossary;

  // Return original if no augmentation needed (avoids cloning 100-368KB per request)
  if (!needsDetachments && !needsGlossary) return data;

  // Shallow merge only the fields that need augmentation
  return {
    ...data,
    ...(needsDetachments && detachments[armyId] ? { detachments: detachments[armyId] } : {}),
    ...(needsGlossary ? { keywordGlossary: coreGlossary } : {}),
  };
}
