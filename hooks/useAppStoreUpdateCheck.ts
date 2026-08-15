import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Application from 'expo-application';

const MANIFEST_URL =
  'https://raw.githubusercontent.com/PrinceKay-hub/timely-ios/main/app-version.json';

type PlatformVersionInfo = {
  version: string;
  url: string;
  releaseNotes?: string;
  minVersion?: string;
  critical?: boolean;
};

type Manifest = {
  android: PlatformVersionInfo;
  ios: PlatformVersionInfo;
};

export type UpdateCheckResult = {
  loading: boolean;
  updateAvailable: boolean;
  forceUpdate: boolean;
  storeUrl: string | null;
  latestVersion: string | null;
  releaseNotes: string | null;
};

// Compares two "x.y.z" version strings. Returns true if `a` > `b`.
function isVersionGreater(a: string, b: string): boolean {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na > nb) return true;
    if (na < nb) return false;
  }
  return false;
}

export function useAppStoreUpdateCheck(): UpdateCheckResult {
  const [result, setResult] = useState<UpdateCheckResult>({
    loading: true,
    updateAvailable: false,
    forceUpdate: false,
    storeUrl: null,
    latestVersion: null,
    releaseNotes: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const response = await fetch(MANIFEST_URL);
        if (!response.ok) throw new Error(`Manifest fetch failed: ${response.status}`);

        const data: Manifest = await response.json();
        const platformKey = Platform.OS === 'ios' ? 'ios' : 'android';
        const platformInfo = data[platformKey];

        const installedVersion = Application.nativeApplicationVersion ?? '0.0.0';

        const updateAvailable = isVersionGreater(platformInfo.version, installedVersion);
        const forceUpdate = platformInfo.minVersion
          ? isVersionGreater(platformInfo.minVersion, installedVersion)
          : false;

        if (!cancelled) {
          setResult({
            loading: false,
            updateAvailable: updateAvailable || forceUpdate,
            forceUpdate,
            storeUrl: platformInfo.url,
            latestVersion: platformInfo.version,
            releaseNotes: platformInfo.releaseNotes ?? null,
          });
        }
      } catch (err) {
        // Fail closed: don't nag the user if the check itself fails.
        if (!cancelled) {
          setResult((prev) => ({ ...prev, loading: false }));
        }
        console.warn('App update check failed:', err);
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  return result;
}