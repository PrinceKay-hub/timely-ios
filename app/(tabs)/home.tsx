import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  StatusBar,
  RefreshControl,
  ScrollView,
  Text,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';

import { useAuthStore } from '@/stores/auth';
import messaging from '@react-native-firebase/messaging';
import { useHomeStore } from '@/stores/home';
import { useServiceDataStore } from '@/stores/serviceData';
import { useConnectivityStore, initConnectivityListener } from '@/stores/connectivityStore';
import { useTheme } from '@/providers/ThemeProvider';

import { ModernAppBar } from '../../components/mordenappbar';
import { SpecialOffersCard } from '../../components/specialofferscard';
import { CategoriesSection } from '../../components/categoriesscetion';
import { RecommendedSection } from '../../components/recommendedsection';
import { Snackbar } from '../../components/Snackbar';
import { ResultCard } from '@/components/search/ResultCard';

export default function Home() {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const colors = theme.colors;
  const { user, profile } = useAuthStore();
  const { loadCategories, updateLocation } = useHomeStore();
  const {services, fetchServiceData } = useServiceDataStore();
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
}, [loadCategories, updateLocation, fetchServiceData, services.length]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadCategories(),  fetchServiceData()]);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadCategories, fetchServiceData]);

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
      <StatusBar translucent backgroundColor="transparent"  />
      <ModernAppBar user={userInfo} />
      <ScrollView 
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={Platform.OS === 'ios'}
        overScrollMode="never"
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
        <RecommendedSection/>
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