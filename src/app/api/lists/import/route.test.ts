import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock next-auth
const mockGetServerSession = vi.fn();

vi.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

// Mock fs module
vi.mock('fs', () => {
  const promises = {
    readdir: vi.fn(),
    readFile: vi.fn(),
  };

  return {
    default: { promises },
    promises,
  };
});

// Mock listService
const mockImportList = vi.fn();
const mockGetAllLists = vi.fn();

vi.mock('@/lib/listService', () => ({
  importList: (name: string, armyId: string, data: unknown, userId: string) => mockImportList(name, armyId, data, userId),
  getAllLists: (userId: string) => mockGetAllLists(userId),
}));

import { promises as fs } from 'fs';
import { POST } from './route';

const mockFs = vi.mocked(fs);

describe('API /api/lists/import', () => {
  const mockUserId = 'test-user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllLists.mockResolvedValue([]);
    // Default to authenticated session
    mockGetServerSession.mockResolvedValue({
      user: { id: mockUserId, name: 'Test User', email: 'test@example.com' },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/lists/import', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Authentication required');
  });

  it('returns success with zero imports when directory is empty', async () => {
    mockFs.readdir.mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/lists/import', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.imported).toBe(0);
    expect(data.message).toBe('No JSON files found to import');
  });

  it('returns success when directory does not exist', async () => {
    mockFs.readdir.mockRejectedValue(new Error('ENOENT'));

    const request = new NextRequest('http://localhost/api/lists/import', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.imported).toBe(0);
  });

  it('imports JSON files from data/lists/', async () => {
    (mockFs.readdir as ReturnType<typeof vi.fn>).mockResolvedValue([
      'My_List.json',
      'Another_List.json',
    ]);
    mockFs.readFile.mockImplementation(async (filepath: unknown) => {
      const path = filepath as string;
      if (path.includes('My_List')) {
        return JSON.stringify({
          name: 'My List',
          army: 'custodes',
          pointsLimit: 2000,
          format: 'standard',
          detachment: 'shield_host',
          units: [],
        });
      }

      return JSON.stringify({
        name: 'Another List',
        army: 'tyranids',
        pointsLimit: 1000,
        format: 'colosseum',
        detachment: 'invasion_fleet',
        units: [],
      });
    });

    mockImportList.mockResolvedValue({ id: 'cid123' });

    const request = new NextRequest('http://localhost/api/lists/import', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.imported).toBe(2);
    expect(mockImportList).toHaveBeenCalledTimes(2);
    // Verify userId is passed
    expect(mockImportList).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(Object),
      mockUserId
    );
  });

  it('skips non-JSON files', async () => {
    (mockFs.readdir as ReturnType<typeof vi.fn>).mockResolvedValue([
      'My_List.json',
      '.DS_Store',
      'readme.md',
    ]);
    mockFs.readFile.mockResolvedValue(JSON.stringify({
      name: 'My List',
      army: 'custodes',
      pointsLimit: 2000,
      units: [],
    }));
    mockImportList.mockResolvedValue({ id: 'cid123' });

    const request = new NextRequest('http://localhost/api/lists/import', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.imported).toBe(1);
    expect(mockImportList).toHaveBeenCalledTimes(1);
  });

  it('skips lists that already exist in database for this user', async () => {
    mockGetAllLists.mockResolvedValue([
      { id: 'existing-id', name: 'My List', armyId: 'custodes', updatedAt: new Date() },
    ]);

    (mockFs.readdir as ReturnType<typeof vi.fn>).mockResolvedValue([
      'My_List.json',
      'New_List.json',
    ]);
    mockFs.readFile.mockImplementation(async (filepath: unknown) => {
      const path = filepath as string;
      if (path.includes('My_List')) {
        return JSON.stringify({
          name: 'My List',
          army: 'custodes',
          units: [],
        });
      }

      return JSON.stringify({
        name: 'New List',
        army: 'tyranids',
        units: [],
      });
    });

    mockImportList.mockResolvedValue({ id: 'cid456' });

    const request = new NextRequest('http://localhost/api/lists/import', {
      method: 'POST',
      body: JSON.stringify({ importAll: true }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.imported).toBe(1);
    expect(data.skipped).toBe(1);
    // Verify getAllLists is called with userId
    expect(mockGetAllLists).toHaveBeenCalledWith(mockUserId);
  });

  it('handles import errors gracefully', async () => {
    (mockFs.readdir as ReturnType<typeof vi.fn>).mockResolvedValue([
      'Valid_List.json',
      'Invalid_List.json',
    ]);
    mockFs.readFile.mockImplementation(async (filepath: unknown) => {
      const path = filepath as string;
      if (path.includes('Invalid_List')) {
        return 'not valid json';
      }

      return JSON.stringify({
        name: 'Valid List',
        army: 'custodes',
        units: [],
      });
    });

    mockImportList.mockResolvedValue({ id: 'cid123' });

    const request = new NextRequest('http://localhost/api/lists/import', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.imported).toBe(1);
    expect(data.errors).toHaveLength(1);
    expect(data.errors[0]).toContain('Invalid_List.json');
  });
});
