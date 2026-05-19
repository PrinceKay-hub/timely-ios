// lib/repositories/categoryRepository.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/firebase'; // adjust import to your firebase setup
import { doc, getDoc } from 'firebase/firestore';

const CACHE_KEY = 'categories';

// You can define a more specific type if your categories have a known shape
export type Category = Record<string, any>;

export class CategoryRepository {
  /**
   * Fetch categories from cache or Firestore.
   * Returns a promise that resolves to an array of Category objects.
   */
  async fetchCategories(): Promise<Category[]> {
    // 1. Try to get from cache
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          // Validate each item is an object (optional)
          return parsed.filter(item => item && typeof item === 'object');
        }
      }
    } catch (e) {
      // If cache is corrupted (invalid JSON), delete it and proceed
      console.warn('Cache read error, clearing:', e);
      await AsyncStorage.removeItem(CACHE_KEY);
    }

    // 2. Fetch from Firestore
    try {
      const docRef = doc(db, 'categories', 'main');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const rawList = data?.category;

        if (Array.isArray(rawList)) {
          // Ensure each item is an object (Firestore usually returns plain objects)
          const categories = rawList.filter(item => item && typeof item === 'object');
          // Save to cache
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(categories));
          return categories;
        }
        // If field exists but is not an array, return empty or handle as needed
        return [];
      }
      return [];
    } catch (e) {
      console.error('Firestore fetch failed:', e);

      // 3. If Firestore fails, try fallback cache again (in case previous attempt was corrupted)
      try {
        const fallback = await AsyncStorage.getItem(CACHE_KEY);
        if (fallback) {
          const parsed = JSON.parse(fallback);
          if (Array.isArray(parsed)) {
            return parsed.filter(item => item && typeof item === 'object');
          }
        }
      } catch (fallbackError) {
        // If even fallback fails, throw original error
        throw e;
      }

      // If fallback didn't work, rethrow original error
      throw e;
    }
  }
}

// Optional: export a singleton instance
export const categoryRepository = new CategoryRepository();