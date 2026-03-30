import { prisma } from '@/lib/db';
import type { GameResultInfo, GameResult, CurrentList, GameResultOutcome, GameFormat } from '@/types';

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Get all game results for a specific user.
 * Returns metadata only, ordered by date descending.
 */
export async function getAllGameResults(userId: string): Promise<GameResultInfo[]> {
  const results = await prisma.gameResult.findMany({
    where: { userId },
    select: {
      id: true,
      date: true,
      army: true,
      opponentFaction: true,
      result: true,
      totalVP: true,
    },
    orderBy: { date: 'desc' },
  });

  return results as GameResultInfo[];
}

/**
 * Get a single game result by ID for a specific user.
 */
export async function getGameResultById(id: string, userId: string): Promise<GameResult | null> {
  const result = await prisma.gameResult.findFirst({
    where: { id, userId },
  });

  if (!result) return null;

  return {
    id: result.id,
    date: result.date,
    army: result.army,
    detachment: result.detachment,
    format: result.format as GameFormat,
    pointsLimit: result.pointsLimit,
    opponentFaction: result.opponentFaction,
    result: result.result as GameResultOutcome,
    primaryVP: result.primaryVP,
    secondaryVP: result.secondaryVP,
    totalVP: result.totalVP,
    primaryMissionName: result.primaryMission,
    listSnapshot: JSON.parse(result.listSnapshot) as CurrentList,
  };
}

/**
 * Save a new game result for a specific user.
 */
export async function saveGameResult(
  data: Omit<GameResult, 'id'>,
  userId: string,
): Promise<{ id: string }> {
  const result = await prisma.gameResult.create({
    data: {
      userId,
      date: data.date,
      army: data.army,
      detachment: data.detachment,
      format: data.format,
      pointsLimit: data.pointsLimit,
      opponentFaction: data.opponentFaction,
      result: data.result,
      primaryVP: data.primaryVP,
      secondaryVP: data.secondaryVP,
      totalVP: data.totalVP,
      primaryMission: data.primaryMissionName,
      listSnapshot: JSON.stringify(data.listSnapshot),
    },
    select: { id: true },
  });

  return result;
}

/**
 * Delete a game result by ID for a specific user.
 */
export async function deleteGameResult(id: string, userId: string): Promise<boolean> {
  try {
    const result = await prisma.gameResult.findFirst({
      where: { id, userId },
    });

    if (!result) return false;

    await prisma.gameResult.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}
