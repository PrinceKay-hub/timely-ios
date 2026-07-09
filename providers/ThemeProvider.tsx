import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme } from '../constants/theme';
import { useThemeStore, ThemeMode } from '../stores/useThemeStore';

interface ThemeContextType {
  theme: typeof lightTheme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  themeMode: 'system',
  setThemeMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const systemColorScheme = useColorScheme();
  // Read from the persisted Zustand store — this is the single source of
  // truth for the user's preference. The old local useState meant the
  // persisted value loaded by storage.ts was never reflected in the UI.
  const { themeMode, setThemeMode } = useThemeStore();

  const theme =
    themeMode === 'system'
      ? systemColorScheme === 'dark'
        ? darkTheme
        : lightTheme
      : themeMode === 'dark'
      ? darkTheme
      : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};