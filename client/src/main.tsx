import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { offlineQueue } from "./lib/offlineQueue";
import { apiRequest } from "./lib/queryClient";
import { fileUploadSync } from "./lib/fileUploadSync";
import { inspectionsCache } from "./lib/inspectionsCache";

// Listen for messages from service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'REQUEST_SYNC') {
      console.log('[Client] Received sync request from service worker');
      
      // Get the MessageChannel port from the event
      const port = event.ports[0];
      
      try {
        // Trigger offline queue sync
        const result = await offlineQueue.syncAll(apiRequest);
        console.log('[Client] Sync complete:', result);
        
        // Send result back to service worker via MessageChannel
        if (port) {
          port.postMessage({
            type: 'SYNC_RESULT',
            success: result.success,
            failed: result.failed
          });
        }
      } catch (error) {
        console.error('[Client] Sync failed:', error);
        
        // Send error back to service worker via MessageChannel
        if (port) {
          port.postMessage({
            type: 'SYNC_ERROR',
            error: error instanceof Error ? error.message : 'Unknown sync error'
          });
        }
      }
    } else if (event.data && event.data.type === 'REQUEST_FILE_SYNC') {
      console.log('[Client] Received file sync request from service worker');
      
      const port = event.ports[0];
      
      try {
        // Trigger file upload sync
        const result = await fileUploadSync.syncAll();
        console.log('[Client] File sync complete:', result);
        
        if (port) {
          port.postMessage({
            type: 'FILE_SYNC_RESULT',
            success: result.success,
            failed: result.failed
          });
        }
      } catch (error) {
        console.error('[Client] File sync failed:', error);
        
        if (port) {
          port.postMessage({
            type: 'FILE_SYNC_ERROR',
            error: error instanceof Error ? error.message : 'Unknown file sync error'
          });
        }
      }
    }
  });
}

// Auto-sync when coming online
window.addEventListener('online', async () => {
  console.log('[Client] Connection restored - syncing offline data...');
  
  try {
    // Sync offline queue
    const queueResult = await offlineQueue.syncAll(apiRequest);
    console.log('[Client] Queue sync result:', queueResult);
    
    // Sync file uploads
    const fileResult = await fileUploadSync.syncAll();
    console.log('[Client] File sync result:', fileResult);
    
    // Pre-cache all inspections for offline access
    try {
      const response = await apiRequest("GET", "/api/inspections/my");
      const inspections = await response.json();
      if (inspections && inspections.length > 0) {
        await inspectionsCache.cacheInspections(inspections);
        console.log('[Client] Pre-cached inspections for offline access');
        
        // Cache entries for each inspection
        for (const inspection of inspections) {
          try {
            const entriesResponse = await apiRequest("GET", `/api/inspections/${inspection.id}/entries`);
            const entries = await entriesResponse.json();
            if (entries && entries.length > 0) {
              await inspectionsCache.cacheInspectionEntries(inspection.id, entries);
            }
          } catch (err) {
            console.warn(`[Client] Failed to cache entries for inspection ${inspection.id}:`, err);
          }
        }
        console.log('[Client] Pre-cached inspection entries for offline access');
      }
    } catch (err) {
      console.warn('[Client] Failed to pre-cache inspections:', err);
    }
    
    // Register background sync for future offline periods
    if ('serviceWorker' in navigator && 'sync' in (self as any).registration) {
      try {
        await (self as any).registration.sync.register('sync-inspections');
        await (self as any).registration.sync.register('sync-files');
      } catch (err) {
        console.warn('[Client] Background sync registration failed:', err);
      }
    }
  } catch (error) {
    console.error('[Client] Auto-sync failed:', error);
  }
});

// Pre-cache inspections when app loads (if online)
if (navigator.onLine) {
  // Delay to let app initialize
  setTimeout(async () => {
    try {
      const response = await apiRequest("GET", "/api/inspections/my");
      const inspections = await response.json();
      if (inspections && inspections.length > 0) {
        await inspectionsCache.cacheInspections(inspections);
        console.log('[Client] Pre-cached inspections on app load');
        
        // Cache entries for each inspection (in background, don't block)
        Promise.all(
          inspections.map(async (inspection: any) => {
            try {
              const entriesResponse = await apiRequest("GET", `/api/inspections/${inspection.id}/entries`);
              const entries = await entriesResponse.json();
              if (entries && entries.length > 0) {
                await inspectionsCache.cacheInspectionEntries(inspection.id, entries);
              }
            } catch (err) {
              // Silently fail for individual entries
            }
          })
        ).then(() => {
          console.log('[Client] Pre-cached inspection entries on app load');
        }).catch(() => {
          // Silently fail
        });
      }
    } catch (err) {
      // Silently fail - user might not be authenticated yet
    }
  }, 2000);
}

createRoot(document.getElementById("root")!).render(<App />);
