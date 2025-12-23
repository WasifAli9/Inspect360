// Inspections cache service for offline functionality
// Stores all inspections and their entries in IndexedDB for offline access

const DB_NAME = 'inspect360_inspections';
const DB_VERSION = 1;

const STORES = {
  INSPECTIONS: 'inspections',
  INSPECTION_ENTRIES: 'inspection_entries',
  INSPECTION_PHOTOS: 'inspection_photos',
} as const;

interface CachedInspection {
  id: string;
  data: any;
  cachedAt: number;
  lastSynced?: number;
}

interface CachedInspectionEntry {
  id: string;
  inspectionId: string;
  data: any;
  cachedAt: number;
  lastSynced?: number;
}

interface CachedPhoto {
  id: string;
  entryId: string;
  inspectionId: string;
  url: string;
  blob: Blob;
  cachedAt: number;
}

export class InspectionsCache {
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
        console.error('[InspectionsCache] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[InspectionsCache] Database opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Inspections store
        if (!db.objectStoreNames.contains(STORES.INSPECTIONS)) {
          const inspectionsStore = db.createObjectStore(STORES.INSPECTIONS, { keyPath: 'id' });
          inspectionsStore.createIndex('cachedAt', 'cachedAt', { unique: false });
          inspectionsStore.createIndex('lastSynced', 'lastSynced', { unique: false });
        }

        // Inspection entries store
        if (!db.objectStoreNames.contains(STORES.INSPECTION_ENTRIES)) {
          const entriesStore = db.createObjectStore(STORES.INSPECTION_ENTRIES, { keyPath: 'id' });
          entriesStore.createIndex('inspectionId', 'inspectionId', { unique: false });
          entriesStore.createIndex('cachedAt', 'cachedAt', { unique: false });
        }

        // Photos store
        if (!db.objectStoreNames.contains(STORES.INSPECTION_PHOTOS)) {
          const photosStore = db.createObjectStore(STORES.INSPECTION_PHOTOS, { keyPath: 'id' });
          photosStore.createIndex('entryId', 'entryId', { unique: false });
          photosStore.createIndex('inspectionId', 'inspectionId', { unique: false });
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

  // Cache all inspections
  async cacheInspections(inspections: any[]): Promise<void> {
    const db = await this.ensureDb();
    const transaction = db.transaction([STORES.INSPECTIONS], 'readwrite');
    const store = transaction.objectStore(STORES.INSPECTIONS);

    const promises = inspections.map((inspection) => {
      const cached: CachedInspection = {
        id: inspection.id,
        data: inspection,
        cachedAt: Date.now(),
        lastSynced: Date.now(),
      };
      return new Promise<void>((resolve, reject) => {
        const request = store.put(cached);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
    console.log(`[InspectionsCache] Cached ${inspections.length} inspections`);
  }

  // Get all cached inspections
  async getCachedInspections(): Promise<any[]> {
    const db = await this.ensureDb();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.INSPECTIONS], 'readonly');
      const store = transaction.objectStore(STORES.INSPECTIONS);
      const request = store.getAll();

      request.onsuccess = () => {
        const cached = request.result as CachedInspection[];
        const inspections = cached.map((item) => item.data);
        console.log(`[InspectionsCache] Retrieved ${inspections.length} cached inspections`);
        resolve(inspections);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Cache a single inspection
  async cacheInspection(inspection: any): Promise<void> {
    const db = await this.ensureDb();
    
    const cached: CachedInspection = {
      id: inspection.id,
      data: inspection,
      cachedAt: Date.now(),
      lastSynced: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.INSPECTIONS], 'readwrite');
      const store = transaction.objectStore(STORES.INSPECTIONS);
      const request = store.put(cached);

      request.onsuccess = () => {
        console.log(`[InspectionsCache] Cached inspection ${inspection.id}`);
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Get a single cached inspection
  async getCachedInspection(inspectionId: string): Promise<any | null> {
    const db = await this.ensureDb();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.INSPECTIONS], 'readonly');
      const store = transaction.objectStore(STORES.INSPECTIONS);
      const request = store.get(inspectionId);

      request.onsuccess = () => {
        const cached = request.result as CachedInspection | undefined;
        resolve(cached?.data || null);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Cache inspection entries
  async cacheInspectionEntries(inspectionId: string, entries: any[]): Promise<void> {
    const db = await this.ensureDb();
    const transaction = db.transaction([STORES.INSPECTION_ENTRIES], 'readwrite');
    const store = transaction.objectStore(STORES.INSPECTION_ENTRIES);

    // First, delete old entries for this inspection
    const index = store.index('inspectionId');
    const deleteRequest = index.openCursor(IDBKeyRange.only(inspectionId));
    
    await new Promise<void>((resolve, reject) => {
      deleteRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      deleteRequest.onerror = () => reject(deleteRequest.error);
    });

    // Then add new entries
    const promises = entries.map((entry) => {
      const cached: CachedInspectionEntry = {
        id: entry.id,
        inspectionId: inspectionId,
        data: entry,
        cachedAt: Date.now(),
        lastSynced: Date.now(),
      };
      return new Promise<void>((resolve, reject) => {
        const request = store.put(cached);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
    console.log(`[InspectionsCache] Cached ${entries.length} entries for inspection ${inspectionId}`);
  }

  // Get cached inspection entries
  async getCachedInspectionEntries(inspectionId: string): Promise<any[]> {
    const db = await this.ensureDb();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.INSPECTION_ENTRIES], 'readonly');
      const store = transaction.objectStore(STORES.INSPECTION_ENTRIES);
      const index = store.index('inspectionId');
      const request = index.getAll(inspectionId);

      request.onsuccess = () => {
        const cached = request.result as CachedInspectionEntry[];
        const entries = cached.map((item) => item.data);
        console.log(`[InspectionsCache] Retrieved ${entries.length} cached entries for inspection ${inspectionId}`);
        resolve(entries);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Cache a photo for an inspection entry
  async cachePhoto(entryId: string, inspectionId: string, photoUrl: string, blob: Blob): Promise<string> {
    const db = await this.ensureDb();
    const photoId = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const cached: CachedPhoto = {
      id: photoId,
      entryId,
      inspectionId,
      url: photoUrl,
      blob,
      cachedAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.INSPECTION_PHOTOS], 'readwrite');
      const store = transaction.objectStore(STORES.INSPECTION_PHOTOS);
      const request = store.put(cached);

      request.onsuccess = () => {
        console.log(`[InspectionsCache] Cached photo ${photoId} for entry ${entryId}`);
        resolve(photoId);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Get cached photo as blob URL
  async getCachedPhoto(photoId: string): Promise<string | null> {
    const db = await this.ensureDb();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.INSPECTION_PHOTOS], 'readonly');
      const store = transaction.objectStore(STORES.INSPECTION_PHOTOS);
      const request = store.get(photoId);

      request.onsuccess = () => {
        const cached = request.result as CachedPhoto | undefined;
        if (cached) {
          const blobUrl = URL.createObjectURL(cached.blob);
          resolve(blobUrl);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Get all cached photos for an inspection entry
  async getCachedPhotosForEntry(entryId: string): Promise<string[]> {
    const db = await this.ensureDb();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.INSPECTION_PHOTOS], 'readonly');
      const store = transaction.objectStore(STORES.INSPECTION_PHOTOS);
      const index = store.index('entryId');
      const request = index.getAll(entryId);

      request.onsuccess = () => {
        const cached = request.result as CachedPhoto[];
        const blobUrls = cached.map((photo) => URL.createObjectURL(photo.blob));
        resolve(blobUrls);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Update cached inspection (for offline edits)
  async updateCachedInspection(inspectionId: string, updates: Partial<any>): Promise<void> {
    const existing = await this.getCachedInspection(inspectionId);
    if (!existing) {
      throw new Error(`Inspection ${inspectionId} not found in cache`);
    }

    const updated = { ...existing, ...updates };
    await this.cacheInspection(updated);
  }

  // Update cached entry (for offline edits)
  async updateCachedEntry(entryId: string, inspectionId: string, updates: Partial<any>): Promise<void> {
    const db = await this.ensureDb();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.INSPECTION_ENTRIES], 'readwrite');
      const store = transaction.objectStore(STORES.INSPECTION_ENTRIES);
      const getRequest = store.get(entryId);

      getRequest.onsuccess = () => {
        const cached = getRequest.result as CachedInspectionEntry | undefined;
        if (cached) {
          cached.data = { ...cached.data, ...updates };
          cached.cachedAt = Date.now();
          const putRequest = store.put(cached);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          // Create new entry if it doesn't exist
          const newCached: CachedInspectionEntry = {
            id: entryId,
            inspectionId,
            data: updates as any,
            cachedAt: Date.now(),
          };
          const addRequest = store.put(newCached);
          addRequest.onsuccess = () => resolve();
          addRequest.onerror = () => reject(addRequest.error);
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Clear all cached inspections
  async clearAll(): Promise<void> {
    const db = await this.ensureDb();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.INSPECTIONS, STORES.INSPECTION_ENTRIES, STORES.INSPECTION_PHOTOS],
        'readwrite'
      );

      let completed = 0;
      const total = 3;

      const checkComplete = () => {
        completed++;
        if (completed === total) {
          resolve();
        }
      };

      transaction.objectStore(STORES.INSPECTIONS).clear().onsuccess = checkComplete;
      transaction.objectStore(STORES.INSPECTION_ENTRIES).clear().onsuccess = checkComplete;
      transaction.objectStore(STORES.INSPECTION_PHOTOS).clear().onsuccess = checkComplete;

      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// Singleton instance
export const inspectionsCache = new InspectionsCache();

