import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { CurrentList } from '@/types';

// Mock next-auth
const mockGetServerSession = vi.fn();

vi.mock('next-auth', () => ({
  getServerSession: () => mockGetServerSession(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

// Mock listService
const mockGetListById = vi.fn();
const mockGetListByName = vi.fn();
const mockDeleteListById = vi.fn();
const mockDeleteListByName = vi.fn();

vi.mock('@/lib/listService', () => ({
  getListById: (id: string, userId: string) => mockGetListById(id, userId),
  getListByName: (name: string, userId: string) => mockGetListByName(name, userId),
  deleteListById: (id: string, userId: string) => mockDeleteListById(id, userId),
  deleteListByName: (name: string, userId: string) => mockDeleteListByName(name, userId),
}));

import { GET, DELETE } from './route';

function createMockContext(filename: string) {
  return {
    params: Promise.resolve({ filename }),
  };
}

describe('API /api/lists/[filename]', () => {
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

  describe('GET /api/lists/[filename]', () => {
    const mockListData: CurrentList = {
      name: 'My List',
      army: 'custodes',
      pointsLimit: 2000,
      format: 'strike-force',
      detachment: 'shield_host',
      units: [],
    };

    it('returns 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/lists/My_List.json');
      const context = createMockContext('My_List.json');

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('returns list data when found by legacy filename', async () => {
      mockGetListByName.mockResolvedValue({
        id: 'cid123',
        name: 'My List',
        armyId: 'custodes',
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        data: mockListData,
      });

      const request = new NextRequest('http://localhost/api/lists/My_List.json');
      const context = createMockContext('My_List.json');

      const response = await GET(request, context);
      const data = await response.json();

      expect(mockGetListByName).toHaveBeenCalledWith('My List', mockUserId);
      expect(data.name).toBe('My List');
      expect(data.id).toBe('cid123');
      expect(data.army).toBe('custodes');
    });

    it('returns list data when found by ID', async () => {
      mockGetListById.mockResolvedValue({
        id: 'clxyz123456789012345678',
        name: 'My List',
        armyId: 'custodes',
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        data: mockListData,
      });

      const request = new NextRequest('http://localhost/api/lists/clxyz123456789012345678');
      const context = createMockContext('clxyz123456789012345678');

      const response = await GET(request, context);
      const data = await response.json();

      expect(mockGetListById).toHaveBeenCalledWith('clxyz123456789012345678', mockUserId);
      expect(data.name).toBe('My List');
      expect(data.id).toBe('clxyz123456789012345678');
    });

    it('returns 404 when list is not found by name', async () => {
      mockGetListByName.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/lists/Nonexistent.json');
      const context = createMockContext('Nonexistent.json');

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('List not found');
    });

    it('returns 404 when list is not found by ID', async () => {
      mockGetListById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/lists/clxyz123456789012345678');
      const context = createMockContext('clxyz123456789012345678');

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('List not found');
    });

    it('returns 400 when filename is empty', async () => {
      const request = new NextRequest('http://localhost/api/lists/');
      const context = createMockContext('');

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('List identifier is required');
    });
  });

  describe('DELETE /api/lists/[filename]', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/lists/My_List.json', {
        method: 'DELETE',
      });
      const context = createMockContext('My_List.json');

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('deletes list by legacy filename', async () => {
      mockDeleteListByName.mockResolvedValue(true);

      const request = new NextRequest('http://localhost/api/lists/My_List.json', {
        method: 'DELETE',
      });
      const context = createMockContext('My_List.json');

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(mockDeleteListByName).toHaveBeenCalledWith('My List', mockUserId);
      expect(data.success).toBe(true);
    });

    it('deletes list by ID', async () => {
      mockDeleteListById.mockResolvedValue(true);

      const request = new NextRequest('http://localhost/api/lists/clxyz123456789012345678', {
        method: 'DELETE',
      });
      const context = createMockContext('clxyz123456789012345678');

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(mockDeleteListById).toHaveBeenCalledWith('clxyz123456789012345678', mockUserId);
      expect(data.success).toBe(true);
    });

    it('returns 404 when list not found by name', async () => {
      mockDeleteListByName.mockResolvedValue(false);

      const request = new NextRequest('http://localhost/api/lists/Nonexistent.json', {
        method: 'DELETE',
      });
      const context = createMockContext('Nonexistent.json');

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('List not found');
    });

    it('returns 404 when list not found by ID', async () => {
      mockDeleteListById.mockResolvedValue(false);

      const request = new NextRequest('http://localhost/api/lists/clxyz123456789012345678', {
        method: 'DELETE',
      });
      const context = createMockContext('clxyz123456789012345678');

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('List not found');
    });

    it('returns 400 when filename is empty', async () => {
      const request = new NextRequest('http://localhost/api/lists/', {
        method: 'DELETE',
      });
      const context = createMockContext('');

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('List identifier is required');
    });
  });
});
