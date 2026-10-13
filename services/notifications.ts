// services/notifications.ts
import { getApp } from '@react-native-firebase/app';
import {
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
  setBackgroundMessageHandler,
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { Platform, DeviceEventEmitter } from 'react-native';
import { auth, db } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import * as Device from 'expo-device';
import { acceptCall, handleCallPushData } from './callService';

// ── Notification handler ──────────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Custom push keys can appear in content.data or in the raw payload
    const trigger = notification.request.trigger as
      | { payload?: Record<string, unknown> }
      | null;
    const data = notification.request.content.data as
      | Record<string, unknown>
      | undefined;
    const type = data?.type ?? trigger?.payload?.type;

    if (type === 'incoming_call') {
      return {
        shouldShowBanner: false,
        shouldShowList: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
      };
    }
    return {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

// Single shared messaging instance
const messagingInstance = getMessaging(getApp());

// ── Permissions ───────────────────────────────────────────────────────────
export const requestUserPermission = async () => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('Notification permission not granted');
    return false;
  }
  return true;
};

// ── FCM token ─────────────────────────────────────────────────────────────
export const getFCMToken = async (): Promise<string | null> => {
  try {
    return await getToken(messagingInstance);
  } catch (error) {
    console.log('Error fetching FCM token:', error);
    return null;
  }
};

export const saveFCMTokenToFirestore = async (
  userId: string,
  token: string,
) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { fcmToken: token }, { merge: true });
  } catch (error) {
    console.log('Error saving token to Firestore:', error);
  }
};

// ── Device info ───────────────────────────────────────────────────────────
export const saveDeviceInfoToFirestore = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const deviceData = {
      model: Device.modelName,
      manufacturer: Device.manufacturer,
      brand: Device.brand,
      osVersion: Device.osVersion,
      modelId: Device.modelId,
      isPhysicalDevice: Device.isDevice,
      deviceType: Platform.OS === 'ios' ? 'iOS' : 'Android',
    };
    await setDoc(userRef, { deviceInfo: deviceData }, { merge: true });
  } catch (error) {
    console.log('Error saving device info to Firestore:', error);
  }
};

export const initDeviceInfo = async () => {
  const user = auth.currentUser;
  if (user) {
    await saveDeviceInfoToFirestore(user.uid);
  }
};

// ── Foreground message handler ────────────────────────────────────────────
// Emits an event that RootLayout's toast listener picks up.
// Navigation for taps is handled in RootLayout — this only fires while the
// app is in the foreground and the user has NOT tapped anything.
export const onMessageListener = () => {
  return onMessage(messagingInstance, async (remoteMessage) => {
    if (handleCallPushData(remoteMessage.data)) return;
    const data = remoteMessage.data;
    if (data?.type === 'incoming_call' && typeof data.callId === 'string') {
      // TEMP for testing: auto-accept. Step 3 replaces this with the CallKit screen.
      void acceptCall(data.callId, (data.callerName as string) ?? undefined);
      return;
    }
    if (data?.type === 'call_cancelled') return;
    const { title, body } = remoteMessage.notification || {};
    if (!title && !body) return;

    DeviceEventEmitter.emit('foreground_notification', { title, body });
  });
};

// ── Token refresh ─────────────────────────────────────────────────────────
export const onTokenRefreshListener = () => {
  return onTokenRefresh(messagingInstance, async (newToken) => {
    console.log('Token refreshed:', newToken);
    const user = auth.currentUser;
    if (user) {
      await saveFCMTokenToFirestore(user.uid, newToken);
    }
  });
};

// ── Background message handler ────────────────────────────────────────────
// Runs when a data message arrives while the app is in background/killed.
// Do NOT navigate or touch the router here — there is no navigation context.
export const setupBackgroundMessageHandler = () => {
  setBackgroundMessageHandler(messagingInstance, async (remoteMessage) => {
    console.log('Message handled in the background!', remoteMessage);
    // Optional: update badge count for a specific chat, schedule local
    // notifications, etc. Routing is handled on next app open via
    // getInitialNotification in RootLayout.
  });
};

// ── Badge helpers ─────────────────────────────────────────────────────────
export const clearAll = async () => {
  await Notifications.setBadgeCountAsync(0);
  await Notifications.dismissAllNotificationsAsync();
};

// ── Init ──────────────────────────────────────────────────────────────────
//
// ⚠️ IMPORTANT: this function NO LONGER subscribes to
//    getInitialNotification() or onNotificationOpenedApp(). Those handlers
//    now live in RootLayout as a mount-once effect, because:
//
//      1. They must run BEFORE the Stack mounts / index.tsx redirects,
//         not after profile loads (which is when this effect runs).
//      2. Running them here caused them to re-fire every time the
//         profile-gated effect in RootLayout re-ran, producing duplicate
//         navigation events.
//
//    If you re-add them here, the cold-start notification tap will race
//    index.tsx's 3-second redirect and the chat screen will get replaced
//    by the home tabs.
//
export const initNotifications = async () => {
  const permissionGranted = await requestUserPermission();
  if (!permissionGranted) return;

  // Create Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  const token = await getFCMToken();
  if (token) {
    const user = auth.currentUser;
    if (user) {
      await saveFCMTokenToFirestore(user.uid, token);
    }
  }

  setupBackgroundMessageHandler();

  const unsubscribeTokenRefresh = onTokenRefreshListener();

  return () => {
    if (unsubscribeTokenRefresh) unsubscribeTokenRefresh();
  };
};