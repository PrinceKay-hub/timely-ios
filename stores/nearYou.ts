// stores/nearYou.ts
import { create } from 'zustand';
import { getNearbyServices, Service } from '@/data/repositories/serviceRepository';

interface NearYouState {
  services: Service[];
  isLoading: boolean;
  error: string | null;
  unavailable: boolean; // no location yet / permission denied
  loadNearby: (latitude: number | null, longitude: number | null) => Promise<void>;
}

export const useNearYouStore = create<NearYouState>((set) => ({
  services: [],
  isLoading: false,
  error: null,
  unavailable: true,

  loadNearby: async (latitude, longitude) => {
    if (latitude == null || longitude == null) {
      set({ unavailable: true });
      return;
    }
    set({ isLoading: true, error: null, unavailable: false });
    try {
      const services = await getNearbyServices({ latitude, longitude });
      set({ services, isLoading: false });
    } catch (error: any) {
      // TEMP while debugging — Firestore's FAILED_PRECONDITION error
      // for a missing composite index includes a direct console link.
      console.log('NearYou.loadNearby failed:', error);
      set({ error: 'Could not load nearby services', isLoading: false });
    }
  },
}));