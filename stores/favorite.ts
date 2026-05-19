import { create } from 'zustand';
import { auth, db } from '@/firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  getDoc,
} from 'firebase/firestore';

interface FavoriteState {
  favoriteIds: Set<string>;
  favoriteItems: any[]; // full service objects
  isLoading: boolean;
  error: string | null;
  // actions
  loadFavorites: () => Promise<void>;
  toggleFavorite: (itemId: string) => Promise<void>;
  loadFavoriteItems: () => Promise<() => void>; // returns unsubscribe function
  clearFavorites: () => void;
}

export const useFavoriteStore = create<FavoriteState>((set, get) => {
  // Internal subscription reference (not stored in state)
  let unsubscribeItems: (() => void) | null = null;

  const getFavoritesRef = (userId: string) =>
    collection(db, 'users', userId, 'favorites');

  const getServiceDocRef = (serviceId: string) =>
    doc(db, 'services', serviceId);

  return {
    favoriteIds: new Set(),
    favoriteItems: [],
    isLoading: false,
    error: null,

    // Load only the set of favorite IDs (used for quick checks)
    loadFavorites: async () => {
      const user = auth.currentUser;
      if (!user) {
        set({ favoriteIds: new Set(), isLoading: false });
        return;
      }
      set({ isLoading: true });
      try {
        const favRef = getFavoritesRef(user.uid);
        const snapshot = await getDocs(favRef);
        const ids = new Set(snapshot.docs.map(doc => doc.id));
        set({ favoriteIds: ids, isLoading: false });
      } catch (error: any) {
        set({ error: error.message, isLoading: false });
      }
    },

    // Toggle favorite with optimistic update
    toggleFavorite: async (itemId: string) => {
      const user = auth.currentUser;
      if (!user) {
        set({ error: 'User not authenticated' });
        return;
      }

      const favDocRef = doc(getFavoritesRef(user.uid), itemId);
      const currentIds = new Set(get().favoriteIds);
      const wasFavorite = currentIds.has(itemId);

      // Optimistic update
      const newIds = new Set(currentIds);
      if (wasFavorite) {
        newIds.delete(itemId);
      } else {
        newIds.add(itemId);
      }
      set({ favoriteIds: newIds, error: null });

      try {
        if (wasFavorite) {
          await deleteDoc(favDocRef);
        } else {
          await setDoc(favDocRef, {
            itemId,
            timestamp: new Date(),
          });
        }
      } catch (error: any) {
        // Revert on error
        const revertIds = new Set(get().favoriteIds);
        if (wasFavorite) {
          revertIds.add(itemId);
        } else {
          revertIds.delete(itemId);
        }
        set({ favoriteIds: revertIds, error: error.message });
      }
    },

    // Load full favorite items (for Favorites screen) and subscribe to updates
    loadFavoriteItems: async () => {
      const user = auth.currentUser;
      if (!user) {
        set({ favoriteItems: [], isLoading: false });
        return () => {};
      }

      set({ isLoading: true, error: null });

      // Clean up previous subscription
      if (unsubscribeItems) {
        unsubscribeItems();
        unsubscribeItems = null;
      }

      const favRef = query(getFavoritesRef(user.uid), orderBy('timestamp', 'desc'));

      // Set up snapshot listener
      unsubscribeItems = onSnapshot(
        favRef,
        async (snapshot) => {
          // For each favorite document, fetch the corresponding service
          const servicePromises = snapshot.docs.map(async (docSnap) => {
            const serviceId = docSnap.id;
            const serviceDoc = await getDoc(getServiceDocRef(serviceId));
            if (serviceDoc.exists()) {
              return { id: serviceId, ...serviceDoc.data() };
            }
            return null;
          });

          const items = (await Promise.all(servicePromises)).filter(Boolean);
          set({ favoriteItems: items, isLoading: false });
        },
        (error) => {
          set({ error: error.message, isLoading: false });
        }
      );

      // Return the unsubscribe function so components can clean up
      return () => {
        if (unsubscribeItems) {
          unsubscribeItems();
          unsubscribeItems = null;
        }
      };
    },

    clearFavorites: () => {
      if (unsubscribeItems) {
        unsubscribeItems();
        unsubscribeItems = null;
      }
      set({ favoriteIds: new Set(), favoriteItems: [], isLoading: false, error: null });
    },
  };
});