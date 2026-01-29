/**
 * Migration 003: Add photos and videos to inspection_entries table
 * Allows storing photo and video arrays locally to ensure they are available for sync.
 */

import * as SQLite from 'expo-sqlite';

export const migration_003_add_photos_to_entries = async (db: SQLite.SQLiteDatabase): Promise<void> => {
    console.log('[Migration 003] Starting: Add photos and videos to inspection_entries table');

    // Check inspection_entries columns
    try {
        const columns = await db.getAllAsync<{ name: string }>(
            "PRAGMA table_info(inspection_entries)"
        );

        // Add photos column if missing
        const hasPhotosColumn = columns.some(col => col.name === 'photos');
        if (hasPhotosColumn) {
            console.log('[Migration 003] Column photos already exists, skipping');
        } else {
            await db.execAsync(`ALTER TABLE inspection_entries ADD COLUMN photos TEXT;`);
            console.log('[Migration 003] Added photos column to inspection_entries table');
        }

        // Add videos column if missing
        const hasVideosColumn = columns.some(col => col.name === 'videos');
        if (hasVideosColumn) {
            console.log('[Migration 003] Column videos already exists, skipping');
        } else {
            await db.execAsync(`ALTER TABLE inspection_entries ADD COLUMN videos TEXT;`);
            console.log('[Migration 003] Added videos column to inspection_entries table');
        }
    } catch (e: any) {
        if (e?.message?.includes('duplicate column') || e?.message?.includes('already exists')) {
            console.log('[Migration 003] Columns already exist (from error message)');
        } else {
            console.error('[Migration 003] Error adding columns:', e);
            throw e;
        }
    }

    console.log('[Migration 003] Completed successfully');
};
