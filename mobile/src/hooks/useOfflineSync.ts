import { useEffect, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Network from 'expo-network';
import { offlineQueue, OfflineQueueItem } from '../services/offlineQueue';
import { syncManager } from '../services/syncManager';
import { localDatabase } from '../services/localDatabase';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [queueSize, setQueueSize] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const checkNetworkStatus = useCallback(async () => {
    try {
      // Ensure database is initialized before checking queue
      try {
        await localDatabase.initialize();
      } catch (dbError) {
        console.error('[useOfflineSync] Database initialization failed:', dbError);
        setIsOnline(false);
        setQueueSize(0);
        return;
      }

      const networkState = await Network.getNetworkStateAsync();
      const online = networkState.isConnected || false;
    setIsOnline(online);

    if (online) {
        try {
          // Get queue size from both old queue and new sync manager
          const oldQueueSize = await offlineQueue.getQueueSize();
          const newQueueSize = await syncManager.getPendingCount();
          setQueueSize(oldQueueSize + newQueueSize);
        } catch (queueError) {
          console.error('[useOfflineSync] Error getting queue size:', queueError);
          setQueueSize(0);
        }
      } else {
        setQueueSize(0);
      }
    } catch (error) {
      console.error('[useOfflineSync] Error checking network status:', error);
      setIsOnline(false);
      setQueueSize(0);
    }
  }, []);

  const sync = useCallback(async () => {
    // Check online status again to ensure we're still online
    const networkState = await Network.getNetworkStateAsync();
    const currentlyOnline = networkState.isConnected || false;
    
    if (!currentlyOnline || isSyncing) {
      return { success: 0, failed: 0 };
    }

    setIsSyncing(true);
    try {
      // Sync both old queue and new sync manager
      const oldResult = await offlineQueue.syncQueue();
      const newResult = await syncManager.startSync();
      
      await checkNetworkStatus();
      return {
        success: oldResult.success + newResult.success,
        failed: oldResult.failed + newResult.failed,
      };
    } catch (error) {
      console.error('[useOfflineSync] Sync error:', error);
      return { success: 0, failed: 0 };
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, checkNetworkStatus]);

  useEffect(() => {
    checkNetworkStatus();

    // Check network status periodically (every 5 seconds)
    const interval = setInterval(checkNetworkStatus, 5000);

    // Sync when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkNetworkStatus().then(() => {
          // Sync will be triggered by the isOnline effect below
        });
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [checkNetworkStatus]);

  // Sync automatically when coming back online
  useEffect(() => {
    if (isOnline && queueSize > 0 && !isSyncing) {
      // Small delay to ensure network is stable
      const timeoutId = setTimeout(() => {
        sync().catch(error => {
          console.error('[useOfflineSync] Auto-sync failed:', error);
        });
      }, 2000); // 2 second delay to ensure network is stable
      return () => clearTimeout(timeoutId);
    }
  }, [isOnline, queueSize, isSyncing, sync]);

  // Periodic background sync (every 5 minutes when app is active)
  useEffect(() => {
    if (!isOnline) return;

    const syncInterval = setInterval(() => {
      if (AppState.currentState === 'active') {
        sync();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(syncInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  return {
    isOnline,
    queueSize,
    isSyncing,
    sync,
    checkNetworkStatus,
  };
}

