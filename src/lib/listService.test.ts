import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CurrentList } from '@/types';

// Mock Prisma client - must be defined inline in vi.mock factory
vi.mock('@/lib/db', () => ({
  prisma: {
    list: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Import the mocked prisma to access mock functions
import { prisma } from '@/lib/db';
const mockPrisma = prisma as unknown as {
  list: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
};

import {
  getAllLists,
  getListById,
  getListByName,
  saveList,
  deleteListById,
  deleteListByName,
  importList,
} from './listService';

describe('listService', () => {
  const testUserId = 'test-user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllLists', () => {
    it('returns empty array when no lists exist', async () => {
      mockPrisma.list.findMany.mockResolvedValue([]);

      const result = await getAllLists(testUserId);

      expect(result).toEqual([]);
      expect(mockPrisma.list.findMany).toHaveBeenCalledWith({
        where: { userId: testUserId },
        select: {
          id: true,
          name: true,
          armyId: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
      });
    });

    it('returns list of saved lists', async () => {
      const mockLists = [
        { id: 'cid1', name: 'List One', armyId: 'custodes', updatedAt: new Date('2026-01-01') },
        { id: 'cid2', name: 'List Two', armyId: 'tyranids', updatedAt: new Date('2026-01-02') },
      ];
      mockPrisma.list.findMany.mockResolvedValue(mockLists);

      const result = await getAllLists(testUserId);

      expect(result).toEqual(mockLists);
    });
  });

  describe('getListById', () => {
    it('returns null when list does not exist', async () => {
      mockPrisma.list.findFirst.mockResolvedValue(null);

      const result = await getListById('nonexistent', testUserId);

      expect(result).toBeNull();
    });

    it('returns list with parsed data when found', async () => {
      const listData: CurrentList = {
        name: 'Test List',
        army: 'custodes',
        pointsLimit: 2000,
        format: 'standard',
        detachment: 'shield_host',
        units: [],
      };
      const mockList = {
        id: 'cid123',
        name: 'Test List',
        armyId: 'custodes',
        data: JSON.stringify(listData),
        updatedAt: new Date('2026-01-01'),
      };
      mockPrisma.list.findFirst.mockResolvedValue(mockList);

      const result = await getListById('cid123', testUserId);

      expect(result).toEqual({
        id: 'cid123',
        name: 'Test List',
        armyId: 'custodes',
        updatedAt: mockList.updatedAt,
        data: listData,
      });
    });
  });

  describe('getListByName', () => {
    it('returns null when list does not exist', async () => {
      mockPrisma.list.findFirst.mockResolvedValue(null);

      const result = await getListByName('Nonexistent', testUserId);

      expect(result).toBeNull();
    });

    it('returns list with parsed data when found', async () => {
      const listData: CurrentList = {
        name: 'My List',
        army: 'tyranids',
        pointsLimit: 1000,
        format: 'colosseum',
        detachment: 'invasion_fleet',
        units: [],
      };
      const mockList = {
        id: 'cid456',
        name: 'My List',
        armyId: 'tyranids',
        data: JSON.stringify(listData),
        updatedAt: new Date('2026-01-15'),
      };
      mockPrisma.list.findFirst.mockResolvedValue(mockList);

      const result = await getListByName('My List', testUserId);

      expect(result).toEqual({
        id: 'cid456',
        name: 'My List',
        armyId: 'tyranids',
        updatedAt: mockList.updatedAt,
        data: listData,
      });
    });
  });

  describe('saveList', () => {
    const listData: CurrentList = {
      name: 'New List',
      army: 'custodes',
      pointsLimit: 2000,
      format: 'standard',
      detachment: 'shield_host',
      units: [],
    };

    it('creates new list when it does not exist', async () => {
      mockPrisma.list.findFirst.mockResolvedValue(null);
      mockPrisma.list.create.mockResolvedValue({
        id: 'cid789',
        userId: testUserId,
        name: 'New List',
        armyId: 'custodes',
        data: JSON.stringify(listData),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await saveList(listData, testUserId);

      expect(mockPrisma.list.create).toHaveBeenCalledWith({
        data: {
          userId: testUserId,
          name: 'New List',
          armyId: 'custodes',
          data: JSON.stringify(listData),
        },
      });
    });

    it('updates existing list when it already exists', async () => {
      mockPrisma.list.findFirst.mockResolvedValue({
        id: 'existing-id',
        name: 'New List',
      });
      mockPrisma.list.update.mockResolvedValue({
        id: 'existing-id',
        userId: testUserId,
        name: 'New List',
        armyId: 'custodes',
        data: JSON.stringify(listData),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await saveList(listData, testUserId);

      expect(mockPrisma.list.update).toHaveBeenCalledWith({
        where: { id: 'existing-id' },
        data: {
          armyId: 'custodes',
          data: JSON.stringify(listData),
        },
      });
    });
  });

  describe('deleteListById', () => {
    it('returns true when list is deleted successfully', async () => {
      mockPrisma.list.findFirst.mockResolvedValue({ id: 'cid123' });
      mockPrisma.list.delete.mockResolvedValue({});

      const result = await deleteListById('cid123', testUserId);

      expect(result).toBe(true);
      expect(mockPrisma.list.delete).toHaveBeenCalledWith({
        where: { id: 'cid123' },
      });
    });

    it('returns false when list not found for user', async () => {
      mockPrisma.list.findFirst.mockResolvedValue(null);

      const result = await deleteListById('nonexistent', testUserId);

      expect(result).toBe(false);
    });
  });

  describe('deleteListByName', () => {
    it('returns true when list is deleted successfully', async () => {
      mockPrisma.list.findFirst.mockResolvedValue({
        id: 'cid123',
        name: 'Test List',
      });
      mockPrisma.list.delete.mockResolvedValue({});

      const result = await deleteListByName('Test List', testUserId);

      expect(result).toBe(true);
    });

    it('returns false when list is not found', async () => {
      mockPrisma.list.findFirst.mockResolvedValue(null);

      const result = await deleteListByName('Nonexistent', testUserId);

      expect(result).toBe(false);
    });
  });

  describe('importList', () => {
    it('normalizes and saves imported list data', async () => {
      mockPrisma.list.findFirst.mockResolvedValue(null);
      mockPrisma.list.create.mockResolvedValue({
        id: 'cid999',
        userId: testUserId,
        name: 'Imported List',
        armyId: 'custodes',
        data: '{}',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const importData = {
        name: 'Imported List',
        pointsLimit: 1500,
        gameFormat: 'colosseum', // Legacy field
        detachment: 'auric_champions',
        units: [],
      };

      await importList('Imported List', 'custodes', importData, testUserId);

      expect(mockPrisma.list.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Imported List',
          armyId: 'custodes',
        }),
      });
    });

    it('handles legacy gameFormat field', async () => {
      mockPrisma.list.findFirst.mockResolvedValue(null);
      mockPrisma.list.create.mockResolvedValue({
        id: 'cid888',
        userId: testUserId,
        name: 'Legacy List',
        armyId: 'custodes',
        data: '{}',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const importData = {
        name: 'Legacy List',
        gameFormat: 'colosseum', // Legacy field
        units: [],
      };

      await importList('Legacy List', 'custodes', importData, testUserId);

      // Verify the data was normalized with format instead of gameFormat
      const callArgs = mockPrisma.list.create.mock.calls[0][0];
      const savedData = JSON.parse(callArgs.data.data);

      expect(savedData.format).toBe('colosseum');
    });
  });
});
