import { NextRequest, NextResponse } from 'next/server';
import { getListById, getListByName, deleteListById, deleteListByName } from '@/lib/listService';

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
 * Extract list name from a filename.
 * Handles both legacy filename format (e.g., "My_List.json") and new ID format.
 */
function filenameToName(filename: string): string {
  return filename
    .replace(/\.json$/, '')
    .replace(/_/g, ' ');
}

/**
 * Check if the identifier looks like a database ID (cuid format).
 */
function isCuid(identifier: string): boolean {
  // CUIDs start with 'c' and are alphanumeric, typically 25 chars
  return /^c[a-z0-9]{20,}$/i.test(identifier);
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

    if (!filename) {
      return NextResponse.json(
        { error: 'List identifier is required' },
        { status: 400 }
      );
    }

    // Try to find the list by ID or name
    let list;

    if (isCuid(filename)) {
      // New ID-based lookup
      list = await getListById(filename);
    } else {
      // Legacy filename-based lookup
      const name = filenameToName(filename);
      list = await getListByName(name);
    }

    if (!list) {
      return NextResponse.json(
        { error: 'List not found' },
        { status: 404 }
      );
    }

    // Return the full list data for backward compatibility
    return NextResponse.json({
      ...list.data,
      id: list.id,
      savedAt: list.updatedAt.toISOString(),
    });
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

    if (!filename) {
      return NextResponse.json(
        { error: 'List identifier is required' },
        { status: 400 }
      );
    }

    let deleted = false;

    if (isCuid(filename)) {
      // New ID-based deletion
      deleted = await deleteListById(filename);
    } else {
      // Legacy filename-based deletion
      const name = filenameToName(filename);
      deleted = await deleteListByName(name);
    }

    if (!deleted) {
      return NextResponse.json(
        { error: 'List not found' },
        { status: 404 }
      );
    }

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
