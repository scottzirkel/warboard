import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { importList, getAllLists } from '@/lib/listService';
import { promises as fs } from 'fs';
import path from 'path';

// ============================================================================
// Configuration
// ============================================================================

const LISTS_DIR = path.join(process.cwd(), 'data', 'lists');

// ============================================================================
// POST /api/lists/import - Import JSON files to database
// ============================================================================

/**
 * Import existing JSON files from data/lists/ to the database.
 * This endpoint migrates saved lists from the old file-based storage
 * to the new database storage for the authenticated user.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const importAll = body.importAll !== false; // Default to true

    // Get existing lists in database for this user to avoid duplicates
    const existingLists = await getAllLists(session.user.id);
    const existingNames = new Set(existingLists.map(l => l.name));

    // Read JSON files from data/lists/
    let files: string[] = [];

    try {
      files = await fs.readdir(LISTS_DIR);
    } catch {
      // Directory doesn't exist or is empty
      return NextResponse.json({
        success: true,
        imported: 0,
        skipped: 0,
        message: 'No JSON files found to import',
      });
    }

    const jsonFiles = files.filter(f => f.endsWith('.json'));

    if (jsonFiles.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        skipped: 0,
        message: 'No JSON files found to import',
      });
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const filename of jsonFiles) {
      const filepath = path.join(LISTS_DIR, filename);

      try {
        const content = await fs.readFile(filepath, 'utf-8');
        const listData = JSON.parse(content) as Record<string, unknown>;

        // Extract name from the list data or filename
        const name = (listData.name as string) || filename.replace(/\.json$/, '').replace(/_/g, ' ');

        // Skip if list already exists (unless explicitly importing)
        if (existingNames.has(name) && importAll) {
          results.skipped++;
          continue;
        }

        // Extract army ID from the list data
        const armyId = (listData.army as string) || 'custodes';

        await importList(name, armyId, listData, session.user.id);
        results.imported++;
      } catch (error) {
        results.errors.push(`Failed to import ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      imported: results.imported,
      skipped: results.skipped,
      errors: results.errors.length > 0 ? results.errors : undefined,
      message: `Imported ${results.imported} list(s), skipped ${results.skipped}`,
    });
  } catch (error) {
    console.error('Error importing lists:', error);

    return NextResponse.json(
      { error: 'Failed to import lists' },
      { status: 500 }
    );
  }
}
