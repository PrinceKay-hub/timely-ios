import { getApp } from '@react-native-firebase/app';
import {
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
  setBackgroundMessageHandler,
  onNotificationOpenedApp,
  getInitialNotification,
  FirebaseMessagingTypes,
} from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { auth } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { DeviceEventEmitter } from "react-native";
import * as Device from "expo-device";
import { router } from "expo-router";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

let hasNavigated = false;

// Single shared messaging instance
const messagingInstance = getMessaging(getApp());

// Request permissions and get FCM token
export const requestUserPermission = async () => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    console.log("Notification permission not granted");
    return false;
  }
  return true;
};

// Get FCM token
export const getFCMToken = async (): Promise<string | null> => {
  try {
    const token = await getToken(messagingInstance);
    return token;
  } catch (error) {
    console.log("Error fetching FCM token:", error);
    return null;
  }
};

// Save token to Firestore
export const saveFCMTokenToFirestore = async (
  userId: string,
  token: string,
) => {
  try {
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, { fcmToken: token }, { merge: true });
  } catch (error) {
    console.log("Error saving token to Firestore:", error);
  }
};

// Save token to Firestore
export const saveDeviceInfoToFirestore = async (userId: string) => {
  try {
    const userRef = doc(db, "users", userId);
    const deviceData = {
      model: Device.modelName,
      manufacturer: Device.manufacturer,
      brand: Device.brand,
      osVersion: Device.osVersion,
      modelId: Device.modelId,
      isPhysicalDevice: Device.isDevice,
      deviceType: "iOS",
    };
    await setDoc(userRef, { deviceInfo: deviceData }, { merge: true });
  } catch (error) {
    console.log("Error saving token to Firestore:", error);
  }
};

// ─── Navigation helper ──────────────────────────────
const navigateToChat = (chatId: string) => {
  if (!chatId || hasNavigated) return;
  hasNavigated = true;
  router.push(`/chats/${chatId}`);
  // Reset after a short delay to allow future notifications
  setTimeout(() => { hasNavigated = false; }, 1000);
};

// Safely extract chatId from notification data
const getChatId = (data: Record<string, any> | undefined): string | null => {
  if (!data) return null;
  const id = data.chatId;
  if (typeof id === 'string') return id;
  if (typeof id === 'number') return id.toString();
  return null;
};

// Foreground message handler
export const onMessageListener = () => {
  return onMessage(messagingInstance, async (remoteMessage) => {
    const { title, body } = remoteMessage.notification || {};
    if (!title && !body) return;

    // Emit event to be picked up by Toast handler in UI
    DeviceEventEmitter.emit("foreground_notification", { title, body });
  });
};

// Token refresh listener
export const onTokenRefreshListener = () => {
  return onTokenRefresh(messagingInstance, async (newToken) => {
    console.log("Token refreshed:", newToken);
    const user = auth.currentUser;
    if (user) {
      await saveFCMTokenToFirestore(user.uid, newToken);
    }
  });
};

// Background message handler
export const setupBackgroundMessageHandler = () => {
  setBackgroundMessageHandler(messagingInstance, async (remoteMessage) => {
    console.log("Message handled in the background!", remoteMessage);
    // Optional: schedule a local notification if needed
  });
};

export const initDeviceInfo = async () => {
  const user = auth.currentUser;
  if (user) {
    await saveDeviceInfoToFirestore(user.uid);
  }
};

// Initialize
export const initNotifications = async () => {
  const permissionGranted = await requestUserPermission();
  if (!permissionGranted) return;

  // Create Android notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
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

  // Optional: set up token refresh listener
  const unsubscribeTokenRefresh = onTokenRefreshListener();

  // ─── 1) App opened from a notification (background state) ──
  const unsubscribeOpenedApp = onNotificationOpenedApp(
    messagingInstance,
    (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
      const chatId = getChatId(remoteMessage.data);
      if (chatId) navigateToChat(chatId);
    }
  );

  // ─── 2) App launched from terminated state ──────────
  const initialMessage = await getInitialNotification(messagingInstance);
  if (initialMessage) {
    const chatId = getChatId(initialMessage.data);
    if (chatId) {
      // Delay to ensure the app is fully mounted
      setTimeout(() => navigateToChat(chatId), 300);
    }
  }

  // Return a cleanup function that unsubscribes all listeners
  return () => {
    if (unsubscribeTokenRefresh) unsubscribeTokenRefresh();
    if (unsubscribeOpenedApp) unsubscribeOpenedApp();
    // If you have other subscriptions, cancel them here
  };
};