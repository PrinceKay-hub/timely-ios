
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

const CACHE_KEY = 'serviceCatalog';

export class ServiceCatalogRepository {
  /**
   * One‑time fetch (kept for backward compatibility)
   * Returns a promise that resolves to an array of service name strings.
   */
  async fetchServiceCatalog(): Promise<string[]> {
    // 1. Try to get from cache
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed.filter((item) => typeof item === 'string');
        }
      }
    } catch (e) {
      console.warn('Cache read error, clearing:', e);
      await AsyncStorage.removeItem(CACHE_KEY);
    }

    // 2. Fetch from Firestore
    try {
      const docRef = doc(db, 'categories', 'serviceList');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const rawList = data?.services;

        if (Array.isArray(rawList)) {
          const services = rawList.map((s: any) => String(s));
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(services));
          return services;
        }
        return [];
      }
      return [];
    } catch (e) {
      console.error('Firestore fetch failed:', e);

      // 3. If Firestore fails, try fallback cache again
      try {
        const fallback = await AsyncStorage.getItem(CACHE_KEY);
        if (fallback) {
          const parsed = JSON.parse(fallback);
          if (Array.isArray(parsed)) {
            return parsed.filter((item) => typeof item === 'string');
          }
        }
      } catch (fallbackError) {
        throw e;
      }

      throw e;
    }
  }

  /**
   * Sets up a real‑time listener on the Firestore document.
   * @param callback Called whenever the list changes (includes initial data).
   * @param onError Optional error callback.
   * @returns Unsubscribe function.
   */
  listenToServiceCatalog(
    callback: (services: string[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    const docRef = doc(db, 'categories', 'serviceList');

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const rawList = data?.services;
          let services: string[] = [];

          if (Array.isArray(rawList)) {
            services = rawList.map((s: any) => String(s));
          }

          // Update cache in the background
          AsyncStorage.setItem(CACHE_KEY, JSON.stringify(services)).catch(
            (e) => console.warn('Cache update failed:', e)
          );

          callback(services);
        } else {
          // Document doesn't exist → empty list
          callback([]);
        }
      },
      (error) => {
        console.error('Firestore listener error:', error);
        if (onError) {
          onError(error);
        } else {
          // Default: propagate empty list or handle gracefully
          callback([]);
        }
      }
    );

    return unsubscribe;
  }
}

export const serviceCatalogRepository = new ServiceCatalogRepository();