import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';

interface EmptyScreenProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
}

export const EmptyScreen: React.FC<EmptyScreenProps> = ({ icon, title, message }) => {
  const { theme } = useTheme();
  const colors = theme.colors;

  // Create dynamic styles based on the theme
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={60} color={colors.primary} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      marginTop: 16,
      color: colors.text,
    },
    message: {
      color: colors.textSecondary,
      fontSize: 14,
      marginTop: 8,
      textAlign: 'center',
    },
  });