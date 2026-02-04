/**
 * Faction Configuration
 *
 * Maps faction IDs to their BSData catalogue files and output paths.
 * This is the source of truth for all faction imports.
 */

export interface FactionConfig {
  id: string;
  name: string;
  catalogueFile: string; // Filename in BSData repo
  catalogueId?: string; // BSData catalogue ID (extracted during parse)
  outputFile: string; // Output JSON filename
  theme?: string; // CSS theme name
}

// Path to BSData repository (can be overridden via env)
export const BSDATA_PATH =
  process.env.BSDATA_PATH || '/Users/scott/projects/BSData/wh40k-10e';

export const FACTIONS: FactionConfig[] = [
  {
    id: 'custodes',
    name: 'Adeptus Custodes',
    catalogueFile: 'Imperium - Adeptus Custodes.cat',
    outputFile: 'custodes.json',
    theme: 'custodes',
  },
  {
    id: 'tyranids',
    name: 'Tyranids',
    catalogueFile: 'Tyranids.cat',
    outputFile: 'tyranids.json',
    theme: 'tyranids',
  },
  {
    id: 'necrons',
    name: 'Necrons',
    catalogueFile: 'Necrons.cat',
    outputFile: 'necrons.json',
    theme: 'necrons',
  },
  {
    id: 'spacemarines',
    name: 'Space Marines',
    catalogueFile: 'Imperium - Space Marines.cat',
    outputFile: 'spacemarines.json',
    theme: 'spacemarines',
  },
  {
    id: 'orks',
    name: 'Orks',
    catalogueFile: 'Orks.cat',
    outputFile: 'orks.json',
    theme: 'orks',
  },
  {
    id: 'chaosmarines',
    name: 'Chaos Space Marines',
    catalogueFile: 'Chaos - Chaos Space Marines.cat',
    outputFile: 'chaosmarines.json',
    theme: 'chaosmarines',
  },
];

export function getFaction(id: string): FactionConfig | undefined {
  return FACTIONS.find((f) => f.id === id);
}

export function getAllFactionIds(): string[] {
  return FACTIONS.map((f) => f.id);
}
