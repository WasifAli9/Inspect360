// IndexedDB storage for offline file storage (API caching removed)

const DB_NAME = 'inspect360_offline';
const DB_VERSION = 2; // Incremented to remove API cache store

// Store names
const STORES = {
  FILES: 'files',
  UPLOAD_QUEUE: 'upload_queue',
} as const;

interface FileRecord {
  id: string;
  file: Blob;
  fileName: string;
  mimeType: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

// API cache removed - no longer caching API responses

interface UploadQueueItem {
  id: string;
  fileId: string; // Reference to file in files store
  endpoint: string;
  method: string;
  metadata?: Record<string, any>;
  timestamp: number;
  attempts: number;
  synced: boolean;
}

export class OfflineStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[OfflineStorage] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = async () => {
        this.db = request.result;
        console.log('[OfflineStorage] Database opened successfully');
        // Clear any legacy API cache on initialization
        if (this.db.objectStoreNames.contains('api_cache')) {
          try {
            const transaction = this.db.transaction(['api_cache'], 'readwrite');
            const store = transaction.objectStore('api_cache');
            await new Promise<void>((resolve, reject) => {
              const clearRequest = store.clear();
              clearRequest.onsuccess = () => {
                console.log('[OfflineStorage] Cleared legacy API cache on init');
                resolve();
              };
              clearRequest.onerror = () => reject(clearRequest.error);
            });
          } catch (err) {
            console.warn('[OfflineStorage] Failed to clear legacy API cache:', err);
          }
        }
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Files store
        if (!db.objectStoreNames.contains(STORES.FILES)) {
          const filesStore = db.createObjectStore(STORES.FILES, { keyPath: 'id' });
          filesStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Remove API cache store if it exists (legacy cleanup)
        if (db.objectStoreNames.contains('api_cache')) {
          db.deleteObjectStore('api_cache');
        }

        // Upload queue store
        if (!db.objectStoreNames.contains(STORES.UPLOAD_QUEUE)) {
          const uploadStore = db.createObjectStore(STORES.UPLOAD_QUEUE, { keyPath: 'id' });
          uploadStore.createIndex('synced', 'synced', { unique: false });
          uploadStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  private async ensureDb(): Promise<IDBDatabase> {
    await this.init();
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  // File storage methods
  async storeFile(file: File, metadata?: Record<string, any>): Promise<string> {
    const db = await this.ensureDb();
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const record: FileRecord = {
      id: fileId,
      file: file,
      fileName: file.name,
      mimeType: file.type,
      timestamp: Date.now(),
      metadata,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.FILES], 'readwrite');
      const store = transaction.objectStore(STORES.FILES);
      const request = store.add(record);

      request.onsuccess = () => {
        console.log('[OfflineStorage] File stored:', fileId);
        resolve(fileId);
      };

      request.onerror = () => {
        console.error('[OfflineStorage] Failed to store file:', request.error);
        reject(request.error);
      };
    });
  }

  async getFile(fileId: string): Promise<FileRecord | null> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.FILES], 'readonly');
      const store = transaction.objectStore(STORES.FILES);
      const request = store.get(fileId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async deleteFile(fileId: string): Promise<void> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.FILES], 'readwrite');
      const store = transaction.objectStore(STORES.FILES);
      const request = store.delete(fileId);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getFileAsBlob(fileId: string): Promise<Blob | null> {
    const record = await this.getFile(fileId);
    return record?.file || null;
  }

  async getFileAsFile(fileId: string): Promise<File | null> {
    const record = await this.getFile(fileId);
    if (!record) return null;

    return new File([record.file], record.fileName, { type: record.mimeType });
  }

  // API cache methods removed - no longer caching API responses

  // Upload queue methods
  async queueFileUpload(
    fileId: string,
    endpoint: string,
    method: string = 'POST',
    metadata?: Record<string, any>
  ): Promise<string> {
    const db = await this.ensureDb();
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const item: UploadQueueItem = {
      id: uploadId,
      fileId,
      endpoint,
      method,
      metadata,
      timestamp: Date.now(),
      attempts: 0,
      synced: false,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.UPLOAD_QUEUE], 'readwrite');
      const store = transaction.objectStore(STORES.UPLOAD_QUEUE);
      const request = store.add(item);

      request.onsuccess = () => {
        console.log('[OfflineStorage] File upload queued:', uploadId);
        resolve(uploadId);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getUploadQueue(): Promise<UploadQueueItem[]> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.UPLOAD_QUEUE], 'readonly');
      const store = transaction.objectStore(STORES.UPLOAD_QUEUE);
      const request = store.getAll();

      request.onsuccess = () => {
        const items = (request.result as UploadQueueItem[]).filter((item) => !item.synced);
        // Sort by timestamp (oldest first)
        items.sort((a, b) => a.timestamp - b.timestamp);
        resolve(items);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async markUploadAsSynced(uploadId: string): Promise<void> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.UPLOAD_QUEUE], 'readwrite');
      const store = transaction.objectStore(STORES.UPLOAD_QUEUE);
      const getRequest = store.get(uploadId);

      getRequest.onsuccess = () => {
        const item = getRequest.result as UploadQueueItem;
        if (item) {
          item.synced = true;
          const putRequest = store.put(item);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async incrementUploadAttempts(uploadId: string): Promise<void> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.UPLOAD_QUEUE], 'readwrite');
      const store = transaction.objectStore(STORES.UPLOAD_QUEUE);
      const getRequest = store.get(uploadId);

      getRequest.onsuccess = () => {
        const item = getRequest.result as UploadQueueItem;
        if (item) {
          item.attempts += 1;
          const putRequest = store.put(item);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deleteUploadQueueItem(uploadId: string): Promise<void> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.UPLOAD_QUEUE], 'readwrite');
      const store = transaction.objectStore(STORES.UPLOAD_QUEUE);
      const request = store.delete(uploadId);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Cleanup methods
  async clearAll(): Promise<void> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.FILES, STORES.UPLOAD_QUEUE],
        'readwrite'
      );

      let completed = 0;
      const total = 2;

      const checkComplete = () => {
        completed++;
        if (completed === total) {
          resolve();
        }
      };

      transaction.objectStore(STORES.FILES).clear().onsuccess = checkComplete;
      transaction.objectStore(STORES.UPLOAD_QUEUE).clear().onsuccess = checkComplete;

      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Clear any legacy API cache store if it exists
  async clearLegacyApiCache(): Promise<void> {
    const db = await this.ensureDb();
    
    // Check if the old API cache store still exists
    if (db.objectStoreNames.contains('api_cache')) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['api_cache'], 'readwrite');
        const store = transaction.objectStore('api_cache');
        const request = store.clear();
        
        request.onsuccess = () => {
          console.log('[OfflineStorage] Cleared legacy API cache');
          resolve();
        };
        
        request.onerror = () => {
          reject(request.error);
        };
      });
    }
  }

  async getStorageSize(): Promise<number> {
    if (!navigator.storage || !navigator.storage.estimate) {
      return 0;
    }

    const estimate = await navigator.storage.estimate();
    return estimate.usage || 0;
  }
}

// Singleton instance
export const offlineStorage = new OfflineStorage();

