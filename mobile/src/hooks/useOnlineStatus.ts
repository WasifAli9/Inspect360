import { useState, useEffect } from 'react';
import * as Network from 'expo-network';

/**
 * Hook to check if device is online with real-time network state listeners
 * Returns false if offline - app works offline with local database
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const checkNetwork = async () => {
      try {
        const networkState = await Network.getNetworkStateAsync();
        setIsOnline(networkState.isConnected || false);
      } catch (error) {
        console.error('[useOnlineStatus] Error checking network:', error);
        setIsOnline(false);
      }
    };

    // Check initial state
    checkNetwork();

    // Set up real-time network state listener
    const subscription = Network.addNetworkStateListener((state) => {
      setIsOnline(state.isConnected || false);
    });

    // Also check periodically as a fallback (every 10 seconds)
    const interval = setInterval(checkNetwork, 10000);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, []);

  return isOnline;
}

