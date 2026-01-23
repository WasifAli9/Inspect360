/**
 * Migration 002: Add owner_user_id to inspections table
 * Ensures offline data is scoped per logged-in user on shared devices.
 */

import * as SQLite from 'expo-sqlite';

export const migration_002_add_owner_to_inspections = async (db: SQLite.SQLiteDatabase): Promise<void> => {
  console.log('[Migration 002] Starting: Add owner_user_id to inspections table');
  
  // Check if column already exists
  try {
    const columns = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info(inspections)"
    );
    const hasOwnerColumn = columns.some(col => col.name === 'owner_user_id');
    
    if (hasOwnerColumn) {
      console.log('[Migration 002] Column owner_user_id already exists, skipping ALTER TABLE');
    } else {
      // Add column (SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN)
      await db.execAsync(`ALTER TABLE inspections ADD COLUMN owner_user_id TEXT;`);
      console.log('[Migration 002] Added owner_user_id column to inspections table');
    }
  } catch (e: any) {
    // Check if error is about column already existing
    if (e?.message?.includes('duplicate column') || e?.message?.includes('already exists')) {
      console.log('[Migration 002] Column owner_user_id already exists (from error message)');
    } else {
      console.error('[Migration 002] Error adding owner_user_id column:', e);
      throw e; // Re-throw if it's a different error
    }
  }

  // Best-effort backfill from assigned_to_id for existing rows
  try {
    const result = await db.execAsync(`
      UPDATE inspections
      SET owner_user_id = assigned_to_id
      WHERE owner_user_id IS NULL AND assigned_to_id IS NOT NULL;
    `);
    console.log('[Migration 002] Backfilled owner_user_id from assigned_to_id for existing rows');
  } catch (e) {
    // Ignore - older rows without assigned_to_id will remain unscoped and will be hidden
    console.warn('[Migration 002] Could not backfill owner_user_id (this is okay):', e);
  }

  // Index for fast filtering
  try {
    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_inspections_owner_user_id ON inspections(owner_user_id);`);
    console.log('[Migration 002] Created index on owner_user_id');
  } catch (e) {
    console.error('[Migration 002] Error creating index:', e);
    throw e; // Index creation failure should be reported
  }
  
  console.log('[Migration 002] Completed successfully');
};


