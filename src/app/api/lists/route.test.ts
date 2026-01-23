import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fs module
vi.mock('fs', () => {
  const promises = {
    access: vi.fn(),
    mkdir: vi.fn(),
    readdir: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn(),
    unlink: vi.fn(),
  };

  return {
    default: { promises },
    promises,
  };
});

import { promises as fs } from 'fs';
import { GET, POST } from './route';
import { NextRequest } from 'next/server';

const mockFs = vi.mocked(fs);

describe('API /api/lists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFs.access.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/lists', () => {
    it('returns empty array when no lists exist', async () => {
      mockFs.readdir.mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(data).toEqual([]);
    });

    it('returns list of saved lists', async () => {
      // readdir returns strings when called without withFileTypes option
      // Using 'any' cast because readdir overload types are complex
      (mockFs.readdir as ReturnType<typeof vi.fn>).mockResolvedValue([
        'My_List.json',
        'Another_List.json',
      ]);

      const response = await GET();
      const data = await response.json();

      expect(data).toEqual([
        { filename: 'My_List.json', name: 'My List' },
        { filename: 'Another_List.json', name: 'Another List' },
      ]);
    });

    it('filters out non-JSON files', async () => {
      // readdir returns strings when called without withFileTypes option
      // Using cast because readdir overload types are complex
      (mockFs.readdir as ReturnType<typeof vi.fn>).mockResolvedValue([
        'My_List.json',
        '.DS_Store',
        'readme.md',
      ]);

      const response = await GET();
      const data = await response.json();

      expect(data).toEqual([
        { filename: 'My_List.json', name: 'My List' },
      ]);
    });

    it('creates lists directory if it does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([]);

      await GET();

      expect(mockFs.mkdir).toHaveBeenCalled();
    });
  });

  describe('POST /api/lists', () => {
    it('saves a list with the correct filename', async () => {
      const listData = {
        name: 'My Test List',
        army: 'custodes',
        pointsLimit: 2000,
        format: 'standard',
        detachment: 'shield_host',
        units: [],
      };

      const request = new NextRequest('http://localhost/api/lists', {
        method: 'POST',
        body: JSON.stringify(listData),
      });

      mockFs.writeFile.mockResolvedValue(undefined);

      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.filename).toBe('My_Test_List.json');
      expect(mockFs.writeFile).toHaveBeenCalledTimes(1);
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

    it('handles special characters in list name', async () => {
      const listData = {
        name: 'Test @List',
        army: 'custodes',
        pointsLimit: 2000,
        format: 'standard',
        detachment: 'shield_host',
        units: [],
      };

      const request = new NextRequest('http://localhost/api/lists', {
        method: 'POST',
        body: JSON.stringify(listData),
      });

      mockFs.writeFile.mockResolvedValue(undefined);

      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      // Special characters are removed, spaces become underscores
      expect(data.filename).toBe('Test_List.json');
    });
  });
});
