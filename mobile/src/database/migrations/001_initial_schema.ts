/**
 * Initial database schema migration
 * This migration creates all the tables needed for offline inspection functionality
 */

import * as SQLite from 'expo-sqlite';

export const migration_001_initial_schema = async (db: SQLite.SQLiteDatabase): Promise<void> => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS inspections (
      id TEXT PRIMARY KEY,
      property_id TEXT,
      block_id TEXT,
      template_id TEXT NOT NULL,
      template_snapshot_json TEXT NOT NULL,
      assigned_to_id TEXT,
      scheduled_date TEXT,
      status TEXT NOT NULL,
      type TEXT NOT NULL,
      notes TEXT,
      sync_status TEXT DEFAULT 'synced',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS inspection_entries (
      id TEXT PRIMARY KEY,
      inspection_id TEXT NOT NULL,
      section_ref TEXT NOT NULL,
      field_key TEXT NOT NULL,
      field_type TEXT NOT NULL,
      value_json TEXT,
      note TEXT,
      maintenance_flag INTEGER DEFAULT 0,
      marked_for_review INTEGER DEFAULT 0,
      sync_status TEXT DEFAULT 'synced',
      local_id TEXT,
      server_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_synced_at TEXT,
      FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS inspection_photos (
      id TEXT PRIMARY KEY,
      entry_id TEXT NOT NULL,
      inspection_id TEXT NOT NULL,
      local_path TEXT NOT NULL,
      server_url TEXT,
      upload_status TEXT DEFAULT 'pending',
      file_size INTEGER,
      mime_type TEXT,
      created_at TEXT NOT NULL,
      uploaded_at TEXT,
      FOREIGN KEY (entry_id) REFERENCES inspection_entries(id) ON DELETE CASCADE,
      FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      operation_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      priority INTEGER DEFAULT 0,
      retry_count INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 3,
      error_message TEXT,
      created_at TEXT NOT NULL,
      last_attempt_at TEXT
    );

    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_inspection_entries_inspection_id ON inspection_entries(inspection_id);
    CREATE INDEX IF NOT EXISTS idx_inspection_entries_sync_status ON inspection_entries(sync_status);
    CREATE INDEX IF NOT EXISTS idx_inspection_photos_entry_id ON inspection_photos(entry_id);
    CREATE INDEX IF NOT EXISTS idx_inspection_photos_upload_status ON inspection_photos(upload_status);
    CREATE INDEX IF NOT EXISTS idx_inspection_photos_inspection_id ON inspection_photos(inspection_id);
    CREATE INDEX IF NOT EXISTS idx_inspections_sync_status ON inspections(sync_status);
    CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(status);
    CREATE INDEX IF NOT EXISTS idx_sync_queue_priority ON sync_queue(priority DESC, created_at ASC);
    CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_sync_queue_operation_type ON sync_queue(operation_type);
  `);
};

