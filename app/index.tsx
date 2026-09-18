// app/index.tsx
import React, { useEffect, useRef, useMemo } from 'react';
import { View, Animated, StyleSheet, Image } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/stores/auth';
import { useTheme } from '@/providers/ThemeProvider';
import {
  peekPendingChat,
  consumePendingChat,
  onPendingChat,
} from '@/types/pendingNavigation';

export default function SplashScreen() {
  const router = useRouter();
  const { checkAuthStatus } = useAuthStore();
  const { theme } = useTheme();
  const colors = theme.colors;

  const styles = useMemo(() => createStyles(colors), [colors]);

  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Guarantees we only ever route once from this screen.
  const navigatedRef = useRef(false);

  useEffect(() => {
    // Animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const go = (path: Href) => {
      if (navigatedRef.current) return;
      navigatedRef.current = true;
      router.replace(path);
    };

    const initialize = async () => {
      await checkAuthStatus();
      if (cancelled) return;

      const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
      if (cancelled) return;

      // If we were cold-started from a notification tap, RootLayout has
      // already recorded the intent. Skip the 3s splash entirely and
      // route straight to the chat.
      const isFromNotification = !!peekPendingChat();
      const delay = isFromNotification ? 0 : 3000;

      timer = setTimeout(() => {
        if (cancelled) return;

        // ① Pending chat wins over every other routing rule.
        const chatId = consumePendingChat();
        if (chatId) {
          go(`/chats/${chatId}`);
          return;
        }

        // ② Normal routing.
        const { user } = useAuthStore.getState();
        if (user) {
          go('/(tabs)/home');
        } else if (hasSeenOnboarding === 'true') {
          go('/AuthWrapper');
        } else {
          go('/OnboardingScreen');
        }
      }, delay);
    };

    initialize();

    // If a runtime tap arrives BEFORE we've routed (very rare — app was
    // still on splash when the user tapped), catch it and route immediately.
    const unsub = onPendingChat((chatId) => {
      if (navigatedRef.current) return;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      go(`/chats/${chatId}`);
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      unsub();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logo}
          />
        </View>
      </Animated.View>
      <Animated.Text style={[styles.appName, { opacity: fadeAnim }]}>
        Timely
      </Animated.Text>
      <Animated.Text style={[styles.tagline, { opacity: fadeAnim }]}>
        Beauty, on time
      </Animated.Text>
    </View>
  );
}

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoContainer: {
      backgroundColor: '#fff',
      borderRadius: 30,
      padding: 15,
      shadowColor: colors.shadow || '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.2,
      shadowRadius: 30,
      elevation: 10,
    },
    logo: {
      width: 120,
      height: 120,
    },
    appName: {
      fontSize: 40,
      fontWeight: 'bold',
      color: '#fff',
      marginTop: 30,
    },
    tagline: {
      fontSize: 16,
      color: '#fff',
      marginTop: 10,
    },
  });