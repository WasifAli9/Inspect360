import * as SQLite from 'expo-sqlite';
import type { Inspection } from '../types';
import type { InspectionEntry } from './inspections';
import { runMigrations } from '../database/migrations';

export type SyncStatus = 'synced' | 'pending' | 'conflict';
export type UploadStatus = 'pending' | 'uploading' | 'uploaded' | 'failed';

export interface LocalInspection {
  id: string;
  owner_user_id?: string | null;
  property_id: string | null;
  block_id: string | null;
  template_id: string;
  template_snapshot_json: string;
  assigned_to_id: string | null;
  scheduled_date: string | null;
  status: string;
  type: string;
  notes: string | null;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
  last_synced_at: string | null;
}

export interface LocalInspectionEntry {
  id: string;
  inspection_id: string;
  section_ref: string;
  field_key: string;
  field_type: string;
  value_json: string | null;
  note: string | null;
  photos: string | null;
  videos: string | null;
  maintenance_flag: number;
  marked_for_review: number;
  sync_status: SyncStatus;
  local_id: string | null;
  server_id: string | null;
  created_at: string;
  updated_at: string;
  last_synced_at: string | null;
}

export interface LocalInspectionPhoto {
  id: string;
  entry_id: string;
  inspection_id: string;
  local_path: string;
  server_url: string | null;
  upload_status: UploadStatus;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
  uploaded_at: string | null;
}

export interface SyncOperation {
  id: string;
  operation_type: 'create_inspection' | 'update_entry' | 'upload_photo' | 'complete_inspection' | 'update_entry_status';
  entity_type: 'inspection' | 'entry' | 'photo';
  entity_id: string;
  payload: string;
  priority: number;
  retry_count: number;
  max_retries: number;
  error_message: string | null;
  created_at: string;
  last_attempt_at: string | null;
}

const DB_NAME = 'inspect360.db';

class LocalDatabase {
  private db: SQLite.SQLiteDatabase | null = null;
  private initialized = false;
  private initializing = false;
  private initializationPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.initialized && this.db) {
      return;
    }

    // If already initializing, wait for that promise
    if (this.initializing && this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializing = true;
    this.initializationPromise = (async () => {
      try {
        this.db = await SQLite.openDatabaseAsync(DB_NAME);
        await this.createTables();
        await runMigrations(this.db);
        this.initialized = true;
        console.log('[LocalDatabase] Database initialized successfully');
      } catch (error: any) {
        console.error('[LocalDatabase] Failed to initialize database:', error);
        // Don't throw - allow app to continue without local database
        // This prevents crashes if database initialization fails
        console.warn('[LocalDatabase] Continuing without local database - offline features will be limited');
        this.initialized = false;
        this.db = null;
        // Return instead of throwing to prevent app crash
        return;
      } finally {
        this.initializing = false;
        this.initializationPromise = null;
      }
    })();

    return this.initializationPromise;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized || !this.db) {
      await this.initialize();
    }
    // Don't throw if database is not available - just log a warning
    // This allows the app to continue functioning without offline features
    if (!this.db) {
      console.warn('[LocalDatabase] Database not available - offline features disabled');
      throw new Error('Database not available');
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS inspections (
        id TEXT PRIMARY KEY,
        owner_user_id TEXT,
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
        photos TEXT,
        videos TEXT,
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

      CREATE INDEX IF NOT EXISTS idx_inspection_entries_inspection_id ON inspection_entries(inspection_id);
      CREATE INDEX IF NOT EXISTS idx_inspection_entries_sync_status ON inspection_entries(sync_status);
      CREATE INDEX IF NOT EXISTS idx_inspection_photos_entry_id ON inspection_photos(entry_id);
      CREATE INDEX IF NOT EXISTS idx_inspection_photos_upload_status ON inspection_photos(upload_status);
      CREATE INDEX IF NOT EXISTS idx_inspection_photos_inspection_id ON inspection_photos(inspection_id);
      CREATE INDEX IF NOT EXISTS idx_inspections_sync_status ON inspections(sync_status);
      CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(status);
      -- Note: idx_inspections_owner_user_id is created by migration 002, not here
      -- This prevents errors when the column doesn't exist yet in existing databases
      CREATE INDEX IF NOT EXISTS idx_sync_queue_priority ON sync_queue(priority DESC, created_at ASC);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_operation_type ON sync_queue(operation_type);
    `);
  }

  // Inspections
  // Saves ALL inspection types to local database (check_in, check_out, routine, maintenance, 
  // esg_sustainability_inspection, fire_hazard_assessment, maintenance_inspection, damage, 
  // emergency, safety_compliance, compliance_regulatory, pre_purchase, specialized, etc.)
  async saveInspection(inspection: Inspection & { templateSnapshotJson?: any; property?: any; block?: any; clerk?: any; tenantApprovalStatus?: string; tenantApprovalDeadline?: string; tenantComments?: string }): Promise<void> {
    try {
      await this.ensureInitialized();
      if (!this.db) {
        console.warn('[LocalDatabase] Database not available, skipping saveInspection');
        return;
      }
      const templateSnapshotJson = JSON.stringify(inspection.templateSnapshotJson || {});

      // Store property, block, and clerk data as JSON in template_snapshot_json or create a separate JSON field
      // We'll store it in a metadata field within template_snapshot_json for now
      const metadata = {
        property: inspection.property || null,
        block: inspection.block || null,
        clerk: inspection.clerk || null,
        tenantApprovalStatus: inspection.tenantApprovalStatus || null,
        tenantApprovalDeadline: inspection.tenantApprovalDeadline || null,
        tenantComments: inspection.tenantComments || null,
      };

      // Merge metadata into template snapshot JSON
      const templateData = inspection.templateSnapshotJson || {};
      const enhancedTemplateJson = JSON.stringify({
        ...templateData,
        _metadata: metadata,
      });

      const now = new Date().toISOString();
      const ownerUserId = inspection.clerkId || inspection.inspectorId || (inspection as any)?.clerk?.id || null;
      const assignedToId = inspection.inspectorId || inspection.clerkId || (inspection as any)?.clerk?.id || null;

      await this.db!.runAsync(
        `INSERT INTO inspections (
          id, owner_user_id, property_id, block_id, template_id, template_snapshot_json,
          assigned_to_id, scheduled_date, status, type, notes,
          sync_status, created_at, updated_at, last_synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          owner_user_id = excluded.owner_user_id,
          property_id = excluded.property_id,
          block_id = excluded.block_id,
          template_id = excluded.template_id,
          template_snapshot_json = excluded.template_snapshot_json,
          assigned_to_id = excluded.assigned_to_id,
          scheduled_date = excluded.scheduled_date,
          status = excluded.status,
          type = excluded.type,
          notes = excluded.notes,
          sync_status = excluded.sync_status,
          updated_at = excluded.updated_at,
          last_synced_at = excluded.last_synced_at`,
        [
          inspection.id,
          ownerUserId,
          inspection.propertyId || null,
          inspection.blockId || null,
          inspection.templateId,
          enhancedTemplateJson,
          assignedToId,
          inspection.scheduledDate || null,
          inspection.status,
          inspection.type,
          inspection.notes || null,
          'synced',
          inspection.createdAt || now,
          inspection.updatedAt || now,
          now,
        ]
      );
    } catch (error: any) {
      console.error('[LocalDatabase] Error saving inspection:', error);
      // Don't throw - allow app to continue without offline storage
      console.warn('[LocalDatabase] Continuing without saving inspection locally');
    }
  }

  // Gets inspection from local database - works for ALL inspection types
  async getInspection(id: string, ownerUserId?: string): Promise<LocalInspection | null> {
    try {
      await this.ensureInitialized();
      if (!this.db) {
        console.warn('[LocalDatabase] Database not available, returning null');
        return null;
      }
      const result = ownerUserId
        ? await this.db!.getFirstAsync<LocalInspection>(
          'SELECT * FROM inspections WHERE id = ? AND owner_user_id = ?',
          [id, ownerUserId]
        )
        : await this.db!.getFirstAsync<LocalInspection>('SELECT * FROM inspections WHERE id = ?', [id]);
      return result || null;
    } catch (error) {
      console.error('[LocalDatabase] Error getting inspection:', error);
      return null;
    }
  }

  // Gets all inspections from local database - returns ALL inspection types (no type filtering)
  async getAllInspections(ownerUserId?: string): Promise<LocalInspection[]> {
    try {
      await this.ensureInitialized();
      if (!this.db) {
        console.warn('[LocalDatabase] Database not available, returning empty array');
        return [];
      }

      // No type filtering - returns all inspection types (check_in, check_out, routine, maintenance, etc.)
      if (ownerUserId) {
        return await this.db!.getAllAsync<LocalInspection>(
          'SELECT * FROM inspections WHERE owner_user_id = ? ORDER BY updated_at DESC',
          [ownerUserId]
        );
      }
      return await this.db!.getAllAsync<LocalInspection>('SELECT * FROM inspections ORDER BY updated_at DESC');
    } catch (error) {
      console.error('[LocalDatabase] Error getting all inspections:', error);
      return [];
    }
  }

  /**
   * Remove inspections that do not belong to the given user.
   * Useful on shared devices to prevent cross-account data leakage.
   */
  async purgeInspectionsNotOwned(ownerUserId: string): Promise<void> {
    await this.ensureInitialized();
    // Delete rows with different owner, or unscoped legacy rows (owner_user_id is NULL)
    await this.db!.runAsync(
      'DELETE FROM inspections WHERE owner_user_id IS NULL OR owner_user_id != ?',
      [ownerUserId]
    );
  }

  async updateInspectionStatus(id: string, status: string): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    await this.db!.runAsync(
      'UPDATE inspections SET status = ?, updated_at = ? WHERE id = ?',
      [status, new Date().toISOString(), id]
    );
  }

  async updateInspectionSyncStatus(id: string, syncStatus: SyncStatus, lastSyncedAt?: string): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    const now = new Date().toISOString();
    await this.db!.runAsync(
      'UPDATE inspections SET sync_status = ?, last_synced_at = ?, updated_at = ? WHERE id = ?',
      [syncStatus, lastSyncedAt || now, now, id]
    );
  }

  // Entries
  async saveEntry(entry: InspectionEntry & { id: string }): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    const now = new Date().toISOString();
    const entryId = entry.id;
    const localId = entry.id.startsWith('local_') ? entry.id : null;
    const serverId = entry.id.startsWith('local_') ? null : entry.id;

    await this.db!.runAsync(
      `INSERT INTO inspection_entries (
        id, inspection_id, section_ref, field_key, field_type,
        value_json, note, photos, videos, maintenance_flag, marked_for_review,
        sync_status, local_id, server_id, created_at, updated_at, last_synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        inspection_id = excluded.inspection_id,
        section_ref = excluded.section_ref,
        field_key = excluded.field_key,
        field_type = excluded.field_type,
        value_json = COALESCE(excluded.value_json, inspection_entries.value_json),
        note = COALESCE(excluded.note, inspection_entries.note),
        photos = COALESCE(excluded.photos, inspection_entries.photos),
        videos = COALESCE(excluded.videos, inspection_entries.videos),
        maintenance_flag = excluded.maintenance_flag,
        marked_for_review = excluded.marked_for_review,
        sync_status = excluded.sync_status,
        local_id = COALESCE(excluded.local_id, inspection_entries.local_id),
        server_id = COALESCE(excluded.server_id, inspection_entries.server_id),
        updated_at = excluded.updated_at,
        last_synced_at = COALESCE(excluded.last_synced_at, inspection_entries.last_synced_at)`,
      [
        entryId,
        entry.inspectionId,
        entry.sectionRef,
        entry.fieldKey,
        entry.fieldType,
        entry.valueJson ? JSON.stringify(entry.valueJson) : null,
        entry.note || null,
        entry.photos ? JSON.stringify(entry.photos) : null,
        (entry as any).videos ? JSON.stringify((entry as any).videos) : null,
        entry.maintenanceFlag ? 1 : 0,
        entry.markedForReview ? 1 : 0,
        serverId ? 'synced' : 'pending',
        localId,
        serverId,
        now,
        now,
        serverId ? now : null,
      ]
    );
  }

  async getEntries(inspectionId: string): Promise<LocalInspectionEntry[]> {
    if (!this.db) {
      await this.initialize();
    }

    return await this.db!.getAllAsync<LocalInspectionEntry>(
      'SELECT * FROM inspection_entries WHERE inspection_id = ? ORDER BY created_at ASC',
      [inspectionId]
    );
  }

  async getEntry(entryId: string): Promise<LocalInspectionEntry | null> {
    if (!this.db) {
      await this.initialize();
    }

    const result = await this.db!.getFirstAsync<LocalInspectionEntry>(
      'SELECT * FROM inspection_entries WHERE id = ? OR local_id = ? OR server_id = ?',
      [entryId, entryId, entryId]
    );

    return result || null;
  }

  async updateEntry(entryId: string, updates: Partial<InspectionEntry>): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    const updatesList: string[] = [];
    const values: any[] = [];

    if (updates.valueJson !== undefined) {
      updatesList.push('value_json = ?');
      values.push(updates.valueJson ? JSON.stringify(updates.valueJson) : null);
    }
    if (updates.note !== undefined) {
      updatesList.push('note = ?');
      values.push(updates.note || null);
    }
    if (updates.maintenanceFlag !== undefined) {
      updatesList.push('maintenance_flag = ?');
      values.push(updates.maintenanceFlag ? 1 : 0);
    }
    if (updates.markedForReview !== undefined) {
      updatesList.push('marked_for_review = ?');
      values.push(updates.markedForReview ? 1 : 0);
    }
    if (updates.photos !== undefined) {
      updatesList.push('photos = ?');
      values.push(updates.photos ? JSON.stringify(updates.photos) : null);
    }
    if ((updates as any).videos !== undefined) {
      updatesList.push('videos = ?');
      values.push((updates as any).videos ? JSON.stringify((updates as any).videos) : null);
    }

    updatesList.push('updated_at = ?');
    values.push(new Date().toISOString());

    values.push(entryId);

    await this.db!.runAsync(
      `UPDATE inspection_entries SET ${updatesList.join(', ')} WHERE id = ? OR local_id = ? OR server_id = ?`,
      [...values, entryId, entryId]
    );
  }

  async updateEntrySyncStatus(entryId: string, syncStatus: SyncStatus, serverId?: string): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    const now = new Date().toISOString();
    if (serverId && serverId !== entryId) {
      // Reconcile local ID with server ID

      // Check if a record with serverId already exists
      const existing = await this.db!.getFirstAsync<LocalInspectionEntry>(
        'SELECT id FROM inspection_entries WHERE id = ?',
        [serverId]
      );

      if (existing) {
        // Conflict! serverId already exists.
        // 1. Move all photos from entryId to serverId
        await this.db!.runAsync(
          'UPDATE inspection_photos SET entry_id = ? WHERE entry_id = ?',
          [serverId, entryId]
        );
        // 2. Delete the temporary local record (this won't kill photos because they now point to serverId)
        await this.db!.runAsync(
          'DELETE FROM inspection_entries WHERE id = ?',
          [entryId]
        );
        // 3. Update the existing record with the new status
        await this.db!.runAsync(
          'UPDATE inspection_entries SET server_id = ?, sync_status = ?, last_synced_at = ?, updated_at = ? WHERE id = ?',
          [serverId, syncStatus, now, now, serverId]
        );
        console.log(`[LocalDatabase] Reconciled duplicate entry ${entryId} by moving photos to existing server ID ${serverId}`);
      } else {
        // Normal case: update the entry's primary key
        await this.db!.runAsync(
          'UPDATE inspection_entries SET id = ?, server_id = ?, sync_status = ?, last_synced_at = ?, updated_at = ? WHERE id = ? OR local_id = ?',
          [serverId, serverId, syncStatus, now, now, entryId, entryId]
        );

        // 2. Update linked photos to use the new server ID
        await this.db!.runAsync(
          'UPDATE inspection_photos SET entry_id = ? WHERE entry_id = ?',
          [serverId, entryId]
        );
        console.log(`[LocalDatabase] Reconciled entry ${entryId} with server ID ${serverId} and updated linked photos`);
      }
    } else {
      // Just update status
      const targetId = serverId || entryId;
      await this.db!.runAsync(
        'UPDATE inspection_entries SET sync_status = ?, last_synced_at = ?, updated_at = ? WHERE id = ? OR local_id = ? OR server_id = ?',
        [syncStatus, now, now, targetId, targetId, targetId]
      );
    }
  }

  // Photos
  async savePhoto(photo: Omit<LocalInspectionPhoto, 'id' | 'created_at'> & { id?: string }): Promise<LocalInspectionPhoto> {
    if (!this.db) {
      await this.initialize();
    }

    const id = photo.id || `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await this.db!.runAsync(
      `INSERT INTO inspection_photos (
        id, entry_id, inspection_id, local_path, server_url,
        upload_status, file_size, mime_type, created_at, uploaded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        entry_id = excluded.entry_id,
        inspection_id = excluded.inspection_id,
        local_path = excluded.local_path,
        server_url = excluded.server_url,
        upload_status = excluded.upload_status,
        file_size = excluded.file_size,
        mime_type = excluded.mime_type,
        uploaded_at = excluded.uploaded_at`,
      [
        id,
        photo.entry_id,
        photo.inspection_id,
        photo.local_path,
        photo.server_url || null,
        photo.upload_status,
        photo.file_size || null,
        photo.mime_type || null,
        now,
        photo.uploaded_at || null,
      ]
    );

    const saved = await this.db!.getFirstAsync<LocalInspectionPhoto>(
      'SELECT * FROM inspection_photos WHERE id = ?',
      [id]
    );

    if (!saved) {
      throw new Error('Failed to save photo');
    }

    return saved;
  }

  async getPhotos(entryId: string): Promise<LocalInspectionPhoto[]> {
    if (!this.db) {
      await this.initialize();
    }

    return await this.db!.getAllAsync<LocalInspectionPhoto>(
      'SELECT * FROM inspection_photos WHERE entry_id = ? ORDER BY created_at ASC',
      [entryId]
    );
  }

  async getPhotosByInspection(inspectionId: string): Promise<LocalInspectionPhoto[]> {
    if (!this.db) {
      await this.initialize();
    }

    return await this.db!.getAllAsync<LocalInspectionPhoto>(
      'SELECT * FROM inspection_photos WHERE inspection_id = ? ORDER BY created_at ASC',
      [inspectionId]
    );
  }

  async updatePhotoUploadStatus(photoId: string, status: UploadStatus, serverUrl?: string): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    const now = new Date().toISOString();
    await this.db!.runAsync(
      'UPDATE inspection_photos SET upload_status = ?, server_url = ?, uploaded_at = ? WHERE id = ?',
      [status, serverUrl || null, status === 'uploaded' ? now : null, photoId]
    );
  }

  async deletePhoto(photoId: string): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    await this.db!.runAsync('DELETE FROM inspection_photos WHERE id = ?', [photoId]);
  }

  // Sync Queue
  async addToSyncQueue(operation: Omit<SyncOperation, 'id' | 'created_at' | 'last_attempt_at'> & { id?: string }): Promise<string> {
    try {
      await this.ensureInitialized();
      const id = operation.id || `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      // For update_entry, coalesce it if already in queue
      if (operation.operation_type === 'update_entry') {
        const existing = await this.db!.getFirstAsync<SyncOperation>(
          'SELECT id FROM sync_queue WHERE operation_type = ? AND entity_id = ?',
          [operation.operation_type, operation.entity_id]
        );
        if (existing) {
          await this.db!.runAsync(
            'UPDATE sync_queue SET payload = ? WHERE id = ?',
            [typeof operation.payload === 'string' ? operation.payload : JSON.stringify(operation.payload), existing.id]
          );
          return existing.id;
        }
      }

      await this.db!.runAsync(
        `INSERT INTO sync_queue (
          id, operation_type, entity_type, entity_id, payload,
          priority, retry_count, max_retries, error_message, created_at, last_attempt_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          operation.operation_type,
          operation.entity_type,
          operation.entity_id,
          typeof operation.payload === 'string' ? operation.payload : JSON.stringify(operation.payload),
          operation.priority || 0,
          operation.retry_count || 0,
          operation.max_retries || 3,
          operation.error_message || null,
          now,
          null,
        ]
      );

      return id;
    } catch (error) {
      console.error('[LocalDatabase] Error adding to sync queue:', error);
      throw error;
    }
  }

  async getSyncQueue(): Promise<SyncOperation[]> {
    try {
      await this.ensureInitialized();
      return await this.db!.getAllAsync<SyncOperation>(
        'SELECT * FROM sync_queue ORDER BY priority DESC, created_at ASC'
      );
    } catch (error) {
      console.error('[LocalDatabase] Error getting sync queue:', error);
      return [];
    }
  }

  async getSyncQueueByEntity(entityType: string, entityId: string): Promise<SyncOperation[]> {
    try {
      await this.ensureInitialized();
      return await this.db!.getAllAsync<SyncOperation>(
        'SELECT * FROM sync_queue WHERE entity_type = ? AND entity_id = ? ORDER BY priority DESC, created_at ASC',
        [entityType, entityId]
      );
    } catch (error) {
      console.error('[LocalDatabase] Error getting sync queue by entity:', error);
      return [];
    }
  }

  async removeFromSyncQueue(operationId: string): Promise<void> {
    try {
      await this.ensureInitialized();
      await this.db!.runAsync('DELETE FROM sync_queue WHERE id = ?', [operationId]);
    } catch (error) {
      console.error('[LocalDatabase] Error removing from sync queue:', error);
      // Don't throw - it's okay if we can't remove from queue
    }
  }

  async updateSyncQueueOperation(operationId: string, updates: Partial<SyncOperation>): Promise<void> {
    try {
      await this.ensureInitialized();
      const updatesList: string[] = [];
      const values: any[] = [];

      if (updates.retry_count !== undefined) {
        updatesList.push('retry_count = ?');
        values.push(updates.retry_count);
      }
      if (updates.error_message !== undefined) {
        updatesList.push('error_message = ?');
        values.push(updates.error_message || null);
      }
      if (updates.last_attempt_at !== undefined) {
        updatesList.push('last_attempt_at = ?');
        values.push(updates.last_attempt_at || null);
      }

      values.push(operationId);

      if (updatesList.length > 0) {
        await this.db!.runAsync(
          `UPDATE sync_queue SET ${updatesList.join(', ')} WHERE id = ?`,
          values
        );
      }
    } catch (error) {
      console.error('[LocalDatabase] Error updating sync queue operation:', error);
      // Don't throw - it's okay if we can't update the queue
    }
  }

  async clearSyncQueue(): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    await this.db!.runAsync('DELETE FROM sync_queue');
  }

  // Utility methods
  async deleteInspection(inspectionId: string): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    await this.db!.runAsync('DELETE FROM inspections WHERE id = ?', [inspectionId]);
  }

  async getPendingSyncCount(): Promise<number> {
    try {
      await this.ensureInitialized();
      const result = await this.db!.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM sync_queue'
      );
      return result?.count || 0;
    } catch (error) {
      console.error('[LocalDatabase] Error getting pending sync count:', error);
      return 0;
    }
  }

  async getPendingEntriesCount(inspectionId: string): Promise<number> {
    if (!this.db) {
      await this.initialize();
    }

    const result = await this.db!.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM inspection_entries WHERE inspection_id = ? AND sync_status = ?',
      [inspectionId, 'pending']
    );

    return result?.count || 0;
  }
}

export const localDatabase = new LocalDatabase();

