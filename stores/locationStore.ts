import { create } from 'zustand';
import { fetchAllRegions } from '@/services/locationService';

interface LocationState {
  locations: Map<string, string[]>;
  isLoading: boolean;
  error: string | null;
  fetchLocations: () => Promise<void>;
}

export const useLocationStore = create<LocationState>((set) => ({
  locations: new Map(),
  isLoading: false,
  error: null,

  fetchLocations: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await fetchAllRegions();
      set({ locations: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },
}));