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
            <Stack.Screen name="manage/registration/index"      options={{ headerShown: false }} />
            <Stack.Screen name="portfolio/portfolioscreen"      options={{ headerShown: false }} />
            <Stack.Screen name="about"                          options={{ headerShown: false }} />
            <Stack.Screen name="privacy"                        options={{ headerShown: false }} />
            <Stack.Screen name="terms"                          options={{ headerShown: false }} />
            <Stack.Screen name="manage/registration/chat"       options={{ headerShown: false }} />
            <Stack.Screen name="tryon-viewer"                   options={{ headerShown: false }} />
            <Stack.Screen name="edit-profile"                   options={{ headerShown: false }} />
          </Stack>

          <UpdateModal
            status={status}
            onUpdate={downloadAndRestart}
            onDismiss={() => setModalDismissed(true)}
          />
          <Toast config={toastConfig} />
        </SafeAreaProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}