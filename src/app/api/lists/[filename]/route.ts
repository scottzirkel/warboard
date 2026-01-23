import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// ============================================================================
// Configuration
// ============================================================================

const LISTS_DIR = path.join(process.cwd(), 'data', 'lists');

// ============================================================================
// Types
// ============================================================================

interface RouteParams {
  params: Promise<{ filename: string }>;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Validate that the filename is safe (no path traversal).
 */
function isValidFilename(filename: string): boolean {
  if (!filename) {
    return false;
  }

  // Must end with .json
  if (!filename.endsWith('.json')) {
    return false;
  }

  // No path traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return false;
  }

  return true;
}

// ============================================================================
// GET /api/lists/[filename] - Load specific list
// ============================================================================

export async function GET(
  _request: NextRequest,
  context: RouteParams
): Promise<NextResponse> {
  try {
    const { filename } = await context.params;

    if (!isValidFilename(filename)) {
      return NextResponse.json(
        { error: 'Invalid filename' },
        { status: 400 }
      );
    }

    const filepath = path.join(LISTS_DIR, filename);

    try {
      const content = await fs.readFile(filepath, 'utf-8');
      const data = JSON.parse(content);

      return NextResponse.json(data);
    } catch {
      return NextResponse.json(
        { error: 'List not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error loading list:', error);

    return NextResponse.json(
      { error: 'Failed to load list' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/lists/[filename] - Delete list
// ============================================================================

export async function DELETE(
  _request: NextRequest,
  context: RouteParams
): Promise<NextResponse> {
  try {
    const { filename } = await context.params;

    if (!isValidFilename(filename)) {
      return NextResponse.json(
        { error: 'Invalid filename' },
        { status: 400 }
      );
    }

    const filepath = path.join(LISTS_DIR, filename);

    try {
      await fs.access(filepath);
    } catch {
      return NextResponse.json(
        { error: 'List not found' },
        { status: 404 }
      );
    }

    await fs.unlink(filepath);

    return NextResponse.json({
      success: true,
      message: 'List deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting list:', error);

    return NextResponse.json(
      { error: 'Failed to delete list' },
      { status: 500 }
    );
  }
}
