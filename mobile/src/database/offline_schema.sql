-- ============================================================================
-- Inspect360 Offline Database Schema
-- ============================================================================
-- This SQL script contains all tables, indexes, and constraints required
-- for offline inspection functionality. All tables use IF NOT EXISTS to
-- allow safe re-execution.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Inspections Table
-- ----------------------------------------------------------------------------
-- Stores inspection metadata and sync status
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inspections (
  id TEXT PRIMARY KEY,
  property_id TEXT,
  block_id TEXT,
  template_id TEXT NOT NULL,
  template_snapshot_json TEXT NOT NULL,
  assigned_to_id TEXT,
  owner_user_id TEXT,
  scheduled_date TEXT,
  status TEXT NOT NULL,
  type TEXT NOT NULL,
  notes TEXT,
  sync_status TEXT DEFAULT 'synced',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_synced_at TEXT
);

-- ----------------------------------------------------------------------------
-- Inspection Entries Table
-- ----------------------------------------------------------------------------
-- Stores individual field entries for each inspection
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Inspection Photos Table
-- ----------------------------------------------------------------------------
-- Stores photo metadata and upload status
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Sync Queue Table
-- ----------------------------------------------------------------------------
-- Stores pending operations to be synced with the server
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Migrations Table
-- ----------------------------------------------------------------------------
-- Tracks applied database migrations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

-- ============================================================================
-- Column Migrations (Add missing columns to existing tables)
-- ============================================================================
-- These ALTER TABLE statements ensure that existing tables have all required
-- columns before indexes are created. This handles cases where tables were
-- created before certain columns were added to the schema.

-- Add sync_status to inspections table if it doesn't exist
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'synced';

-- Add sync_status to inspection_entries table if it doesn't exist
ALTER TABLE inspection_entries ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'synced';

-- Add owner_user_id to inspections table if it doesn't exist (for user-scoped offline data)
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS owner_user_id TEXT;

-- ============================================================================
-- Indexes for Performance Optimization
-- ============================================================================

-- Index for fast lookup of entries by inspection
CREATE INDEX IF NOT EXISTS idx_inspection_entries_inspection_id 
  ON inspection_entries(inspection_id);

-- Index for filtering entries by sync status
CREATE INDEX IF NOT EXISTS idx_inspection_entries_sync_status 
  ON inspection_entries(sync_status);

-- Index for fast lookup of photos by entry
CREATE INDEX IF NOT EXISTS idx_inspection_photos_entry_id 
  ON inspection_photos(entry_id);

-- Index for filtering photos by upload status
CREATE INDEX IF NOT EXISTS idx_inspection_photos_upload_status 
  ON inspection_photos(upload_status);

-- Index for fast lookup of photos by inspection
CREATE INDEX IF NOT EXISTS idx_inspection_photos_inspection_id 
  ON inspection_photos(inspection_id);

-- Index for filtering inspections by sync status
CREATE INDEX IF NOT EXISTS idx_inspections_sync_status 
  ON inspections(sync_status);

-- Index for filtering inspections by status
CREATE INDEX IF NOT EXISTS idx_inspections_status 
  ON inspections(status);

-- Index for filtering inspections by owner (user-scoped queries)
CREATE INDEX IF NOT EXISTS idx_inspections_owner_user_id 
  ON inspections(owner_user_id);

-- Index for sync queue priority ordering (highest priority first, then oldest first)
CREATE INDEX IF NOT EXISTS idx_sync_queue_priority 
  ON sync_queue(priority DESC, created_at ASC);

-- Index for fast lookup of sync operations by entity
CREATE INDEX IF NOT EXISTS idx_sync_queue_entity 
  ON sync_queue(entity_type, entity_id);

-- Index for filtering sync queue by operation type
CREATE INDEX IF NOT EXISTS idx_sync_queue_operation_type 
  ON sync_queue(operation_type);

-- ============================================================================
-- End of Schema
-- ============================================================================

