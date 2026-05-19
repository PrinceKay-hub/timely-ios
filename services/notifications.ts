import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { auth } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { DeviceEventEmitter } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Request permissions and get FCM token
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

// Get FCM token
export const getFCMToken = async (): Promise<string | null> => {
  try {
    const token = await messaging().getToken();
    return token;
  } catch (error) {
    console.log('Error fetching FCM token:', error);
    return null;
  }
};

// Save token to Firestore
export const saveFCMTokenToFirestore = async (userId: string, token: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { fcmToken: token }, { merge: true });
  } catch (error) {
    console.log('Error saving token to Firestore:', error);
  }
};

// Foreground message handler
export const onMessageListener = () => {
  return messaging().onMessage(async (remoteMessage) => {
    const { title, body } = remoteMessage.notification || {};
    if (!title && !body) return;

    // Emit event to be picked up by Toast handler in UI
    DeviceEventEmitter.emit('foreground_notification', { title, body });
  });
};


// Token refresh listener
export const onTokenRefreshListener = () => {
  return messaging().onTokenRefresh(async (newToken) => {
    console.log('Token refreshed:', newToken);
    const user = auth.currentUser;
    if (user) {
      await saveFCMTokenToFirestore(user.uid, newToken);
    }
  });
};

// Background message handler
export const setBackgroundMessageHandler = () => {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('Message handled in the background!', remoteMessage);
    // Optional: schedule a local notification if needed
  });
};

// Initialize
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

  setBackgroundMessageHandler();

  // Optional: set up token refresh listener
  const unsubscribeTokenRefresh = onTokenRefreshListener();

  return () => {
    if (unsubscribeTokenRefresh) unsubscribeTokenRefresh();
  };
};