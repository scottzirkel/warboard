import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// ============================================================================
// Configuration
// ============================================================================

const LISTS_DIR = path.join(process.cwd(), 'data', 'lists');

// ============================================================================
// Helpers
// ============================================================================

/**
 * Ensure the lists directory exists.
 */
async function ensureListsDir(): Promise<void> {
  try {
    await fs.access(LISTS_DIR);
  } catch {
    await fs.mkdir(LISTS_DIR, { recursive: true });
  }
}

/**
 * Generate a filename from a list name.
 * Replaces spaces with underscores, removes special characters except underscore and hyphen.
 */
function generateFilename(name: string): string {
  return name
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .concat('.json');
}

/**
 * Extract display name from a filename.
 */
function filenameToDisplayName(filename: string): string {
  return filename
    .replace(/\.json$/, '')
    .replace(/_/g, ' ');
}

// ============================================================================
// GET /api/lists - Returns saved list filenames
// ============================================================================

export async function GET(): Promise<NextResponse> {
  try {
    await ensureListsDir();

    const files = await fs.readdir(LISTS_DIR);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    const lists = jsonFiles.map(filename => ({
      filename,
      name: filenameToDisplayName(filename),
    }));

    return NextResponse.json(lists);
  } catch (error) {
    console.error('Error reading lists directory:', error);

    return NextResponse.json(
      { error: 'Failed to read lists' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/lists - Save list to data/lists/
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await ensureListsDir();

    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: 'List name is required' },
        { status: 400 }
      );
    }

    const filename = generateFilename(body.name);
    const filepath = path.join(LISTS_DIR, filename);

    // Add savedAt timestamp
    const listData = {
      ...body,
      savedAt: new Date().toISOString(),
    };

    await fs.writeFile(filepath, JSON.stringify(listData, null, 2));

    return NextResponse.json({
      success: true,
      filename,
      message: 'List saved successfully',
    });
  } catch (error) {
    console.error('Error saving list:', error);

    return NextResponse.json(
      { error: 'Failed to save list' },
      { status: 500 }
    );
  }
}
