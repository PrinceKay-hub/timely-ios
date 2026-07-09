// toastConfig.tsx (or wherever you have it)
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';

// ─── Custom Toast Component ──────────────────────────────────────────────
interface ToastProps {
  text1?: string;
  text2?: string;
  type?: 'success' | 'error' | 'info';
}

const ThemedToast: React.FC<ToastProps> = ({ text1, text2, type = 'info' }) => {
  const { theme } = useTheme();
  const colors = theme.colors;

  // Create dynamic styles based on the theme
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Optional: adjust background based on type (e.g., error red)
  const containerStyle = useMemo(() => {
    if (type === 'error') {
      return { backgroundColor: colors.error || '#ef4444' };
    }
    if (type === 'success') {
      return { backgroundColor: colors.success || '#22c55e' };
    }
    return { backgroundColor: colors.card || colors.background };
  }, [type, colors]);

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.title, { color: type === 'error' || type === 'success' ? '#fff' : colors.text }]}>
        {text1}
      </Text>
      {text2 ? (
        <Text style={[styles.body, { color: type === 'error' || type === 'success' ? 'rgba(255,255,255,0.9)' : colors.textSecondary }]}>
          {text2}
        </Text>
      ) : null}
    </View>
  );
};

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      width: '90%',
      borderRadius: 12,
      padding: 14,
      shadowColor: colors.shadow || '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 5,
    },
    title: {
      fontWeight: '600',
      fontSize: 14,
    },
    body: {
      fontSize: 13,
      marginTop: 3,
    },
  });

// ─── Toast Config ──────────────────────────────────────────────────────────
export const toastConfig = {
  success: (props: any) => <ThemedToast {...props} type="success" />,
  error: (props: any) => <ThemedToast {...props} type="error" />,
  info: (props: any) => <ThemedToast {...props} type="info" />,
  // You can also add a 'notification' type if needed
  notification: (props: any) => <ThemedToast {...props} type="info" />,
};