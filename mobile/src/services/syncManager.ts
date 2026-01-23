import * as Network from 'expo-network';
import { localDatabase, type SyncOperation, type LocalInspectionEntry, type LocalInspectionPhoto } from './localDatabase';
import { photoStorage } from './photoStorage';
import { inspectionsService, type InspectionEntry } from './inspections';
import { apiRequestJson, getAPI_URL } from './api';
import * as FileSystem from 'expo-file-system/legacy';

export interface SyncResult {
  success: number;
  failed: number;
  errors: Array<{ operationId: string; error: string }>;
}

export interface ConflictData {
  local: LocalInspectionEntry;
  server: InspectionEntry;
}

class SyncManager {
  private isSyncing = false;
  private syncListeners: Array<(progress: { current: number; total: number }) => void> = [];

  /**
   * Add a progress listener
   */
  addProgressListener(listener: (progress: { current: number; total: number }) => void): () => void {
    this.syncListeners.push(listener);
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== listener);
    };
  }

  private notifyProgress(current: number, total: number): void {
    this.syncListeners.forEach(listener => {
      try {
        listener({ current, total });
      } catch (error) {
        console.error('[SyncManager] Error in progress listener:', error);
      }
    });
  }

  /**
   * Check if device is online
   */
  async isOnline(): Promise<boolean> {
    try {
      const networkState = await Network.getNetworkStateAsync();
      return networkState.isConnected || false;
    } catch (error) {
      console.error('[SyncManager] Error checking network state:', error);
      return false;
    }
  }

  /**
   * Start syncing all pending operations
   */
  async startSync(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('[SyncManager] Sync already in progress');
      return { success: 0, failed: 0, errors: [] };
    }

    const online = await this.isOnline();
    if (!online) {
      console.log('[SyncManager] Device is offline, cannot sync');
      return { success: 0, failed: 0, errors: [] };
    }

    this.isSyncing = true;
    const result: SyncResult = { success: 0, failed: 0, errors: [] };

    try {
      const queue = await localDatabase.getSyncQueue();
      const total = queue.length;

      console.log(`[SyncManager] Starting sync of ${total} operations`);

      let abortSync = false;
      for (let i = 0; i < queue.length; i++) {
        if (abortSync) break;
        const operation = queue[i];
        this.notifyProgress(i, total);

        try {
          await this.syncOperation(operation);
          await localDatabase.removeFromSyncQueue(operation.id);
          result.success++;
        } catch (error: any) {
          console.error(`[SyncManager] Failed to sync operation ${operation.id}:`, error);

          const status = (error && typeof error === 'object') ? (error.status as number | undefined) : undefined;
          const message = (error?.message || '').toString();

          // Auth / permission errors: stop sync and keep operations in queue until user logs in again.
          if (status === 401 || status === 403 || message.toLowerCase().includes('unauthorized') || message.toLowerCase().includes('access denied')) {
            await localDatabase.updateSyncQueueOperation(operation.id, {
              error_message: message || 'Authentication required',
              last_attempt_at: new Date().toISOString(),
            });

            result.failed++;
            result.errors.push({
              operationId: operation.id,
              error: message || 'Authentication required. Please sign in again and retry sync.',
            });

            abortSync = true;
            continue;
          }
          
          // Special handling for completed or deleted inspection errors
          if (error.message?.includes('already been completed') || error.message?.includes('has been deleted')) {
            // Inspection was completed - remove all related operations from queue
            let inspectionId: string | null = null;
            
            // Try to get inspection ID from operation
            if (operation.entity_type === 'inspection') {
              inspectionId = operation.entity_id;
            } else {
              // For entry/photo operations, get inspection_id from payload or local DB
              try {
                const payload = JSON.parse(operation.payload);
                inspectionId = payload.inspection_id || payload.inspectionId;
              } catch {
                // If payload parsing fails, try to get from local entry/photo
                if (operation.entity_type === 'entry') {
                  const localEntry = await localDatabase.getEntry(operation.entity_id);
                  inspectionId = localEntry?.inspection_id || null;
                } else if (operation.entity_type === 'photo') {
                  try {
                    const payload = JSON.parse(operation.payload);
                    inspectionId = payload.inspection_id || null;
                  } catch {
                    // Can't get inspection ID, just remove this operation
                  }
                }
              }
            }
            
            if (inspectionId) {
              // Remove all operations for this inspection
              const entryOps = await localDatabase.getSyncQueueByEntity('entry', inspectionId);
              const photoOps = await localDatabase.getSyncQueueByEntity('photo', inspectionId);
              const inspectionOps = await localDatabase.getSyncQueueByEntity('inspection', inspectionId);
              
              for (const op of [...entryOps, ...photoOps, ...inspectionOps]) {
                await localDatabase.removeFromSyncQueue(op.id);
              }
            }
            
            // Remove this operation
            await localDatabase.removeFromSyncQueue(operation.id);
            result.failed++;
            result.errors.push({
              operationId: operation.id,
              error: error.message || 'Inspection already completed or deleted',
            });
            continue;
          }

          // Non-retryable request errors (validation / conflict / payload too large): mark entity and drop the operation.
          // - 409: server has newer version / conflict
          // - 400/422: invalid payload (usually schema mismatch)
          // - 413: payload too large (usually photo)
          if (status === 409 || status === 400 || status === 422 || status === 413) {
            try {
              if (operation.entity_type === 'entry') {
                await localDatabase.updateEntrySyncStatus(operation.entity_id, 'conflict');
              } else if (operation.entity_type === 'photo') {
                await localDatabase.updatePhotoUploadStatus(operation.entity_id, 'failed');
              }
            } catch (markError) {
              console.warn('[SyncManager] Failed to mark local entity after non-retryable error:', markError);
            }

            await localDatabase.removeFromSyncQueue(operation.id);
            result.failed++;
            result.errors.push({
              operationId: operation.id,
              error: message || `Non-retryable sync error (status ${status})`,
            });
            continue;
          }
          
          const retryCount = operation.retry_count + 1;
          if (retryCount >= operation.max_retries) {
            // Max retries reached, remove from queue
            await localDatabase.removeFromSyncQueue(operation.id);
            result.failed++;
            result.errors.push({
              operationId: operation.id,
              error: error.message || 'Unknown error',
            });
          } else {
            // Update retry count and error message
            await localDatabase.updateSyncQueueOperation(operation.id, {
              retry_count: retryCount,
              error_message: error.message || 'Unknown error',
              last_attempt_at: new Date().toISOString(),
            });
          }
        }
      }

      this.notifyProgress(total, total);
      console.log(`[SyncManager] Sync completed: ${result.success} success, ${result.failed} failed`);
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  /**
   * Sync a single operation
   */
  private async syncOperation(operation: SyncOperation): Promise<void> {
    switch (operation.operation_type) {
      case 'update_entry':
        await this.syncEntry(operation.entity_id, JSON.parse(operation.payload));
        break;
      case 'upload_photo':
        // Photo data is stored in payload
        const photoData = JSON.parse(operation.payload) as LocalInspectionPhoto;
        await this.syncPhotoWithData(photoData);
        break;
      case 'complete_inspection':
        await this.syncCompleteInspection(operation.entity_id, JSON.parse(operation.payload));
        break;
      case 'update_entry_status':
        await this.syncEntryStatus(operation.entity_id, JSON.parse(operation.payload));
        break;
      default:
        throw new Error(`Unknown operation type: ${operation.operation_type}`);
    }
  }

  /**
   * Sync an inspection entry
   */
  async syncEntry(entryId: string, entryData?: any): Promise<void> {
    const localEntry = await localDatabase.getEntry(entryId);
    if (!localEntry) {
      throw new Error(`Entry not found: ${entryId}`);
    }

    // Check if inspection exists and is not completed on server
    try {
      const serverInspection = await inspectionsService.getInspection(localEntry.inspection_id);
      
      if (serverInspection.status === 'completed') {
        // Inspection is already completed - cannot modify entries
        // Update local inspection status to match server
        await localDatabase.updateInspectionStatus(localEntry.inspection_id, 'completed');
        await localDatabase.updateInspectionSyncStatus(localEntry.inspection_id, 'synced');
        
        // Mark this entry as conflict (inspection completed before sync)
        await localDatabase.updateEntrySyncStatus(entryId, 'conflict');
        
        throw new Error(
          `Inspection has already been completed. Your changes to this field cannot be synced. ` +
          `The inspection was completed while you were offline.`
        );
      }
    } catch (error: any) {
      // Check if inspection was deleted (404 error)
      if (error.status === 404 || error.message?.includes('not found') || error.message?.includes('404')) {
        // Inspection was deleted - cannot sync entries
        await localDatabase.updateEntrySyncStatus(entryId, 'conflict');
        
        throw new Error(
          `Inspection has been deleted. Your changes to this field cannot be synced. ` +
          `The inspection was deleted while you were offline.`
        );
      }
      
      // If error is about completed inspection, re-throw it
      if (error.message?.includes('already been completed')) {
        throw error;
      }
      
      // If error is about deleted inspection, re-throw it
      if (error.message?.includes('has been deleted')) {
        throw error;
      }
      
      // For other errors (network, etc.), continue with sync attempt
      console.warn('[SyncManager] Could not check inspection status, proceeding with sync:', error.message);
    }

    // If entry has a server_id, update it; otherwise create new
    if (localEntry.server_id) {
      // Update existing entry
      const updateData: Partial<InspectionEntry> = {
        valueJson: localEntry.value_json ? JSON.parse(localEntry.value_json) : undefined,
        note: localEntry.note || undefined,
        maintenanceFlag: localEntry.maintenance_flag === 1,
        markedForReview: localEntry.marked_for_review === 1,
      };

      const updated = await inspectionsService.updateInspectionEntry(localEntry.server_id, updateData);
      
      await localDatabase.updateEntrySyncStatus(entryId, 'synced', updated.id);
    } else {
      // Create new entry
      const entry: InspectionEntry = {
        id: entryId,
        inspectionId: localEntry.inspection_id,
        sectionRef: localEntry.section_ref,
        fieldKey: localEntry.field_key,
        fieldType: localEntry.field_type,
        valueJson: localEntry.value_json ? JSON.parse(localEntry.value_json) : undefined,
        note: localEntry.note || undefined,
        maintenanceFlag: localEntry.maintenance_flag === 1,
        markedForReview: localEntry.marked_for_review === 1,
        ...entryData,
      };

      const created = await inspectionsService.saveInspectionEntry(entry);
      
      // Update local entry with server ID
      await localDatabase.updateEntrySyncStatus(entryId, 'synced', created.id || entryId);
    }
  }

  /**
   * Sync a photo (photoId is the actual photo ID from database)
   */
  async syncPhoto(photoId: string): Promise<void> {
    // Try to find photo by ID from all inspections
    // We need to search across all inspections since we don't have inspectionId in the queue
    // For better performance, we could store inspectionId in the sync queue payload
    
    // Get all pending photos and find by ID
    // Since we can't easily query by photo ID across all inspections,
    // we'll need to get it from the payload or search through entries
    
    // For now, throw an error indicating we need photo data from payload
    // The syncPhotoWithData method should be called directly with photo data
    throw new Error('syncPhoto requires photo data. Use syncPhotoWithData instead.');
  }

  /**
   * Sync photo with full photo data
   */
  async syncPhotoWithData(photo: LocalInspectionPhoto): Promise<void> {
    if (photo.upload_status === 'uploaded') {
      return; // Already uploaded
    }

    // Check if inspection exists and is not completed on server
    try {
      const serverInspection = await inspectionsService.getInspection(photo.inspection_id);
      
      if (serverInspection.status === 'completed') {
        // Inspection is already completed - cannot upload photos
        await localDatabase.updateInspectionStatus(photo.inspection_id, 'completed');
        await localDatabase.updateInspectionSyncStatus(photo.inspection_id, 'synced');
        await localDatabase.updatePhotoUploadStatus(photo.id, 'failed');
        
        throw new Error(
          `Inspection has already been completed. This photo cannot be uploaded. ` +
          `The inspection was completed while you were offline.`
        );
      }
    } catch (error: any) {
      // Check if inspection was deleted (404 error)
      if (error.status === 404 || error.message?.includes('not found') || error.message?.includes('404')) {
        // Inspection was deleted - cannot upload photos
        await localDatabase.updatePhotoUploadStatus(photo.id, 'failed');
        
        throw new Error(
          `Inspection has been deleted. This photo cannot be uploaded. ` +
          `The inspection was deleted while you were offline.`
        );
      }
      
      // If error is about completed inspection, re-throw it
      if (error.message?.includes('already been completed')) {
        throw error;
      }
      
      // If error is about deleted inspection, re-throw it
      if (error.message?.includes('has been deleted')) {
        throw error;
      }
      
      // For other errors, continue with upload attempt
      console.warn('[SyncManager] Could not check inspection status, proceeding with photo upload:', error.message);
    }

    // Update status to uploading
    await localDatabase.updatePhotoUploadStatus(photo.id, 'uploading');

    try {
      // Read photo file
      const fileInfo = await FileSystem.getInfoAsync(photo.local_path);
      if (!fileInfo.exists) {
        throw new Error(`Photo file not found: ${photo.local_path}`);
      }

      // Upload photo using the same method as FieldWidget
      const extension = photo.local_path.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType = photo.mime_type || photoStorage.getMimeType(photo.local_path);

      const formData = new FormData();
      formData.append('file', {
        uri: photo.local_path,
        type: mimeType,
        name: `photo.${extension}`,
      } as any);

      // Construct full URL (getAPI_URL() always returns a full URL)
      const uploadUrl = `${getAPI_URL()}/api/objects/upload-direct`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      try {
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
          },
          body: formData,
          credentials: 'include',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = 'Failed to upload photo';
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch {
            errorMessage = errorText || `Server error: ${response.status} ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        const serverUrl = data.url || data.uploadURL || data.path || data.objectUrl || `/objects/${data.objectId}`;

        // Update photo with server URL
        await localDatabase.updatePhotoUploadStatus(photo.id, 'uploaded', serverUrl);

        // Update entry photos array if needed
        const entry = await localDatabase.getEntry(photo.entry_id);
        if (entry && entry.value_json) {
          try {
            const valueJson = JSON.parse(entry.value_json);
            if (Array.isArray(valueJson.photos)) {
              // Replace local path with server URL
              const photos = valueJson.photos.map((p: string) => 
                p === photo.local_path ? serverUrl : p
              );
              valueJson.photos = photos;
              await localDatabase.updateEntry(entry.id, { valueJson });
            }
          } catch (e) {
            console.error('[SyncManager] Error updating entry photos:', e);
          }
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          throw new Error('Upload timeout. Please check your internet connection.');
        }
        throw fetchError;
      }
    } catch (error: any) {
      await localDatabase.updatePhotoUploadStatus(photo.id, 'failed');
      throw error;
    }
  }

  /**
   * Sync inspection completion
   */
  async syncCompleteInspection(inspectionId: string, statusData: { status: string; completedDate?: string; submittedAt?: string }): Promise<void> {
    try {
      await inspectionsService.updateInspectionStatus(
        inspectionId,
        statusData.status,
        statusData.completedDate || statusData.submittedAt
      );
      
      await localDatabase.updateInspectionSyncStatus(inspectionId, 'synced');
    } catch (error: any) {
      // Check if inspection was deleted (404 error)
      if (error.status === 404 || error.message?.includes('not found') || error.message?.includes('404')) {
        // Mark as deleted locally
        await localDatabase.updateInspectionStatus(inspectionId, 'deleted');
        await localDatabase.updateInspectionSyncStatus(inspectionId, 'synced');
        
        throw new Error(
          `Inspection has been deleted. Cannot complete a deleted inspection. ` +
          `The inspection was deleted while you were offline.`
        );
      }
      throw error;
    }
  }

  /**
   * Sync entry status update
   */
  async syncEntryStatus(entryId: string, statusData: any): Promise<void> {
    // This can be used for status updates if needed
    await this.syncEntry(entryId, statusData);
  }

  /**
   * Queue an operation for sync
   */
  async queueOperation(
    operationType: SyncOperation['operation_type'],
    entityType: SyncOperation['entity_type'],
    entityId: string,
    payload: any,
    priority: number = 0
  ): Promise<string> {
    return await localDatabase.addToSyncQueue({
      operation_type: operationType,
      entity_type: entityType,
      entity_id: entityId,
      payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
      priority,
      retry_count: 0,
      max_retries: 3,
      error_message: null,
    });
  }

  /**
   * Handle conflict between local and server data
   */
  async detectConflict(entryId: string): Promise<ConflictData | null> {
    const localEntry = await localDatabase.getEntry(entryId);
    if (!localEntry || !localEntry.server_id) {
      return null; // No conflict if entry doesn't exist or hasn't been synced
    }

    try {
      const serverEntries = await inspectionsService.getInspectionEntries(localEntry.inspection_id);
      const serverEntry = serverEntries.find(e => e.id === localEntry.server_id);

      if (!serverEntry) {
        return null; // Server entry not found, not a conflict
      }

      // Check if both were modified after last sync
      const localUpdated = new Date(localEntry.updated_at).getTime();
      const lastSynced = localEntry.last_synced_at ? new Date(localEntry.last_synced_at).getTime() : 0;
      const serverUpdated = new Date(serverEntry.id || '0').getTime(); // Server doesn't return updatedAt, use ID timestamp as proxy

      if (localUpdated > lastSynced) {
        // Local was modified, check server
        // Since we don't have server updated_at, we'll always consider it a potential conflict
        // In production, server should return updated_at
        return {
          local: localEntry,
          server: serverEntry,
        };
      }

      return null;
    } catch (error) {
      console.error('[SyncManager] Error detecting conflict:', error);
      return null;
    }
  }

  /**
   * Resolve conflict by keeping local version
   */
  async resolveConflictKeepLocal(entryId: string): Promise<void> {
    await this.syncEntry(entryId);
  }

  /**
   * Resolve conflict by keeping server version
   */
  async resolveConflictKeepServer(entryId: string): Promise<void> {
    const localEntry = await localDatabase.getEntry(entryId);
    if (!localEntry || !localEntry.server_id) {
      return;
    }

    try {
      const serverEntries = await inspectionsService.getInspectionEntries(localEntry.inspection_id);
      const serverEntry = serverEntries.find(e => e.id === localEntry.server_id);

      if (serverEntry) {
        // Update local entry with server data
        await localDatabase.saveEntry({
          id: serverEntry.id || localEntry.id,
          inspectionId: serverEntry.inspectionId,
          sectionRef: serverEntry.sectionRef,
          fieldKey: serverEntry.fieldKey,
          fieldType: serverEntry.fieldType,
          valueJson: serverEntry.valueJson,
          note: serverEntry.note,
          maintenanceFlag: serverEntry.maintenanceFlag,
          markedForReview: serverEntry.markedForReview,
        });

        await localDatabase.updateEntrySyncStatus(entryId, 'synced', serverEntry.id);
      }
    } catch (error) {
      console.error('[SyncManager] Error resolving conflict (keep server):', error);
      throw error;
    }
  }

  /**
   * Get pending sync count
   */
  async getPendingCount(): Promise<number> {
    return await localDatabase.getPendingSyncCount();
  }

  /**
   * Extract inspection ID from sync operation
   */
  private getInspectionIdFromOperation(operation: SyncOperation): string | null {
    try {
      const payload = JSON.parse(operation.payload);
      if (payload.inspection_id || payload.inspectionId) {
        return payload.inspection_id || payload.inspectionId;
      }
      // For entry operations, get inspection_id from local entry
      if (operation.entity_type === 'entry') {
        // We'll need to look it up from local DB
        return null; // Will be handled in syncEntry
      }
      // For photo operations, payload should have inspection_id
      if (operation.entity_type === 'photo' && payload.inspection_id) {
        return payload.inspection_id;
      }
      // For inspection operations, entity_id is the inspection ID
      if (operation.entity_type === 'inspection') {
        return operation.entity_id;
      }
    } catch (error) {
      console.error('[SyncManager] Error extracting inspection ID:', error);
    }
    return null;
  }

  /**
   * Sync specific inspection
   */
  async syncInspection(inspectionId: string): Promise<void> {
    const queue = await localDatabase.getSyncQueueByEntity('inspection', inspectionId);
    const entryQueue = await localDatabase.getSyncQueueByEntity('entry', inspectionId);
    const photoQueue = await localDatabase.getSyncQueueByEntity('photo', inspectionId);

    // Get all entries for this inspection
    const entries = await localDatabase.getEntries(inspectionId);
    const pendingEntries = entries.filter(e => e.sync_status === 'pending');

    // Sync all pending entries
    for (const entry of pendingEntries) {
      try {
        await this.syncEntry(entry.id);
      } catch (error) {
        console.error(`[SyncManager] Failed to sync entry ${entry.id}:`, error);
        // Queue for retry
        await this.queueOperation('update_entry', 'entry', entry.id, entry, 0);
      }
    }

    // Get all pending photos for this inspection
    const photos = await localDatabase.getPhotosByInspection(inspectionId);
    const pendingPhotos = photos.filter(p => p.upload_status === 'pending' || p.upload_status === 'failed');

      // Sync photos (max 3 concurrent)
      const concurrentLimit = 3;
      for (let i = 0; i < pendingPhotos.length; i += concurrentLimit) {
        const batch = pendingPhotos.slice(i, i + concurrentLimit);
        await Promise.all(batch.map(photo => this.syncPhotoWithData(photo).catch(error => {
          console.error(`[SyncManager] Failed to sync photo ${photo.id}:`, error);
          // Re-queue photo for retry if it failed
          syncManager.queueOperation('upload_photo', 'photo', photo.id, photo, 0);
        })));
      }

    // Process sync queue operations
    const allOperations = [...queue, ...entryQueue, ...photoQueue];
    for (const operation of allOperations) {
      try {
        await this.syncOperation(operation);
        await localDatabase.removeFromSyncQueue(operation.id);
      } catch (error) {
        console.error(`[SyncManager] Failed to sync operation ${operation.id}:`, error);
      }
    }
  }
}

export const syncManager = new SyncManager();

