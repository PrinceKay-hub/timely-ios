// serviceCatalogStore.ts
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { serviceCatalogRepository } from '@/data/repositories/serviceCatalogRepository';

const CACHE_KEY = 'serviceCatalog'; // must match the repository’s key

interface ServiceCatalogState {
  serviceCatalog: string[];
  serviceCatalogError: string | null;
  isLoadingServiceCatalog: boolean;

  // Listener management
  _unsubscribeServiceCatalog: (() => void) | null;

  // Start listening – sets up the real‑time stream
  startListeningServiceCatalog: () => void;
  // Stop listening – cleans up the subscription
  stopListeningServiceCatalog: () => void;

  // Optional: one‑time load (kept for compatibility)
  loadServiceCatalog: () => Promise<void>;
}

export const useServiceCatalogStore = create<ServiceCatalogState>((set, get) => ({
  serviceCatalog: [],
  serviceCatalogError: null,
  isLoadingServiceCatalog: false,

  _unsubscribeServiceCatalog: null,

  startListeningServiceCatalog: () => {
    // Avoid duplicate listeners
    if (get()._unsubscribeServiceCatalog) {
      return;
    }

    set({ isLoadingServiceCatalog: true, serviceCatalogError: null });

    // Optionally, load from cache immediately (fast initial display)
    const loadFromCache = async () => {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            set({ serviceCatalog: parsed });
          }
        }
      } catch (e) {
        // ignore cache errors
      }
    };
    loadFromCache();

    // Start the Firestore listener
    const unsubscribe = serviceCatalogRepository.listenToServiceCatalog(
      (services) => {
        set({
          serviceCatalog: services,
          isLoadingServiceCatalog: false,
          serviceCatalogError: null,
        });
      },
      (error) => {
        set({
          serviceCatalogError: String(error),
          isLoadingServiceCatalog: false,
        });
      }
    );

    set({ _unsubscribeServiceCatalog: unsubscribe });
  },

  stopListeningServiceCatalog: () => {
    const unsubscribe = get()._unsubscribeServiceCatalog;
    if (unsubscribe) {
      unsubscribe();
      set({ _unsubscribeServiceCatalog: null });
    }
  },

  // One‑time fetch (kept for backward compatibility)
  loadServiceCatalog: async () => {
    if (get().serviceCatalog.length > 0) return;
    set({ isLoadingServiceCatalog: true, serviceCatalogError: null });
    try {
      const services = await serviceCatalogRepository.fetchServiceCatalog();
      set({ serviceCatalog: services, isLoadingServiceCatalog: false });
    } catch (e) {
      set({ serviceCatalogError: String(e), isLoadingServiceCatalog: false });
    }
  },
}));