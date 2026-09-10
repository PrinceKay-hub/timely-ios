// stores/topRated.ts
import { create } from 'zustand';
import { getTopRatedServices, Service } from '@/data/repositories/serviceRepository';

interface TopRatedState {
  services: Service[];
  isLoading: boolean;
  error: string | null;
  loadTopRated: () => Promise<void>;
}

export const useTopRatedStore = create<TopRatedState>((set) => ({
  services: [],
  isLoading: false,
  error: null,

  loadTopRated: async () => {
    set({ isLoading: true, error: null });
    try {
      const services = await getTopRatedServices();
      set({ services, isLoading: false });
    } catch (error: any) {
      set({ error: 'Could not load top rated services', isLoading: false });
    }
  },
}));