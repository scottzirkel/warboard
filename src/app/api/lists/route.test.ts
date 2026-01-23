import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock next-auth
const mockGetServerSession = vi.fn();

vi.mock('next-auth', () => ({
  getServerSession: () => mockGetServerSession(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

// Mock listService
const mockGetAllLists = vi.fn();
const mockSaveList = vi.fn();

vi.mock('@/lib/listService', () => ({
  getAllLists: (userId: string) => mockGetAllLists(userId),
  saveList: (data: unknown, userId: string) => mockSaveList(data, userId),
}));

import { GET, POST } from './route';

describe('API /api/lists', () => {
  const mockUserId = 'test-user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    // Default to authenticated session
    mockGetServerSession.mockResolvedValue({
      user: { id: mockUserId, name: 'Test User', email: 'test@example.com' },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/lists', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('returns empty array when no lists exist', async () => {
      mockGetAllLists.mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(mockGetAllLists).toHaveBeenCalledWith(mockUserId);
      expect(data).toEqual([]);
    });

    it('returns list of saved lists with backward-compatible format', async () => {
      mockGetAllLists.mockResolvedValue([
        { id: 'cid1', name: 'My List', armyId: 'custodes', updatedAt: new Date('2026-01-01T00:00:00Z') },
        { id: 'cid2', name: 'Another List', armyId: 'tyranids', updatedAt: new Date('2026-01-02T00:00:00Z') },
      ]);

      const response = await GET();
      const data = await response.json();

      expect(mockGetAllLists).toHaveBeenCalledWith(mockUserId);
      expect(data).toEqual([
        { id: 'cid1', filename: 'My_List.json', name: 'My List', armyId: 'custodes', updatedAt: '2026-01-01T00:00:00.000Z' },
        { id: 'cid2', filename: 'Another_List.json', name: 'Another List', armyId: 'tyranids', updatedAt: '2026-01-02T00:00:00.000Z' },
      ]);
    });

    it('returns 500 when database error occurs', async () => {
      mockGetAllLists.mockRejectedValue(new Error('Database error'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to read lists');
    });
  });

  describe('POST /api/lists', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/lists', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test List' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('saves a list and returns success', async () => {
      const listData = {
        name: 'My Test List',
        army: 'custodes',
        pointsLimit: 2000,
        format: 'standard',
        detachment: 'shield_host',
        units: [],
      };

      mockSaveList.mockResolvedValue({
        id: 'cid123',
        name: 'My Test List',
      });

      const request = new NextRequest('http://localhost/api/lists', {
        method: 'POST',
        body: JSON.stringify(listData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(mockSaveList).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'My Test List' }),
        mockUserId
      );
      expect(data.success).toBe(true);
      expect(data.id).toBe('cid123');
      expect(data.filename).toBe('My_Test_List.json');
    });

    it('returns error when name is missing', async () => {
      const listData = {
        army: 'custodes',
        pointsLimit: 2000,
      };

      const request = new NextRequest('http://localhost/api/lists', {
        method: 'POST',
        body: JSON.stringify(listData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('List name is required');
    });

    it('handles legacy gameFormat field', async () => {
      const listData = {
        name: 'Legacy List',
        army: 'custodes',
        pointsLimit: 500,
        gameFormat: 'colosseum', // Legacy field
        detachment: 'shield_host',
        units: [],
      };

      mockSaveList.mockResolvedValue({
        id: 'cid456',
        name: 'Legacy List',
      });

      const request = new NextRequest('http://localhost/api/lists', {
        method: 'POST',
        body: JSON.stringify(listData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      // Verify saveList was called with normalized format and userId
      expect(mockSaveList).toHaveBeenCalledWith(
        expect.objectContaining({ format: 'colosseum' }),
        mockUserId
      );
    });

    it('returns 500 when database error occurs', async () => {
      const listData = {
        name: 'Test List',
        army: 'custodes',
        pointsLimit: 2000,
        format: 'standard',
        detachment: 'shield_host',
        units: [],
      };

      mockSaveList.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/lists', {
        method: 'POST',
        body: JSON.stringify(listData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to save list');
    });
  });
});
