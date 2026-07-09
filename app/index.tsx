// app/index.tsx
import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, Animated, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/stores/auth';
import { useTheme } from '@/providers/ThemeProvider';

export default function SplashScreen() {
  const router = useRouter();
  const { checkAuthStatus, user } = useAuthStore();
  const { theme } = useTheme();
  const colors = theme.colors;

  // Create dynamic styles based on the theme
  const styles = useMemo(() => createStyles(colors), [colors]);

  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

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

    // Check onboarding and auth
    const initialize = async () => {
      await checkAuthStatus();
      const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');

      setTimeout(() => {
        const { user } = useAuthStore.getState();

        if (user) {
          router.replace('/(tabs)/home');
        } else if (hasSeenOnboarding === 'true') {
          router.replace('/AuthWrapper');
        } else {
          router.replace('/OnboardingScreen');
        }
      }, 3000);
    };
    initialize();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <View style={styles.logoContainer}>
          <Image source={require('../assets/images/logo.png')} style={styles.logo} />
        </View>
      </Animated.View>
      <Animated.Text style={[styles.appName, { opacity: fadeAnim }]}>
        Timely
      </Animated.Text>
      <Animated.Text style={[styles.tagline, { opacity: fadeAnim }]}>
        Your Style, Our Priority
      </Animated.Text>
    </View>
  );
}

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.primary, // Brand color
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoContainer: {
      backgroundColor: '#fff', // Keep white for contrast
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