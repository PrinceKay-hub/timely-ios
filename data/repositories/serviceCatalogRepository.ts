// lib/repositories/serviceCatalogRepository.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/firebase'; // adjust import to your firebase setup
import { doc, getDoc } from 'firebase/firestore';

const CACHE_KEY = 'serviceCatalog';

export class ServiceCatalogRepository {
  /**
   * Fetch the master list of service names from cache or Firestore.
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
}

export const serviceCatalogRepository = new ServiceCatalogRepository();
