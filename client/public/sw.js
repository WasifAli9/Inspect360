const CACHE_NAME = 'inspect360-v4';
const RUNTIME_CACHE = 'inspect360-runtime-v4';
const API_CACHE = 'inspect360-api-v4';

// App shell - essential files for offline functionality
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event - cache app shell
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        // Use addAll but catch errors gracefully
        return Promise.allSettled(
          APP_SHELL.map(url => 
            cache.add(url).catch(err => {
              console.warn(`[Service Worker] Failed to cache ${url}:`, err);
              return null;
            })
          )
        ).then(() => self.skipWaiting());
      })
      .catch((err) => {
        console.warn('[Service Worker] Install failed (non-critical):', err);
        // Still skip waiting even if caching fails
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete all old caches (including old versions)
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE && cacheName !== API_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Clear any API responses and HTML files that might have been cached
      return caches.open(RUNTIME_CACHE).then((cache) => {
        return cache.keys().then((keys) => {
          const keysToDelete = keys.filter((request) => {
            try {
              const url = new URL(request.url);
              // Delete API responses and HTML files to ensure fresh content
              return url.pathname.startsWith('/api/') || 
                     url.pathname === '/' || 
                     url.pathname === '/index.html' ||
                     url.pathname.endsWith('.html');
            } catch {
              return false;
            }
          });
          return Promise.all(
            keysToDelete.map((key) => {
              console.log('[Service Worker] Removing cached file:', key.url);
              return cache.delete(key);
            })
          );
        });
      }).catch((err) => {
        console.warn('[Service Worker] Error cleaning cache:', err);
      });
    }).then(() => {
      // Also clear HTML from APP_SHELL cache
      return caches.open(CACHE_NAME).then((cache) => {
        return cache.delete('/') && cache.delete('/index.html');
      }).catch((err) => {
        console.warn('[Service Worker] Error cleaning app shell cache:', err);
      });
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  const url = new URL(event.request.url);
  
  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    // For GET API requests, use network-first with cache fallback for offline support
    // This allows users to view cached data when offline
    if (event.request.method === 'GET') {
      // List of API endpoints that should NOT be cached (dynamic data)
      const noCacheEndpoints = [
        '/api/auth/me',
        '/api/organisations/current',
        '/api/credits',
        '/api/subscriptions',
      ];
      
      const shouldCache = !noCacheEndpoints.some(endpoint => url.pathname.startsWith(endpoint));
      
      event.respondWith(
        fetch(event.request)
          .then((networkResponse) => {
            // If network succeeds and response is OK, cache it for offline use
            if (networkResponse && networkResponse.status === 200 && shouldCache) {
              const responseClone = networkResponse.clone();
              caches.open(API_CACHE).then((cache) => {
                // Cache with a timestamp to track freshness
                const cacheKey = new Request(event.request.url, {
                  method: 'GET',
                  headers: event.request.headers,
                });
                cache.put(cacheKey, responseClone).catch((err) => {
                  console.warn('[Service Worker] Failed to cache API response:', err);
                });
              }).catch((err) => {
                console.warn('[Service Worker] Failed to open API cache:', err);
              });
            }
            return networkResponse;
          })
          .catch((error) => {
            // Network failed - try cache for offline support
            console.log('[Service Worker] Network failed for API, trying cache:', event.request.url);
            return caches.open(API_CACHE).then((cache) => {
              return cache.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                  console.log('[Service Worker] Serving cached API response:', event.request.url);
                  return cachedResponse;
                }
                // No cache - throw error
                throw error;
              });
            }).catch(() => {
              throw error;
            });
          })
      );
      return;
    }
    
    // For POST/PUT/DELETE requests, don't cache - these are mutations
    // They will be handled by the offline queue system
    return;
  }

  // Check if this is an HTML file (index.html or root path)
  const isHtmlRequest = url.pathname === '/' || 
                        url.pathname === '/index.html' || 
                        url.pathname.endsWith('.html') ||
                        event.request.headers.get('accept')?.includes('text/html');

  if (isHtmlRequest) {
    // For HTML files, use network-first strategy to always get the latest version
    // This prevents blank screens from stale cached HTML
    event.respondWith(
      fetch(event.request, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        }
      })
        .then((networkResponse) => {
          // If network succeeds, update cache and return fresh response
          if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'error') {
            const responseClone = networkResponse.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              // Cache the fresh HTML for offline use
              if (responseClone.body) {
                cache.put(event.request, responseClone).catch((err) => {
                  console.warn('[Service Worker] Failed to cache HTML:', err);
                });
              }
            }).catch((err) => {
              console.warn('[Service Worker] Failed to open cache for HTML:', err);
            });
          }
          return networkResponse;
        })
        .catch((error) => {
          // Network failed - try cache as fallback for offline support
          console.warn('[Service Worker] Network failed for HTML, trying cache:', event.request.url, error);
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // No cache either - throw error
            throw error;
          });
        })
    );
    return;
  }

  // For other static assets (CSS, JS, images), use cache-first strategy
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version and update cache in background (stale-while-revalidate)
        event.waitUntil(
          fetch(event.request).then((networkResponse) => {
            // Only cache static assets, not API responses
            if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'error') {
              return caches.open(RUNTIME_CACHE).then((cache) => {
                cache.put(event.request, networkResponse.clone());
              });
            }
          }).catch(() => {
            // Network failed, but we have cache - that's fine
          })
        );
        return cachedResponse;
      }

      // Not in cache - fetch from network
      return fetch(event.request).then((networkResponse) => {
        // Only cache static assets (not API responses)
        if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'error') {
          const responseClone = networkResponse.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            // Only cache if response is valid and not a stream
            if (responseClone.body) {
              cache.put(event.request, responseClone).catch((err) => {
                console.warn('[Service Worker] Failed to cache response:', err);
              });
            }
          }).catch((err) => {
            console.warn('[Service Worker] Failed to open cache:', err);
          });
        }
        return networkResponse;
      }).catch((error) => {
        console.warn('[Service Worker] Fetch failed:', event.request.url, error);
        throw error;
      });
    })
  );
});

// Background sync event - sync offline data when connection is restored
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  if (event.tag === 'sync-inspections') {
    event.waitUntil(syncInspections());
  } else if (event.tag === 'sync-files') {
    event.waitUntil(syncFiles());
  }
});

// Sync file uploads
async function syncFiles() {
  console.log('[Service Worker] Syncing files...');
  
  try {
    const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    
    if (clients.length === 0) {
      console.log('[Service Worker] No active clients for file sync');
      return Promise.reject(new Error('No active clients available'));
    }
    
    const messageChannel = new MessageChannel();
    
    const syncPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('File sync timeout'));
      }, 60000); // 60 second timeout for file uploads
      
      messageChannel.port1.onmessage = (event) => {
        clearTimeout(timeout);
        
        if (event.data && event.data.type === 'FILE_SYNC_RESULT') {
          console.log(`[Service Worker] File sync complete: ${event.data.success} succeeded, ${event.data.failed} failed`);
          resolve(event.data);
        } else if (event.data && event.data.type === 'FILE_SYNC_ERROR') {
          reject(new Error(event.data.error || 'File sync failed'));
        } else {
          reject(new Error('Invalid file sync response'));
        }
      };
    });
    
    clients[0].postMessage({
      type: 'REQUEST_FILE_SYNC'
    }, [messageChannel.port2]);
    
    return await syncPromise;
  } catch (error) {
    console.error('[Service Worker] File sync error:', error);
    return Promise.reject(error);
  }
}

// Sync offline inspection queue
async function syncInspections() {
  console.log('[Service Worker] Syncing inspections...');
  
  try {
    // Get all active clients
    const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    
    if (clients.length === 0) {
      console.log('[Service Worker] No active clients to sync with - sync will retry later');
      // Reject so Background Sync will retry when a client becomes available
      return Promise.reject(new Error('No active clients available for sync'));
    }
    
    // Create a MessageChannel to wait for the client's response
    const messageChannel = new MessageChannel();
    
    // Set up promise to wait for client response
    const syncPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Sync timeout - no response from client'));
      }, 30000); // 30 second timeout
      
      messageChannel.port1.onmessage = (event) => {
        clearTimeout(timeout);
        
        if (event.data && event.data.type === 'SYNC_RESULT') {
          console.log(`[Service Worker] Sync complete: ${event.data.success} succeeded, ${event.data.failed} failed`);
          
          if (event.data.failed > 0) {
            // Some items failed - reject so Background Sync will retry
            reject(new Error(`Sync partially failed: ${event.data.failed} items`));
          } else {
            resolve(event.data);
          }
        } else if (event.data && event.data.type === 'SYNC_ERROR') {
          reject(new Error(event.data.error || 'Sync failed'));
        } else {
          reject(new Error('Invalid sync response'));
        }
      };
    });
    
    // Send sync request to client with MessageChannel port
    clients[0].postMessage({
      type: 'REQUEST_SYNC'
    }, [messageChannel.port2]);
    
    console.log('[Service Worker] Sync request sent to client, waiting for completion...');
    
    // Wait for the client to complete the sync
    return await syncPromise;
  } catch (error) {
    console.error('[Service Worker] Sync error:', error);
    return Promise.reject(error);
  }
}

// Message event - for communication with client
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
