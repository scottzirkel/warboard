// List service for database operations
//
// This service handles all list CRUD operations using Prisma.
// All operations are scoped to the authenticated user.

import { prisma } from '@/lib/db';
import type { CurrentList, DbList, GameFormat } from '@/types';

/** Map old 'standard' format to 'strike-force' for backwards compatibility. */
function migrateFormat(format: unknown): GameFormat {
  if (format === 'standard') return 'strike-force';
  if (format === 'colosseum' || format === 'incursion' || format === 'strike-force' || format === 'onslaught' || format === 'custom') {
    return format;
  }
  return 'strike-force';
}

// ============================================================================
// Types
// ============================================================================

export interface ListInfo {
  id: string;
  name: string;
  armyId: string;
  updatedAt: Date;
}

export interface ListWithData extends ListInfo {
  data: CurrentList;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Get all lists for a specific user.
 * Returns list metadata without the full data payload.
 */
export async function getAllLists(userId: string): Promise<ListInfo[]> {
  const lists = await prisma.list.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      armyId: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  return lists;
}

/**
 * Get a single list by ID for a specific user.
 * Returns the full list data, or null if not found or not owned by user.
 */
export async function getListById(id: string, userId: string): Promise<ListWithData | null> {
  const list = await prisma.list.findFirst({
    where: { id, userId },
  });

  if (!list) {
    return null;
  }

  return {
    id: list.id,
    name: list.name,
    armyId: list.armyId,
    updatedAt: list.updatedAt,
    data: JSON.parse(list.data) as CurrentList,
  };
}

/**
 * Get a list by name for a specific user.
 * Used for backward compatibility with filename-based lookup.
 */
export async function getListByName(name: string, userId: string): Promise<ListWithData | null> {
  const list = await prisma.list.findFirst({
    where: {
      userId,
      name,
    },
  });

  if (!list) {
    return null;
  }

  return {
    id: list.id,
    name: list.name,
    armyId: list.armyId,
    updatedAt: list.updatedAt,
    data: JSON.parse(list.data) as CurrentList,
  };
}

/**
 * Create or update a list by name for a specific user.
 * If a list with the same name exists for that user, it will be updated.
 */
export async function saveList(listData: CurrentList, userId: string): Promise<DbList> {
  const existingList = await prisma.list.findFirst({
    where: {
      userId,
      name: listData.name,
    },
  });

  if (existingList) {
    // Update existing list
    return prisma.list.update({
      where: { id: existingList.id },
      data: {
        armyId: listData.army,
        data: JSON.stringify(listData),
      },
    });
  }

  // Create new list
  return prisma.list.create({
    data: {
      userId,
      name: listData.name,
      armyId: listData.army,
      data: JSON.stringify(listData),
    },
  });
}

/**
 * Delete a list by ID for a specific user.
 * Returns false if the list doesn't exist or doesn't belong to the user.
 */
export async function deleteListById(id: string, userId: string): Promise<boolean> {
  try {
    // First verify the list belongs to this user
    const list = await prisma.list.findFirst({
      where: { id, userId },
    });

    if (!list) {
      return false;
    }

    await prisma.list.delete({
      where: { id },
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * Delete a list by name for a specific user.
 * Used for backward compatibility with filename-based deletion.
 */
export async function deleteListByName(name: string, userId: string): Promise<boolean> {
  try {
    const list = await prisma.list.findFirst({
      where: {
        userId,
        name,
      },
    });

    if (!list) {
      return false;
    }

    await prisma.list.delete({
      where: { id: list.id },
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * Import a list from JSON file data for a specific user.
 * Used for migrating existing JSON files to the database.
 */
export async function importList(
  name: string,
  armyId: string,
  listData: Record<string, unknown>,
  userId: string
): Promise<DbList> {
  // Normalize the list data structure
  const normalizedData: CurrentList = {
    name: listData.name as string || name,
    army: armyId,
    pointsLimit: listData.pointsLimit as number || 2000,
    format: migrateFormat(listData.format || listData.gameFormat || 'strike-force'),
    detachment: listData.detachment as string || '',
    units: (listData.units || []) as CurrentList['units'],
  };

  return saveList(normalizedData, userId);
}
