// constants/themes.ts
import { Platform } from 'react-native';

// Color palette (based on your Flutter app)
const colors = {
  // Primary purple from Flutter
  primary: '#8B5CF6',
  primaryLight: '#A78BFA',
  primaryDark: '#7C3AED',
  
  // Secondary teal
  secondary: '#06B6D4',
  secondaryLight: '#22D3EE',
  secondaryDark: '#0891B2',
  
  // Pink accent
  accent: '#EC4899',
  accentLight: '#F472B6',
  accentDark: '#DB2777',
  
  // Orange accent
  warning: '#F59E0B',
  warningLight: '#FBBF24',
  warningDark: '#D97706',
  
  // Success/Error
  success: '#10B981',
  error: '#EF4444',
  
  // Grays
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  
  // Common
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

// Typography
const typography = {
  // Headings
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  // Body text
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  // Labels
  labelLarge: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  labelSmall: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
  // Button text
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  // Caption
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
};

// Spacing (8px base unit)
const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

// Border radius
const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  round: 9999,
};

// Shadows for light mode
const lightShadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
};

// Shadows for dark mode (lighter shadows)
const darkShadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
};

// Light Theme
export const lightTheme = {
  dark: false,
  colors: {
    primary: colors.primary,
    primaryLight: colors.primaryLight,
    primaryDark: colors.primaryDark,
    secondary: colors.secondary,
    secondaryLight: colors.secondaryLight,
    secondaryDark: colors.secondaryDark,
    accent: colors.accent,
    accentLight: colors.accentLight,
    accentDark: colors.accentDark,
    warning: colors.warning,
    warningLight: colors.warningLight,
    warningDark: colors.warningDark,
    success: colors.success,
    error: colors.error,
    
    // Backgrounds
    background: colors.white,
    surface: colors.gray50,
    card: colors.white,
    
    // Text
    text: colors.gray900,
    textSecondary: colors.gray600,
    textDisabled: colors.gray400,
    textInverse: colors.white,
    
    // Borders
    border: colors.gray200,
    borderLight: colors.gray100,
    borderDark: colors.gray300,
    
    // Status bar
    statusBar: 'dark-content',
    
    // Common
    white: colors.white,
    black: colors.black,
    transparent: colors.transparent,
    
    // Gray scale for convenience
    gray50: colors.gray50,
    gray100: colors.gray100,
    gray200: colors.gray200,
    gray300: colors.gray300,
    gray400: colors.gray400,
    gray500: colors.gray500,
    gray600: colors.gray600,
    gray700: colors.gray700,
    gray800: colors.gray800,
    gray900: colors.gray900,
  },
  typography,
  spacing,
  borderRadius,
  shadows: lightShadows,
};

// Dark Theme
export const darkTheme = {
  dark: true,
  colors: {
    primary: colors.primaryLight,
    primaryLight: colors.primary,
    primaryDark: colors.primaryDark,
    secondary: colors.secondaryLight,
    secondaryLight: colors.secondary,
    secondaryDark: colors.secondaryDark,
    accent: colors.accentLight,
    accentLight: colors.accent,
    accentDark: colors.accentDark,
    warning: colors.warningLight,
    warningLight: colors.warning,
    warningDark: colors.warningDark,
    success: colors.success,
    error: colors.error,
    
    // Backgrounds
    background: colors.gray900,
    surface: colors.gray800,
    card: colors.gray800,
    
    // Text
    text: colors.gray100,
    textSecondary: colors.gray400,
    textDisabled: colors.gray600,
    textInverse: colors.gray900,
    
    // Borders
    border: colors.gray700,
    borderLight: colors.gray800,
    borderDark: colors.gray600,
    
    // Status bar
    statusBar: 'light-content',
    
    // Common
    white: colors.white,
    black: colors.black,
    transparent: colors.transparent,
    
    // Gray scale
    gray50: colors.gray900,
    gray100: colors.gray800,
    gray200: colors.gray700,
    gray300: colors.gray600,
    gray400: colors.gray500,
    gray500: colors.gray400,
    gray600: colors.gray300,
    gray700: colors.gray200,
    gray800: colors.gray100,
    gray900: colors.gray50,
  },
  typography,
  spacing,
  borderRadius,
  shadows: darkShadows,
};

// Type definition for theme (useful for TypeScript)
export type Theme = typeof lightTheme;