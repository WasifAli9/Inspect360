import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { initializeBackgroundSync, syncOnForeground, cleanup, type BackgroundSyncCallbacks } from '../services/offline/backgroundSync';
import { syncService, type SyncProgress } from '../services/offline/syncService';
import * as Network from 'expo-network';
import { AppState, AppStateStatus } from 'react-native';

interface SyncContextType {
  isSyncing: boolean;
  syncProgress: SyncProgress | null;
  showSyncModal: boolean;
  setShowSyncModal: (show: boolean) => void;
  triggerSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Check initial network state
    Network.getNetworkStateAsync().then(state => {
      setWasOffline(!state.isConnected);
    });

    // Set up sync progress listener
    const unsubscribe = syncService.addProgressListener((progress) => {
      setSyncProgress(progress);
      setIsSyncing(progress.total > 0 && progress.completed + progress.failed < progress.total);
      
      // Auto-show modal when sync starts
      if (progress.total > 0 && progress.completed === 0 && progress.failed === 0) {
        setShowSyncModal(true);
      }
      
      // Auto-hide modal when sync completes (after 2 seconds)
      if (progress.total > 0 && progress.completed + progress.failed >= progress.total) {
        setTimeout(() => {
          setShowSyncModal(false);
        }, 2000);
      }
    });

    // Initialize background sync
    const callbacks: BackgroundSyncCallbacks = {
      onSyncStart: () => {
        // Removed successful sync logging to reduce console noise
        setIsSyncing(true);
        setShowSyncModal(true);
      },
      onSyncProgress: (progress) => {
        setSyncProgress(progress);
        setIsSyncing(progress.total > 0 && progress.completed + progress.failed < progress.total);
      },
      onSyncComplete: (result) => {
        // Removed successful sync completion logging to reduce console noise
        setIsSyncing(false);
        // Keep modal open for 2 seconds to show completion
        setTimeout(() => {
          setShowSyncModal(false);
        }, 2000);
      },
      onSyncError: (error) => {
        console.error('[SyncContext] Sync error:', error);
        setIsSyncing(false);
        // Keep modal open to show error
      },
      onNetworkChange: async (isOnline) => {
        // Removed network change logging to reduce console noise
        if (isOnline && wasOffline) {
          // Just came back online - trigger sync immediately
          // Removed sync trigger logging to reduce console noise
          setWasOffline(false);
          setShowSyncModal(true);
          // Sync will be triggered automatically by backgroundSync
        } else if (!isOnline) {
          setWasOffline(true);
          setShowSyncModal(false);
        }
      },
    };

    initializeBackgroundSync(callbacks);

    // Handle app state changes
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        syncOnForeground();
      }
    });

    return () => {
      unsubscribe();
      subscription.remove();
      cleanup();
    };
  }, []);

  const triggerSync = async () => {
    try {
      const networkState = await Network.getNetworkStateAsync();
      if (!networkState.isConnected) {
        throw new Error('Not online');
      }
      setShowSyncModal(true);
      setIsSyncing(true);
      await syncService.syncAll();
    } catch (error: any) {
      console.error('[SyncContext] Error triggering sync:', error);
      setIsSyncing(false);
      throw error;
    }
  };

  return (
    <SyncContext.Provider
      value={{
        isSyncing,
        syncProgress,
        showSyncModal,
        setShowSyncModal,
        triggerSync,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}

