import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fs module
vi.mock('fs', () => {
  const promises = {
    access: vi.fn(),
    readFile: vi.fn(),
    unlink: vi.fn(),
  };

  return {
    default: { promises },
    promises,
  };
});

import { promises as fs } from 'fs';
import { GET, DELETE } from './route';
import { NextRequest } from 'next/server';

const mockFs = vi.mocked(fs);

function createMockContext(filename: string) {
  return {
    params: Promise.resolve({ filename }),
  };
}

describe('API /api/lists/[filename]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/lists/[filename]', () => {
    it('returns list data when file exists', async () => {
      const listData = {
        name: 'My List',
        army: 'custodes',
        pointsLimit: 2000,
        units: [],
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(listData));

      const request = new NextRequest('http://localhost/api/lists/My_List.json');
      const context = createMockContext('My_List.json');

      const response = await GET(request, context);
      const data = await response.json();

      expect(data).toEqual(listData);
    });

    it('returns 404 when file does not exist', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT'));

      const request = new NextRequest('http://localhost/api/lists/Nonexistent.json');
      const context = createMockContext('Nonexistent.json');

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('List not found');
    });

    it('returns 400 for invalid filename', async () => {
      const request = new NextRequest('http://localhost/api/lists/../etc/passwd');
      const context = createMockContext('../etc/passwd');

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid filename');
    });

    it('returns 400 for non-JSON filename', async () => {
      const request = new NextRequest('http://localhost/api/lists/test.txt');
      const context = createMockContext('test.txt');

      const response = await GET(request, context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid filename');
    });
  });

  describe('DELETE /api/lists/[filename]', () => {
    it('deletes list when file exists', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.unlink.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/lists/My_List.json', {
        method: 'DELETE',
      });
      const context = createMockContext('My_List.json');

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(mockFs.unlink).toHaveBeenCalledTimes(1);
    });

    it('returns 404 when file does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));

      const request = new NextRequest('http://localhost/api/lists/Nonexistent.json', {
        method: 'DELETE',
      });
      const context = createMockContext('Nonexistent.json');

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('List not found');
    });

    it('returns 400 for invalid filename', async () => {
      const request = new NextRequest('http://localhost/api/lists/../etc/passwd', {
        method: 'DELETE',
      });
      const context = createMockContext('../etc/passwd');

      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid filename');
    });
  });
});
