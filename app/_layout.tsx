import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { AuthProvider } from '@/services/AuthProvider';
import { useAuthStore } from '@/stores/auth';
import {
  initNotifications,
  onMessageListener,
  initDeviceInfo,
} from '@/services/notifications';
import { initLocation } from '@/services/location';
import { loadStoredData } from '@/services/storage';
import { configureGoogleSignIn } from '@/hooks/useGoogleAuth';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { UpdateModal } from '@/components/Updatemodal';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import messaging from '@react-native-firebase/messaging';
import { DeviceEventEmitter } from 'react-native';
import Toast from 'react-native-toast-message';
import { toastConfig } from '@/components/NotificationToast';
import {
  useNotificationSound,
  configureAudioSession,
} from '@/utils/notificationSound';
import { useChatStore } from '@/stores/chat';
import { usePresenceStore } from '@/stores/presence';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppStoreUpdateAlert } from '@/components/Appstoreupdatealert';
import {
  setPendingChat,
  broadcastPendingChat,
  onPendingChat,
} from '@/types/pendingNavigation';

SplashScreen.preventAutoHideAsync();
configureGoogleSignIn();

export default function RootLayout() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const profileLoading = useAuthStore((s) => s.profileLoading);
  const { status, downloadAndRestart } = useAppUpdate();
  const [modalDismissed, setModalDismissed] = useState(false);
  const { playNotificationSound } = useNotificationSound();
  const router = useRouter();

  // ── Hide splash ───────────────────────────────────────────────────────────
  // Wait until auth has fully settled (profileLoading === false). Hiding it
  // on mount causes a visible flash of index.tsx before the Stack mounts.
  useEffect(() => {
    if (profileLoading) return;
    SplashScreen.hideAsync();
  }, [profileLoading]);

  // ── Location + storage ────────────────────────────────────────────────────
  useEffect(() => {
    initLocation();
    loadStoredData();
  }, []);

  // ── Notification TAP handling (mount-once) ────────────────────────────────
  // Cold start  → setPendingChat()       (index.tsx will consume it)
  // Runtime tap → broadcastPendingChat() (the effect below navigates)
  // NOTE: we do NOT navigate from here. Routing is owned by index.tsx on
  // cold start, and by the onPendingChat listener on runtime taps.
  useEffect(() => {
    let cancelled = false;

    const extractChatId = (
      data: Record<string, any> | undefined
    ): string | null => {
      if (!data) return null;
      const id = data.chatId;
      if (typeof id === 'string') return id;
      if (typeof id === 'number') return String(id);
      return null;
    };

    const handleColdStart = (data: Record<string, any> | undefined) => {
      const id = extractChatId(data);
      if (id) setPendingChat(id);
    };

    const handleRuntimeTap = (data: Record<string, any> | undefined) => {
      const id = extractChatId(data);
      if (id) broadcastPendingChat(id);
    };

    // (1) Cold start from terminated state
    (async () => {
      try {
        const initial = await messaging().getInitialNotification();
        if (!cancelled && initial?.data) handleColdStart(initial.data);
      } catch (e) {
        console.warn('[notifications] getInitialNotification failed', e);
      }
    })();

    // (2) Tapped while app is backgrounded (FCM)
    const unsubOpened = messaging().onNotificationOpenedApp((msg) =>
      handleRuntimeTap(msg.data)
    );

    // (3) Tapped while app is foregrounded (expo-notifications)
    const unsubResponse =
      Notifications.addNotificationResponseReceivedListener((r) =>
        handleRuntimeTap(
          r.notification.request.content.data as Record<string, any>
        )
      );

    return () => {
      cancelled = true;
      unsubOpened();
      unsubResponse.remove();
    };
  }, []);

  // ── Runtime tap → navigate ────────────────────────────────────────────────
  // Runs for taps that happen AFTER the app is fully up. index.tsx is
  // typically unmounted at that point, so this must live in RootLayout.
  useEffect(() => {
    return onPendingChat((chatId) => {
      router.push(`/chats/${chatId}`);
    });
  }, [router]);

  // ── Chats subscription (drives the unread tab badge) ──────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = useChatStore.getState().subscribeToChats(user.uid);
    return () => unsubscribe();
  }, [user?.uid]);

  // ── Own presence ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    const stopPresence = usePresenceStore
      .getState()
      .startOwnPresence(user.uid);
    return stopPresence;
  }, [user?.uid]);

  // ── Device registration + foreground listener ────────────────────────────
  // ⚠️  initNotifications() MUST NOT call getInitialNotification() anymore.
  //     That logic now lives in the mount-once effect above. If it stays in
  //     initNotifications(), it will re-fire every time this effect re-runs.
  useEffect(() => {
    if (!user || profileLoading || !profile) return;

    configureAudioSession();
    initNotifications();
    initDeviceInfo();

    const unsubscribe = onMessageListener();

    const sub = DeviceEventEmitter.addListener(
      'foreground_notification',
      ({ title, body }) => {
        playNotificationSound();
        Toast.show({
          type: 'notification',
          text1: title,
          text2: body,
          position: 'top',
          visibilityTime: 7000,
          topOffset: 60,
        });
      }
    );

    return () => {
      unsubscribe?.();
      sub.remove();
    };
  }, [user, profile, profileLoading]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ThemeProvider>
          <SafeAreaProvider>
            <StatusBar style="auto" />
            <Stack>
              <Stack.Screen name="index"                     options={{ headerShown: false }} />
              <Stack.Screen name="(auth)"                    options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)"                    options={{ headerShown: false }} />
              <Stack.Screen name="OnboardingScreen"          options={{ headerShown: false }} />
              <Stack.Screen name="service/[id]"              options={{ headerShown: false }} />
              <Stack.Screen name="booking/[id]"              options={{ headerShown: false }} />
              <Stack.Screen name="reschedule/[id]"           options={{ headerShown: false }} />
              <Stack.Screen name="rebook/[id]"               options={{ headerShown: false }} />
              <Stack.Screen name="search/index"              options={{ headerShown: false }} />
              <Stack.Screen name="location/regions"          options={{ headerShown: false }} />
              <Stack.Screen name="search/results"            options={{ headerShown: false }} />
              <Stack.Screen name="search/categoryresults"    options={{ headerShown: false }} />
              <Stack.Screen name="portfolio/portfolioscreen" options={{ headerShown: false }} />
              <Stack.Screen name="about"                     options={{ headerShown: false }} />
              <Stack.Screen name="privacy"                   options={{ headerShown: false }} />
              <Stack.Screen name="terms"                     options={{ headerShown: false }} />
              <Stack.Screen name="tryon-viewer"              options={{ headerShown: false }} />
              <Stack.Screen name="edit-profile"              options={{ headerShown: false }} />
              <Stack.Screen name="chats/[chatId]"            options={{ headerShown: false }} />
              <Stack.Screen name="chats/chats"               options={{ headerShown: false }} />
              <Stack.Screen name="manage/registration/chat"  options={{ headerShown: false }} />
              <Stack.Screen name="manage/registration/index" options={{ headerShown: false }} />
              <Stack.Screen name="hairstyles/feedscreen"     options={{ headerShown: false }} />
              <Stack.Screen name="hairstyles/virtualtry"     options={{ headerShown: false }} />
              <Stack.Screen name="favorites"                 options={{ headerShown: false }} />
              <Stack.Screen name="shop/[productId]"          options={{ headerShown: false }} />
              <Stack.Screen name="shop/sell"                 options={{ headerShown: false }} />
              <Stack.Screen name="shop/search"               options={{ headerShown: false }} />
              <Stack.Screen name="manage-shop/index"         options={{ headerShown: false }} />
            </Stack>

            <AppStoreUpdateAlert />
            <UpdateModal
              status={status}
              onUpdate={downloadAndRestart}
              onDismiss={() => setModalDismissed(true)}
            />
            <Toast config={toastConfig} />
          </SafeAreaProvider>
        </ThemeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}