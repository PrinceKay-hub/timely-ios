// app/(tabs)/index.tsx (or wherever Home.tsx lives)
//
// Diff summary from your version:
// 1. Imports + calls the 3 new stores (nearYou, topRated, newOnTimely).
// 2. useEffect on homeStore.location triggers Near You — fires on
//    every mount (including when location is already resolved from a
//    prior visit), so no "stuck on loading" issue like the Flutter
//    BlocListener had.
// 3. onScroll handler on the outer ScrollView triggers
//    serviceData.fetchNextPage() near the bottom.
// 4. Inserted <HorizontalServiceSection /> x3 into the layout.
// 5. onRefresh also refreshes Top Rated + New on Timely.

import React, { useEffect, useCallback, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  StatusBar,
  RefreshControl,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { db } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';

import { useAuthStore } from '@/stores/auth';
import messaging from '@react-native-firebase/messaging';
import { useHomeStore } from '@/stores/home';
import { useServiceDataStore } from '@/stores/serviceData';
import { useNearYouStore } from '@/stores/nearYou';
import { useTopRatedStore } from '@/stores/topRated';
import { useNewOnTimelyStore } from '@/stores/newOnTimely';
import { useConnectivityStore, initConnectivityListener } from '@/stores/connectivityStore';
import { useTheme } from '@/providers/ThemeProvider';

import { ModernAppBar } from '../../components/mordenappbar';
import { SpecialOffersCard } from '../../components/specialofferscard';
import { CategoriesSection } from '../../components/categoriesscetion';
import { RecommendedSection } from '../../components/recommendedsection';
import { HorizontalServiceSection } from '../../components/HorizontalServiceSection';
import { Snackbar } from '../../components/Snackbar';

const SCROLL_BOTTOM_THRESHOLD = 400;

export default function Home() {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const { user, profile } = useAuthStore();
  const { loadCategories, updateLocation, location } = useHomeStore();
  const { services, fetchServiceData, fetchNextPage } = useServiceDataStore();

  const { services: nearYouServices, isLoading: nearYouLoading, loadNearby } =
    useNearYouStore();
  const {
    services: topRatedServices,
    isLoading: topRatedLoading,
    loadTopRated,
  } = useTopRatedStore();
  const {
    services: newOnTimelyServices,
    isLoading: newOnTimelyLoading,
    loadNew,
  } = useNewOnTimelyStore();

  const status = useConnectivityStore((state) => state.status);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const userInfo = {
    ...user,
    id: profile?.id || user?.id,
    displayName: profile?.displayName || user?.displayName,
    photoURL: profile?.photoURL || user?.photoURL,
    email: profile?.email || user?.email,
    fcmToken: profile?.fcmToken || user?.fcmToken,
    expoPushToken: profile?.expoPushToken || user?.expoPushToken,
    isEmailVerified: profile?.isEmailVerified || user?.isEmailVerified,
  };

  useEffect(() => {
    _initHome();
    if (user) {
      _savePushToken();
    }
  }, [user]);

  const _initHome = useCallback(async () => {
    loadCategories();
    updateLocation();
    if (services.length === 0) {
      fetchServiceData();
    }
    if (useTopRatedStore.getState().services.length === 0) {
      loadTopRated();
    }
    if (useNewOnTimelyStore.getState().services.length === 0) {
      loadNew();
    }
  }, [loadCategories, updateLocation, fetchServiceData, services.length, loadTopRated, loadNew]);

  // Fires on every mount, including when `location` is already
  // resolved from a previous visit — unlike Flutter's BlocListener,
  // a plain useEffect doesn't skip the "already current" case.
  useEffect(() => {
    const parts = location.split(',');
    if (parts.length !== 2) return;
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      loadNearby(lat, lng);
    }
  }, [location, loadNearby]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadCategories(),
        fetchServiceData(),
        loadTopRated(),
        loadNew(),
      ]);
      // Near You re-fires via the location effect above if location changes;
      // if it's unchanged, re-trigger explicitly on refresh:
      const parts = location.split(',');
      if (parts.length === 2) {
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
          loadNearby(lat, lng);
        }
      }
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadCategories, fetchServiceData, loadTopRated, loadNew, location, loadNearby]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const distanceFromBottom =
        contentSize.height - (contentOffset.y + layoutMeasurement.height);
      if (distanceFromBottom < SCROLL_BOTTOM_THRESHOLD) {
        fetchNextPage();
      }
    },
    [fetchNextPage]
  );

  const _savePushToken = useCallback(async () => {
    if (!user || !user.uid) return;
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      if (!enabled) return;
      const fcmToken = await messaging().getToken();
      if (fcmToken) {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, { fcmToken }, { merge: true });
      }
    } catch (error) {
      console.log('Failed to save FCM token', error);
    }
  }, [user]);

  useEffect(() => {
    const unsubscribe = messaging().onTokenRefresh(async (newToken) => {
      if (user?.uid) {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, { fcmToken: newToken }, { merge: true });
      }
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    initConnectivityListener();
    setSnackbarVisible(status === 'offline');
  }, [status]);

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" />
      <ModernAppBar userInfo={userInfo} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={Platform.OS === 'ios'}
        overScrollMode="never"
        onScroll={handleScroll}
        scrollEventThrottle={200}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        <SpecialOffersCard user={userInfo} />
        <CategoriesSection user={userInfo} />
        <HorizontalServiceSection
          title="Near You"
          services={nearYouServices}
          isLoading={nearYouLoading}
        />
        <HorizontalServiceSection
          title="Top Rated"
          services={topRatedServices}
          isLoading={topRatedLoading}
        />
        <HorizontalServiceSection
          title="New on Timely"
          services={newOnTimelyServices}
          isLoading={newOnTimelyLoading}
        />
        <RecommendedSection />
      </ScrollView>

      <Snackbar
        message="You are offline. Some features may be limited."
        visible={snackbarVisible}
        duration={Infinity}
        type="info"
        onHide={() => setSnackbarVisible(false)}
      />
    </View>
  );
}

const getStyles = (theme: any) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.gray100,
      paddingBottom: 70,
    },
    listContent: { padding: 20 },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: 32,
    },
    loadingWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
      gap: 16,
    },
    loadingText: { fontSize: 15 },
  });