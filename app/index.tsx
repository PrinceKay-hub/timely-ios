// app/index.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/stores/auth';

export default function SplashScreen() {
  const router = useRouter();
  const { checkAuthStatus, user } = useAuthStore();

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
        // ✅ Read directly from store to avoid stale closure
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
        {/* White container around logo */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    backgroundColor: 'white',
    borderRadius: 30,
    padding: 15,
    shadowColor: '#000',
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
    color: 'white',
    marginTop: 30,
  },
  tagline: {
    fontSize: 16,
    color: 'white',
    marginTop: 10,
  },
});