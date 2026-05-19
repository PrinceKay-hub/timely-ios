// hooks/useAppUpdate.ts
import { useEffect, useState } from 'react';
import * as Updates from 'expo-updates';

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'error';

export const useAppUpdate = () => {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (__DEV__) return;
    if (!Updates.isEnabled) return;

    // ✅ Delay slightly so the app fully initializes before checking
    const timer = setTimeout(() => {
      checkForUpdate();
    }, 3000); // after your splash screen finishes

    return () => clearTimeout(timer);
  }, []);

  const checkForUpdate = async () => {
    try {
      setStatus('checking');
      const result = await Updates.checkForUpdateAsync();
      console.log('Update available:', result.isAvailable);

      if (result.isAvailable) {
        setStatus('available');
      } else {
        setStatus('idle');
      }
    } catch (e: any) {
      console.log('Update check error:', e.message);
      setError(e.message);
      setStatus('idle'); // ✅ Fall back to idle not error so app still works
    }
  };

  const downloadAndRestart = async () => {
    try {
      setStatus('downloading');
      await Updates.fetchUpdateAsync();
      setStatus('ready');
      setTimeout(async () => {
        await Updates.reloadAsync();
      }, 500);
    } catch (e: any) {
      setError(e.message);
      setStatus('idle');
    }
  };

  return { status, error, checkForUpdate, downloadAndRestart };
};