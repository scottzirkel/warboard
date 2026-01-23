// List service for database operations
//
// This service handles all list CRUD operations using Prisma.
// For now, lists are stored anonymously (without user scoping).
// User scoping will be added in multiuser-004.

import { prisma } from '@/lib/db';
import type { CurrentList, DbList } from '@/types';

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
// Constants
// ============================================================================

// Temporary anonymous user ID for file-based backward compatibility
// This will be replaced with real user IDs in multiuser-004
const ANONYMOUS_USER_ID = 'anonymous';

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Get all lists (for anonymous user).
 * Returns list metadata without the full data payload.
 */
export async function getAllLists(): Promise<ListInfo[]> {
  const lists = await prisma.list.findMany({
    where: { userId: ANONYMOUS_USER_ID },
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
 * Get a single list by ID.
 * Returns the full list data.
 */
export async function getListById(id: string): Promise<ListWithData | null> {
  const list = await prisma.list.findUnique({
    where: { id },
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
 * Get a list by name (for backward compatibility with filename-based lookup).
 */
export async function getListByName(name: string): Promise<ListWithData | null> {
  const list = await prisma.list.findFirst({
    where: {
      userId: ANONYMOUS_USER_ID,
      name: name,
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
 * Create or update a list by name.
 * If a list with the same name exists, it will be updated.
 * This provides backward compatibility with the file-based system.
 */
export async function saveList(listData: CurrentList): Promise<DbList> {
  const existingList = await prisma.list.findFirst({
    where: {
      userId: ANONYMOUS_USER_ID,
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
      userId: ANONYMOUS_USER_ID,
      name: listData.name,
      armyId: listData.army,
      data: JSON.stringify(listData),
    },
  });
}

/**
 * Delete a list by ID.
 */
export async function deleteListById(id: string): Promise<boolean> {
  try {
    await prisma.list.delete({
      where: { id },
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * Delete a list by name (for backward compatibility).
 */
export async function deleteListByName(name: string): Promise<boolean> {
  try {
    const list = await prisma.list.findFirst({
      where: {
        userId: ANONYMOUS_USER_ID,
        name: name,
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
 * Import a list from JSON file data.
 * Used for migrating existing JSON files to the database.
 */
export async function importList(
  name: string,
  armyId: string,
  listData: Record<string, unknown>
): Promise<DbList> {
  // Normalize the list data structure
  const normalizedData: CurrentList = {
    name: listData.name as string || name,
    army: armyId,
    pointsLimit: listData.pointsLimit as number || 2000,
    format: (listData.format || listData.gameFormat || 'standard') as CurrentList['format'],
    detachment: listData.detachment as string || '',
    units: (listData.units || []) as CurrentList['units'],
  };

  return saveList(normalizedData);
}
