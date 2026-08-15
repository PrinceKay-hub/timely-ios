import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { AuthProvider } from '@/services/AuthProvider';
import { useAuthStore } from '@/stores/auth';
import { initNotifications, onMessageListener, initDeviceInfo } from '@/services/notifications';
import { initLocation } from '@/services/location';
import { loadStoredData } from '@/services/storage';
import { configureGoogleSignIn } from '@/hooks/useGoogleAuth';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { UpdateModal } from '@/components/Updatemodal';
import * as SplashScreen from 'expo-splash-screen';
import { DeviceEventEmitter } from 'react-native';
import Toast from 'react-native-toast-message';
import { toastConfig } from '@/components/NotificationToast';
import { playNotificationSound, configureAudioSession } from '@/utils/notificationSound';
import { useChatStore } from '@/stores/chat';
import { usePresenceStore } from '@/stores/presence';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppStoreUpdateAlert } from '@/components/Appstoreupdatealert';

SplashScreen.preventAutoHideAsync();
configureGoogleSignIn();

export default function RootLayout() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const profileLoading = useAuthStore((s) => s.profileLoading);
  const { status, downloadAndRestart } = useAppUpdate();
  const [modalDismissed, setModalDismissed] = useState(false);

  // ── Hide splash ───────────────────────────────────────────────────────────
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  // ── Location + storage ────────────────────────────────────────────────────
  useEffect(() => {
    initLocation();
    loadStoredData();
  }, []);


  // ── Chats subscription (drives the unread tab badge) ───────────────────────
  // Subscribed here, at the root, rather than inside the Chats screen —
  // the badge needs unread counts even when the user is on a completely
  // different tab and the Chats screen isn't mounted at all. This is now
  // the single source of truth for `chats` in the store; the Chats list
  // screen just reads it rather than subscribing again itself.
  // Gated on `user` only (not profile) since unread counts don't depend
  // on profile completeness — no reason to delay the badge on that.
  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = useChatStore.getState().subscribeToChats(user.uid);
    return () => unsubscribe();
  }, [user?.uid]);
 
  // ── Own presence (drives everyone else's "Online" / "Last seen" view of you) ──
  // Also gated on `user` only — no reason presence should wait on profile
  // completeness either. See stores/presence.ts for why this needs
  // Realtime Database rather than living in Firestore.
  useEffect(() => {
    if (!user?.uid) return;
    const stopPresence = usePresenceStore.getState().startOwnPresence(user.uid);
    return stopPresence;
  }, [user?.uid]);


  // ── Notifications ─────────────────────────────────────────────────────────
  // Gated on `profile` (not just `user`) so this never fires before
  // fetchProfile has finished creating/loading the users/{uid} doc.
  // Previously this ran the instant `user` was set, which could race
  // fetchProfile's getDoc/setDoc and cause saveDeviceInfoToFirestore's
  // merge:true write to create a bare doc first — leaving fetchProfile
  // to find "exists: true" and skip populating displayName/email/etc.
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
            <Stack.Screen name="index"                          options={{ headerShown: false }} />
            <Stack.Screen name="(auth)"                         options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)"                         options={{ headerShown: false }} />
            <Stack.Screen name="OnboardingScreen"               options={{ headerShown: false }} />
            <Stack.Screen name="service/[id]"                   options={{ headerShown: false }} />
            <Stack.Screen name="booking/[id]"                   options={{ headerShown: false }} />
            <Stack.Screen name="reschedule/[id]"                options={{ headerShown: false }} />
            <Stack.Screen name="rebook/[id]"                    options={{ headerShown: false }} />
            <Stack.Screen name="search/index"                   options={{ headerShown: false }} />
            <Stack.Screen name="location/regions"               options={{ headerShown: false }} />
            <Stack.Screen name="search/results"                 options={{ headerShown: false }} />
            <Stack.Screen name="search/categoryresults"         options={{ headerShown: false }} />
            <Stack.Screen name="portfolio/portfolioscreen"      options={{ headerShown: false }} />
            <Stack.Screen name="about"                          options={{ headerShown: false }} />
            <Stack.Screen name="privacy"                        options={{ headerShown: false }} />
            <Stack.Screen name="terms"                          options={{ headerShown: false }} />
            <Stack.Screen name="tryon-viewer"                   options={{ headerShown: false }} />
            <Stack.Screen name="edit-profile"                   options={{ headerShown: false }} />
            <Stack.Screen name="chats/[chatId]"                 options={{ headerShown: false }} />
            <Stack.Screen name="chats/chats"                    options={{ headerShown: false }} />
            <Stack.Screen name="manage/registration/chat"       options={{ headerShown: false }} />
            <Stack.Screen name="manage/registration/index"      options={{ headerShown: false }} />
            <Stack.Screen name="hairstyles/feedscreen"          options={{ headerShown: false }} />
            <Stack.Screen name="hairstyles/virtualtry"          options={{ headerShown: false }} />
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