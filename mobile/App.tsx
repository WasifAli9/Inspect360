// App entry point
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { SyncProvider } from './src/contexts/SyncContext';
import AppNavigator from './src/navigation/AppNavigator';
import { queryClient } from './src/services/queryClient';
import { ErrorBoundary } from './src/components/ui/ErrorBoundary';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import GlobalSyncModal from './src/components/ui/GlobalSyncModal';

function AppContent() {
  return (
    <View style={styles.container}>
      <AppNavigator />
      <GlobalSyncModal />
    </View>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>
              <SyncProvider>
                <AppContent />
              </SyncProvider>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
