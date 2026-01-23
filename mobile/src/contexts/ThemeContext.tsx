import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme, Appearance } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { colors as lightColors, darkColors } from '../theme/colors';

export type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: 'light' | 'dark';
  themeMode: ThemeMode;
  colors: typeof lightColors;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'app_theme_mode';

// Storage helper functions
const setStorageItem = async (key: string, value: string) => {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

const getStorageItem = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return await AsyncStorage.getItem(key);
  } else {
    return await SecureStore.getItemAsync(key);
  }
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('auto');
  const [isInitialized, setIsInitialized] = useState(false);

  // Determine actual theme based on mode and system preference
  const getActualTheme = (mode: ThemeMode, systemScheme: 'light' | 'dark' | null): 'light' | 'dark' => {
    if (mode === 'auto') {
      return systemScheme === 'dark' ? 'dark' : 'light';
    }
    return mode;
  };

  const actualTheme = getActualTheme(themeMode, systemColorScheme || 'light');
  const isDark = actualTheme === 'dark';
  // Always ensure themeColors is defined - use lightColors as default
  const themeColors = (isDark ? darkColors : lightColors) || lightColors;

  // Load saved theme preference on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedMode = await getStorageItem(THEME_STORAGE_KEY);
        if (savedMode && (savedMode === 'light' || savedMode === 'dark' || savedMode === 'auto')) {
          setThemeModeState(savedMode as ThemeMode);
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    loadTheme();
  }, []);

  // Listen to system theme changes when in auto mode
  useEffect(() => {
    if (themeMode !== 'auto') return;

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      // Theme will update automatically via getActualTheme
      // Force a re-render by updating state
      setThemeModeState((prev) => prev); // Trigger re-render
    });

    return () => subscription.remove();
  }, [themeMode]);

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await setStorageItem(THEME_STORAGE_KEY, mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error('Error saving theme preference:', error);
      throw error;
    }
  };

  // Always provide theme context, but use default values until initialized
  // This prevents "Cannot read property" errors when components try to use themeColors
  return (
    <ThemeContext.Provider
      value={{
        theme: actualTheme,
        themeMode,
        colors: themeColors, // Will be lightColors or darkColors, never undefined
        setThemeMode,
        isDark,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // Return a safe default instead of throwing to prevent crashes during module loading
    console.warn('useTheme called outside ThemeProvider, using default colors');
    return {
      theme: 'light' as const,
      themeMode: 'auto' as ThemeMode,
      colors: lightColors,
      setThemeMode: async () => {},
      isDark: false,
    };
  }
  // Ensure colors is always defined - double-check for safety
  if (!context.colors) {
    console.warn('Theme context colors is undefined, using default colors');
    return {
      ...context,
      colors: lightColors,
    };
  }
  // Final safety check - ensure the returned object always has colors
  return {
    ...context,
    colors: context.colors || lightColors,
  };
}

