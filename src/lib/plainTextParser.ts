import type { CurrentList, ListUnit, ArmyData } from '@/types';
import { normalizeUnitName, normalizeEnhancementName, normalizeLoadoutName } from './newRecruitParser';

// ============================================================================
// Types
// ============================================================================

export interface ParsedTextUnit {
  name: string;
  modelCount: number;
  points?: number;
  enhancement?: string;
  isWarlord?: boolean;
  loadout?: string[];
}

export interface ParsedTextList {
  name?: string;
  detachment?: string;
  pointsLimit?: number;
  totalPoints?: number;
  units: ParsedTextUnit[];
}

export interface TextConversionResult {
  list: CurrentList;
  warnings: string[];
  unmatchedUnits: string[];
}

// ============================================================================
// Line Parsing Patterns
// ============================================================================

/**
 * Extract model count from text like "x20", "20x", "× 10", or just "10".
 * Returns 1 if no count found (single model units).
 */
function extractModelCount(text: string): { count: number; remaining: string } {
  // Match patterns like "x20", "20x", "× 10", "x 10"
  const patterns = [
    /\bx\s*(\d+)\b/i,           // x20, x 20
    /\b(\d+)\s*x\b/i,           // 20x, 20 x
    /×\s*(\d+)\b/,              // × 10
    /\b(\d+)\s*×/,              // 10 ×
    /\b(\d+)\s+models?\b/i,     // 10 models
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match) {
      const count = parseInt(match[1], 10);
      const remaining = text.replace(match[0], '').trim();

      return { count, remaining };
    }
  }

  return { count: 1, remaining: text };
}

/**
 * Extract points from text like "90pts", "90 pts", "(90)", "90 points".
 */
function extractPoints(text: string): { points: number | undefined; remaining: string } {
  const patterns = [
    /\((\d+)\s*(?:pts?|points?)?\)/i,     // (90), (90pts), (90 points)
    /(\d+)\s*(?:pts|points)\b/i,          // 90pts, 90 pts, 90 points
    /\b(\d+)\s*(?:pts?|points?)\b/i,      // 90pts anywhere
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match) {
      const points = parseInt(match[1], 10);
      const remaining = text.replace(match[0], '').trim();

      return { points, remaining };
    }
  }

  return { points: undefined, remaining: text };
}

/**
 * Check if text indicates this unit is the warlord.
 */
function isWarlord(text: string): boolean {
  return /\bwarlord\b/i.test(text);
}

/**
 * Parse a single line of text into a unit.
 */
function parseLine(line: string): ParsedTextUnit | null {
  // Skip empty lines, headers, separators
  const trimmed = line.trim();

  if (!trimmed) return null;
  if (/^[-=|+]+$/.test(trimmed)) return null; // Table separators
  if (/^\|?\s*unit\s*\|/i.test(trimmed)) return null; // Header row
  if (/^#{1,3}\s/.test(trimmed)) return null; // Markdown headers (# Title, ## Section, ### Subsection)
  if (/^\*?\*?(?:detachment|points|name|list|army|faction)\*?\*?:/i.test(trimmed)) return null; // Metadata lines
  if (/^\*?\*?total\*?\*?:?\s*\d*/i.test(trimmed)) return null; // Total lines
  if (/^---+$/.test(trimmed)) return null; // Horizontal rules

  // Skip section headers (CHARACTERS, BATTLELINE, HQ, etc.)
  if (/^(?:characters?|battleline|other\s*datasheets?|hq|troops?|elites?|fast\s*attack|heavy\s*support|dedicated\s*transport|flyers?|fortifications?|lords?\s*of\s*war)$/i.test(trimmed)) return null;

  // Skip army header lines like "Adeptus Custodes — 500 Points"
  // These use em-dash (—) or en-dash (–) and typically end with capital "Points"
  if (/^[a-z\s]+[—–]+\s*\d+\s*Points$/i.test(trimmed)) return null;

  // Remove list markers (1., -, *, •)
  let text = trimmed.replace(/^[\d]+[.)]\s*/, '').replace(/^[-*•]\s*/, '');

  // Remove table pipe characters and clean up
  text = text.replace(/^\||\|$/g, '').trim();

  // Remove markdown bold markers and extract the unit name
  text = text.replace(/\*\*/g, '');

  // Extract warlord status (including parenthetical format)
  const warlord = isWarlord(text);
  text = text.replace(/\(?\bwarlord\b\)?/i, '').trim();

  // Extract points
  const pointsResult = extractPoints(text);
  text = pointsResult.remaining;

  // Extract model count
  const countResult = extractModelCount(text);
  text = countResult.remaining;

  // Clean up remaining text (the unit name)
  // Remove common separators and extra whitespace
  // Note: preserve regular hyphens (-) in unit names like "Shield-Captain", but remove trailing separators
  text = text
    .replace(/[|–—]+/g, ' ')  // Only replace pipes, en-dash, em-dash (not regular hyphen)
    .replace(/\s+/g, ' ')
    .replace(/[,;:]+$/, '')
    .replace(/\s*[-–—]+\s*$/, '')  // Remove trailing separators like " - " or " — "
    .trim();

  if (!text) return null;

  return {
    name: text,
    modelCount: countResult.count,
    points: pointsResult.points,
    isWarlord: warlord,
  };
}

/**
 * Parse the Config column which may contain "Warlord, Enhancement" or just loadout info.
 */
function parseConfigColumn(config: string): { warlord: boolean; enhancement?: string; loadout?: string } {
  const warlord = isWarlord(config);

  // Remove "Warlord" and clean up
  let remaining = config.replace(/\bwarlord\b/i, '').trim();

  // Remove leading/trailing commas and clean up
  remaining = remaining.replace(/^[,\s]+|[,\s]+$/g, '').trim();

  // Skip "Default" as it means no special config
  if (/^default$/i.test(remaining)) {
    return { warlord };
  }

  // Check if this looks like an enhancement (typically capitalized words)
  // vs a loadout (typically weapon names)
  if (remaining) {
    // Common enhancement patterns - multi-word names
    return { warlord, enhancement: remaining };
  }

  return { warlord };
}

/**
 * Parse table-format text (markdown tables with | separators).
 */
function parseTableFormat(lines: string[]): ParsedTextUnit[] {
  const units: ParsedTextUnit[] = [];

  for (const line of lines) {
    // Split by pipe and clean each cell
    const cells = line.split('|').map((c) => c.trim()).filter(Boolean);

    if (cells.length < 1) continue;

    // Skip header/separator rows
    if (/^[-=]+$/.test(cells[0])) continue;
    if (/^unit$/i.test(cells[0])) continue;

    // Skip total/summary rows
    const firstCellClean = cells[0].replace(/\*+/g, '').trim().toLowerCase();

    if (firstCellClean === 'total' || firstCellClean === 'totals') continue;

    // Skip metadata rows (Detachment:, Points:, etc.)
    if (/^(?:detachment|points|name|list|army|faction):/i.test(firstCellClean)) continue;

    // First cell is typically the unit name (remove markdown bold)
    let unitName = cells[0].replace(/\*+/g, '').trim();
    let modelCount = 1;
    let points: number | undefined;
    let enhancement: string | undefined;
    let warlord = false;

    // Extract model count from unit name
    const countResult = extractModelCount(unitName);

    if (countResult.count > 1) {
      modelCount = countResult.count;
      unitName = countResult.remaining;
    }

    // Process remaining cells
    for (let i = 1; i < cells.length; i++) {
      const cell = cells[i].replace(/\*+/g, '').trim(); // Remove markdown bold

      if (!cell) continue;

      // Check if this is a plain number (likely points)
      if (/^\d+$/.test(cell)) {
        points = parseInt(cell, 10);
        continue;
      }

      // Check for points with suffix
      const pointsResult = extractPoints(cell);

      if (pointsResult.points !== undefined) {
        points = pointsResult.points;
        continue;
      }

      // This is likely the Config column
      const configResult = parseConfigColumn(cell);

      warlord = warlord || configResult.warlord;

      if (configResult.enhancement) {
        enhancement = configResult.enhancement;
      }
    }

    if (unitName) {
      units.push({
        name: unitName,
        modelCount,
        points,
        enhancement,
        isWarlord: warlord,
      });
    }
  }

  return units;
}

/**
 * Check if a line is an indented sub-item (enhancement, weapon, etc.)
 */
function isIndentedSubItem(line: string): boolean {
  // Indented lines start with spaces/tabs followed by a list marker
  return /^[\s]{2,}[-*•]/.test(line) || /^[\t]+[-*•]/.test(line);
}

/**
 * Check if a line is a model composition line (e.g., "4x Custodian Guard")
 * that describes the contents of a previous unit entry rather than a new unit.
 */
function isModelCompositionLine(line: string, previousUnitName: string | null, previousHadPoints: boolean): boolean {
  if (!previousUnitName) return false;

  const trimmed = line.trim();

  // Must have a model count pattern like "4x" or "x4"
  if (!/\b\d+\s*x\b|\bx\s*\d+\b/i.test(trimmed)) return false;

  // Must NOT have points (lines with points are unit entries)
  if (/\d+\s*(?:pts?|points?)/i.test(trimmed)) return false;
  if (/\(\d+\)/.test(trimmed)) return false;

  // Extract the unit name from the line (remove model count)
  const { remaining } = extractModelCount(trimmed);
  const lineUnitName = remaining.replace(/[|–—]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  const prevNormalized = previousUnitName.toLowerCase().replace(/\s+/g, ' ').trim();

  // Check if the names match (fuzzy)
  const namesMatch = lineUnitName.includes(prevNormalized) ||
    prevNormalized.includes(lineUnitName) ||
    normalizeUnitName(lineUnitName) === normalizeUnitName(prevNormalized);

  if (namesMatch) return true;

  // If it looks like a weapon/equipment, it's NOT a composition line
  // (e.g., "4x Sentinel Blade" is a weapon description, not "4x Model Name")
  if (isWeaponOrEquipmentLine(remaining)) return false;

  // If the previous unit had points and this line doesn't, it's likely a model
  // composition line (e.g., "1x Witchseeker Sister Superior" after "Witchseekers (65 pts)")
  // This handles cases where model names differ from unit names
  if (previousHadPoints) {
    // Check if it looks like a model description (simple name, no special chars except spaces)
    // and not a section header or other metadata
    const isSimpleName = /^[a-z\s'-]+$/i.test(lineUnitName) && lineUnitName.length > 2;
    const isNotSectionHeader = !/^(?:characters?|battleline|other|troops?|hq|elite|fast|heavy|dedicated|flyer|fortification|lord of war)/i.test(lineUnitName);

    return isSimpleName && isNotSectionHeader;
  }

  return false;
}

/**
 * Parse an indented sub-item line for enhancement or weapon info.
 */
function parseSubItem(line: string): { enhancement?: string; weapon?: string } {
  const trimmed = line.trim().replace(/^[-*•]\s*/, '');

  // Check for enhancement pattern: "Enhancement: Name (points)"
  const enhancementMatch = trimmed.match(/^Enhancement:\s*(.+?)(?:\s*\(\d+\s*(?:pts?)?\))?$/i);

  if (enhancementMatch) {
    return { enhancement: enhancementMatch[1].trim() };
  }

  // Otherwise it's likely a weapon/loadout
  // Skip common non-weapon lines
  if (/^(?:warlord|default|none)$/i.test(trimmed)) {
    return {};
  }

  return { weapon: trimmed };
}

/**
 * Check if a line looks like a weapon or equipment description rather than a unit.
 */
function isWeaponOrEquipmentLine(line: string): boolean {
  const trimmed = line.trim().toLowerCase();

  // Common weapon/equipment patterns
  const weaponPatterns = [
    /\bweapon\b/,
    /\bflamer\b/,
    /\bpistol\b/,
    /\brifle\b/,
    /\bcannon\b/,
    /\bsword\b/,
    /\bblade\b/,
    /\bspear\b/,
    /\baxe\b/,
    /\bshield\b/,
    /\btalon\b/,
    /\bclaw\b/,
    /\bgun\b/,
    /\blauncher\b/,
    /\bbolter\b/,
    /\bmelta\b/,
    /\bplasma\b/,
  ];

  return weaponPatterns.some((pattern) => pattern.test(trimmed));
}

/**
 * Parse plain list format (one unit per line), with support for
 * hierarchical markdown format where enhancements/weapons are indented.
 */
function parseListFormat(lines: string[]): ParsedTextUnit[] {
  const units: ParsedTextUnit[] = [];
  let currentUnit: ParsedTextUnit | null = null;
  let currentUnitHadPoints = false;

  for (const line of lines) {
    // Check if this is an indented sub-item belonging to the current unit
    if (isIndentedSubItem(line) && currentUnit) {
      const subItem = parseSubItem(line);

      if (subItem.enhancement) {
        currentUnit.enhancement = subItem.enhancement;
      }

      if (subItem.weapon) {
        if (!currentUnit.loadout) {
          currentUnit.loadout = [];
        }

        currentUnit.loadout.push(subItem.weapon);
      }

      continue;
    }

    // Check for standalone "Warlord" line (marks current unit as warlord)
    if (currentUnit && currentUnitHadPoints && /^\s*warlord\s*$/i.test(line)) {
      currentUnit.isWarlord = true;
      continue;
    }

    // Check for standalone "Enhancement: Name" line
    const enhancementLineMatch = line.trim().match(/^Enhancement:\s*(.+)$/i);

    if (currentUnit && currentUnitHadPoints && enhancementLineMatch) {
      currentUnit.enhancement = enhancementLineMatch[1].replace(/\s*\(\d+\s*(?:pts?)?\)$/, '').trim();
      continue;
    }

    // Check if this is a model composition line like "4x Custodian Guard"
    // that describes the contents of the previous unit, not a new unit
    if (currentUnit && isModelCompositionLine(line, currentUnit.name, currentUnitHadPoints)) {
      // Extract model count from this line and update if it's higher
      const { count } = extractModelCount(line.trim());

      if (count > currentUnit.modelCount) {
        currentUnit.modelCount = count;
      }

      continue;
    }

    // Try to parse as a unit line
    const parsed = parseLine(line);

    if (parsed) {
      // If we're in a unit context (after a unit with points) and this line
      // has no points, check if it's unit metadata or loadout
      if (currentUnit && currentUnitHadPoints && parsed.points === undefined) {
        // Check for "Warlord" standalone line
        if (/^warlord$/i.test(parsed.name)) {
          currentUnit.isWarlord = true;
          continue;
        }

        // Check for "Enhancement: Name" line
        const enhancementMatch = parsed.name.match(/^Enhancement:\s*(.+)$/i);

        if (enhancementMatch) {
          currentUnit.enhancement = enhancementMatch[1].replace(/\s*\(\d+\s*(?:pts?)?\)$/, '').trim();
          continue;
        }

        // Check if this looks like a weapon line
        if (isWeaponOrEquipmentLine(parsed.name)) {
          if (!currentUnit.loadout) {
            currentUnit.loadout = [];
          }

          currentUnit.loadout.push(parsed.name);
          continue;
        }
      }

      // Save previous unit if exists
      if (currentUnit) {
        units.push(currentUnit);
      }

      currentUnit = parsed;
      currentUnitHadPoints = parsed.points !== undefined;
    }
  }

  // Don't forget the last unit
  if (currentUnit) {
    units.push(currentUnit);
  }

  return units;
}

/**
 * Detect if text is table format (has | separators).
 */
function isTableFormat(text: string): boolean {
  const lines = text.split('\n').filter((l) => l.trim()); // Only count non-empty lines
  const pipeLines = lines.filter((l) => l.includes('|'));

  // If most non-empty lines have pipes, it's a table
  return pipeLines.length >= lines.length / 2 && pipeLines.length >= 2;
}

// ============================================================================
// Header Parsing
// ============================================================================

/**
 * Extract detachment from header lines.
 * Matches patterns like "**Detachment:** Invasion Fleet" or "Detachment: Shield Host"
 */
function extractDetachment(lines: string[]): string | undefined {
  for (const line of lines) {
    const match = line.match(/\*?\*?Detachment\*?\*?:\s*\*?\*?(.+?)\*?\*?\s*$/i);

    if (match) {
      return match[1].trim();
    }
  }

  return undefined;
}

/**
 * Extract points limit from header lines.
 * Matches patterns like "**Points:** 480 / 500" or "Points: 480/500"
 */
function extractPointsLimit(lines: string[]): number | undefined {
  for (const line of lines) {
    // Remove markdown formatting first, then match
    const cleaned = line.replace(/\*+/g, '');
    const match = cleaned.match(/Points:\s*(\d+)\s*\/\s*(\d+)/i);

    if (match) {
      return parseInt(match[2], 10); // Return the limit (second number)
    }
  }

  return undefined;
}

/**
 * Extract list name from header lines.
 * Matches patterns like "**Name:** My List" or "# My List"
 */
function extractListName(lines: string[]): string | undefined {
  for (const line of lines) {
    // Check for explicit name
    const nameMatch = line.match(/\*?\*?(?:Name|List)\*?\*?:\s*\*?\*?(.+?)\*?\*?\s*$/i);

    if (nameMatch) {
      return nameMatch[1].trim();
    }

    // Check for markdown heading
    const headingMatch = line.match(/^#+\s+(.+)$/);

    if (headingMatch && !headingMatch[1].toLowerCase().includes('detachment')) {
      return headingMatch[1].trim();
    }
  }

  return undefined;
}

// ============================================================================
// Main Parser
// ============================================================================

/**
 * Parse plain text into a structured list.
 */
export function parsePlainText(text: string): ParsedTextList {
  const lines = text.split('\n').filter((l) => l.trim());

  // Extract header info
  const detachment = extractDetachment(lines);
  const pointsLimit = extractPointsLimit(lines);
  const name = extractListName(lines);

  // Detect format and parse accordingly
  const units = isTableFormat(text)
    ? parseTableFormat(lines)
    : parseListFormat(lines);

  // Calculate total points from units if available
  const calculatedTotal = units.reduce((sum, u) => sum + (u.points || 0), 0);

  return {
    name,
    detachment,
    pointsLimit,
    units,
    totalPoints: calculatedTotal > 0 ? calculatedTotal : undefined,
  };
}

// ============================================================================
// Conversion to CurrentList
// ============================================================================

/**
 * Find a matching unit in army data by normalized name.
 */
function findUnit(armyData: ArmyData, name: string): string | undefined {
  const normalized = normalizeUnitName(name);

  // Direct match
  const directMatch = armyData.units.find((u) => u.id === normalized);

  if (directMatch) return directMatch.id;

  // Fuzzy match by comparing normalized names
  const fuzzyMatch = armyData.units.find(
    (u) => normalizeUnitName(u.name) === normalized
  );

  if (fuzzyMatch) return fuzzyMatch.id;

  // Partial match - unit name contains search term or vice versa
  const partialMatch = armyData.units.find((u) => {
    const unitNorm = normalizeUnitName(u.name);

    return unitNorm.includes(normalized) || normalized.includes(unitNorm);
  });

  if (partialMatch) return partialMatch.id;

  // Check allies
  if (armyData.allies) {
    for (const ally of Object.values(armyData.allies)) {
      for (const unit of ally.units || []) {
        if (
          unit.id === normalized ||
          normalizeUnitName(unit.name) === normalized
        ) {
          return unit.id;
        }
      }
    }
  }

  return undefined;
}

/**
 * Find a matching enhancement in the detachment.
 * Uses fuzzy matching to handle spelling variations (e.g., "Armories" vs "Armouries")
 */
function findEnhancement(
  armyData: ArmyData,
  detachmentId: string,
  name: string | undefined
): string {
  if (!name) return '';

  const detachment = armyData.detachments[detachmentId];

  if (!detachment) return '';

  const normalized = normalizeEnhancementName(name);

  // Direct match
  const directMatch = detachment.enhancements.find(
    (e) =>
      e.id === normalized || normalizeEnhancementName(e.name) === normalized
  );

  if (directMatch) return directMatch.id;

  // Fuzzy match - handle spelling variations like "Halls"/"Hall" or "Armories"/"Armouries"
  const normalizedWords = normalized.split('-').filter(w => w.length > 2);
  const fuzzyMatch = detachment.enhancements.find((e) => {
    const enhNorm = normalizeEnhancementName(e.name);
    const enhWords = enhNorm.split('-').filter(w => w.length > 2);

    // Check if most significant words match
    const matchingWords = normalizedWords.filter(w =>
      enhWords.some(ew => ew.includes(w) || w.includes(ew))
    );

    return matchingWords.length >= Math.min(normalizedWords.length, enhWords.length) - 1;
  });

  return fuzzyMatch?.id || '';
}

/**
 * Find a matching detachment in army data.
 */
function findDetachment(
  armyData: ArmyData,
  name: string | undefined
): string | undefined {
  if (!name) return Object.keys(armyData.detachments)[0];

  const normalized = normalizeUnitName(name);

  for (const [id, detachment] of Object.entries(armyData.detachments)) {
    if (id === normalized || normalizeUnitName(detachment.name) === normalized) {
      return id;
    }
  }

  // Return first detachment as fallback
  return Object.keys(armyData.detachments)[0];
}

/**
 * Map loadout names to weapon counts.
 * Always initializes all choices to 0, then sets defaults or matched loadouts.
 */
function mapLoadout(
  armyData: ArmyData,
  unitId: string,
  loadout: string[] | undefined,
  modelCount: number
): Record<string, number> {
  const unit = armyData.units.find((u) => u.id === unitId);

  if (!unit || !unit.loadoutOptions) {
    return {};
  }

  const weaponCounts: Record<string, number> = {};

  // First, initialize all choices to 0
  for (const option of unit.loadoutOptions) {
    for (const choice of option.choices) {
      if (choice.id !== 'none') {
        weaponCounts[choice.id] = 0;
      }
    }
  }

  // If no loadout specified, apply defaults
  if (!loadout || loadout.length === 0) {
    for (const option of unit.loadoutOptions) {
      // Only apply defaults for 'choice' type options
      if (option.type === 'choice') {
        const defaultChoice = option.choices.find(c => c.default) || option.choices[0];

        if (defaultChoice && defaultChoice.id !== 'none') {
          weaponCounts[defaultChoice.id] = modelCount;
        }
      }
    }

    return weaponCounts;
  }

  // Check each loadout option for matches
  for (const option of unit.loadoutOptions) {
    let hasMatch = false;

    for (const choice of option.choices) {
      if (choice.id === 'none') continue;

      const choiceNormalized = normalizeLoadoutName(choice.name);

      // Check if any loadout item matches this choice
      const matches = loadout.some((l) => {
        const loadoutNorm = normalizeLoadoutName(l);

        return (
          loadoutNorm.includes(choiceNormalized) ||
          choiceNormalized.includes(loadoutNorm)
        );
      });

      if (matches) {
        // Use maxModels if specified, otherwise use model count
        weaponCounts[choice.id] = choice.maxModels || modelCount;
        hasMatch = true;
      }
    }

    // If no match found for a 'choice' type option, apply default
    if (!hasMatch && option.type === 'choice') {
      const defaultChoice = option.choices.find(c => c.default) || option.choices[0];

      if (defaultChoice && defaultChoice.id !== 'none') {
        weaponCounts[defaultChoice.id] = modelCount;
      }
    }
  }

  return weaponCounts;
}

/**
 * Convert parsed plain text list to CurrentList.
 */
export function convertTextToCurrentList(
  parsed: ParsedTextList,
  armyData: ArmyData,
  armyId: string
): TextConversionResult {
  const warnings: string[] = [];
  const unmatchedUnits: string[] = [];

  // Find detachment from parsed text or use first as default
  const detachmentId = findDetachment(armyData, parsed.detachment) || '';

  if (parsed.detachment && detachmentId !== normalizeUnitName(parsed.detachment)) {
    const foundDetachment = armyData.detachments[detachmentId];

    if (foundDetachment && normalizeUnitName(foundDetachment.name) !== normalizeUnitName(parsed.detachment)) {
      warnings.push(`Could not find detachment "${parsed.detachment}", using ${foundDetachment.name}`);
    }
  }

  const units: ListUnit[] = [];

  for (const parsedUnit of parsed.units) {
    const unitId = findUnit(armyData, parsedUnit.name);

    if (!unitId) {
      unmatchedUnits.push(parsedUnit.name);
      warnings.push(`Could not find unit: ${parsedUnit.name}`);
      continue;
    }

    // Find unit definition to validate model count
    const unitDef = armyData.units.find((u) => u.id === unitId);
    let modelCount = parsedUnit.modelCount;

    if (unitDef) {
      const validCounts = Object.keys(unitDef.points).map(Number);

      if (!validCounts.includes(modelCount)) {
        // Find closest valid count
        const closest = validCounts.reduce((prev, curr) =>
          Math.abs(curr - modelCount) < Math.abs(prev - modelCount)
            ? curr
            : prev
        );

        warnings.push(
          `${parsedUnit.name}: Adjusted model count from ${modelCount} to ${closest}`
        );
        modelCount = closest;
      }
    }

    const enhancement = findEnhancement(
      armyData,
      detachmentId,
      parsedUnit.enhancement
    );

    if (parsedUnit.enhancement && !enhancement) {
      warnings.push(
        `Could not find enhancement: ${parsedUnit.enhancement} for ${parsedUnit.name}`
      );
    }

    const weaponCounts = mapLoadout(
      armyData,
      unitId,
      parsedUnit.loadout,
      modelCount
    );

    units.push({
      unitId,
      modelCount,
      enhancement,
      weaponCounts,
      currentWounds: null,
      leaderCurrentWounds: null,
      attachedLeader: null,
    });
  }

  // Calculate points limit (round up to nearest 500)
  const totalPoints = parsed.totalPoints || 500;
  const pointsLimit = Math.ceil(totalPoints / 500) * 500;

  return {
    list: {
      name: parsed.name || 'Imported List',
      army: armyId,
      pointsLimit,
      format: 'standard',
      detachment: detachmentId,
      units,
    },
    warnings,
    unmatchedUnits,
  };
}

// ============================================================================
// Main Import Function
// ============================================================================

/**
 * Import plain text into a CurrentList.
 */
export function importPlainText(
  text: string,
  armyData: ArmyData,
  armyId: string
): TextConversionResult {
  const parsed = parsePlainText(text);

  if (parsed.units.length === 0) {
    throw new Error('No units found in text. Please check the format.');
  }

  return convertTextToCurrentList(parsed, armyData, armyId);
}
