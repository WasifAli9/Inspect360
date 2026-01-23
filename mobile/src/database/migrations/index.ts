/**
 * Database migration system
 * Handles schema updates for existing users
 */

import * as SQLite from 'expo-sqlite';
import { migration_001_initial_schema } from './001_initial_schema';
import { migration_002_add_owner_to_inspections } from './002_add_owner_to_inspections';

const CURRENT_VERSION = 2;

const migrations: Array<{ version: number; migrate: (db: SQLite.SQLiteDatabase) => Promise<void> }> = [
  { version: 1, migrate: migration_001_initial_schema },
  { version: 2, migrate: migration_002_add_owner_to_inspections },
];

export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  // Get current database version
  let currentVersion = 0;

  try {
    // Check if migrations table exists
    const tableInfo = await db.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'"
    );

    if (tableInfo) {
      const lastMigration = await db.getFirstAsync<{ version: number }>(
        'SELECT MAX(version) as version FROM migrations'
      );
      currentVersion = lastMigration?.version || 0;
      console.log(`[Migrations] Current database version: ${currentVersion}`);
    } else {
      console.log('[Migrations] Migrations table does not exist, will create it');
    }
  } catch (error) {
    console.log('[Migrations] Error checking migrations table (will create if needed):', error);
  }

  // Run pending migrations
  const pendingMigrations = migrations.filter(m => m.version > currentVersion);
  
  if (pendingMigrations.length === 0) {
    console.log('[Migrations] Database is up to date');
    return;
  }

  console.log(`[Migrations] Running ${pendingMigrations.length} migration(s)...`);

  for (const migration of pendingMigrations) {
    try {
      console.log(`[Migrations] Running migration ${migration.version}...`);
      await migration.migrate(db);
      
      // Record migration
      await db.runAsync(
        'INSERT INTO migrations (version, applied_at) VALUES (?, ?)',
        [migration.version, new Date().toISOString()]
      );
      
      console.log(`[Migrations] Migration ${migration.version} completed`);
    } catch (error) {
      console.error(`[Migrations] Failed to run migration ${migration.version}:`, error);
      throw error;
    }
  }

  console.log('[Migrations] All migrations completed');
}

