import { useEffect, useRef } from 'react';
import { Alert, Linking } from 'react-native';
import { useAppStoreUpdateCheck } from '@/hooks/useAppStoreUpdateCheck'; 

export function AppStoreUpdateAlert() {
  const { loading, updateAvailable, forceUpdate, storeUrl, latestVersion, releaseNotes } =
    useAppStoreUpdateCheck();

  const hasShown = useRef(false);

  useEffect(() => {
    if (loading || !updateAvailable || !storeUrl || hasShown.current) return;
    hasShown.current = true;

    const buttons = forceUpdate
      ? [
          {
            text: 'Update Now',
            onPress: () => Linking.openURL(storeUrl),
          },
        ]
      : [
          { text: 'Later', style: 'cancel' as const },
          {
            text: 'Update Now',
            onPress: () => Linking.openURL(storeUrl),
          },
        ];

    Alert.alert(
      forceUpdate ? 'Update Required' : 'Update Available',
      `Version ${latestVersion} is available.${
        releaseNotes ? `\n\n${releaseNotes}` : ''
      }`,
      buttons,
      { cancelable: !forceUpdate },
    );
  }, [loading, updateAvailable, forceUpdate, storeUrl, latestVersion, releaseNotes]);

  return null; // renders nothing itself, just triggers the native Alert
}