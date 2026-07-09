// components/home/ModernAppBar.tsx
import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';

interface ModernAppBarProps {
  user: Record<string, any>;
}

const getTimeBasedGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 17) return 'Good Afternoon';
  if (hour >= 17 && hour < 21) return 'Good Evening';
  return 'Good Night';
};

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 44;

export const ModernAppBar: React.FC<ModernAppBarProps> = ({ user }) => {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = theme.colors;

  // Create dynamic styles based on the theme
  const styles = useMemo(() => createStyles(colors), [colors]);

  const greeting = getTimeBasedGreeting();
  const initial = (user?.displayName as string)?.[0]?.toUpperCase() ?? 'U';

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Left — Avatar + greeting */}
      <View style={styles.left}>
        <View style={styles.avatar}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>{initial}</Text>
        </View>
        <View style={styles.greetingCol}>
          <Text style={styles.helloText}>
            Hello {user?.displayName ?? ''},
          </Text>
          <Text style={styles.greetingText}>{greeting}</Text>
        </View>
      </View>

      {/* Right — Search button */}
      <TouchableOpacity
        style={styles.searchBtn}
        onPress={() => router.push('/search')}
        activeOpacity={0.8}
      >
        <Text style={styles.searchIcon}>🔍</Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      paddingTop: STATUS_BAR_HEIGHT + 12,
      paddingBottom: 20,
      paddingHorizontal: 20,
      backgroundColor: colors.primary,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    left: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontWeight: '700',
      fontSize: 18,
    },
    greetingCol: {
      gap: 2,
    },
    helloText: {
      color: 'rgba(255,255,255,0.75)',
      fontSize: 12,
    },
    greetingText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
    searchBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchIcon: {
      fontSize: 18,
    },
  });