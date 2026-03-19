/**
 * Extracts the leading number from VP strings like "3VP", "+2VP", "5VP per objective (up to 15VP)"
 */
export function parseVP(vpString: string): number {
  const match = vpString.match(/\+?(\d+)\s*VP/i);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Extracts max VP from a maxVp string like "5VP", or returns null if not parseable.
 */
export function parseMaxVP(maxVpString: string | undefined): number | null {
  if (!maxVpString) return null;
  const match = maxVpString.match(/(\d+)\s*VP/i);
  return match ? parseInt(match[1], 10) : null;
}
