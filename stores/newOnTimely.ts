// stores/newOnTimely.ts
import { create } from 'zustand';
import { getNewServices, Service } from '@/data/repositories/serviceRepository';

interface NewOnTimelyState {
  services: Service[];
  isLoading: boolean;
  error: string | null;
  loadNew: () => Promise<void>;
}

export const useNewOnTimelyStore = create<NewOnTimelyState>((set) => ({
  services: [],
  isLoading: false,
  error: null,

  loadNew: async () => {
    set({ isLoading: true, error: null });
    try {
      const services = await getNewServices();
      set({ services, isLoading: false });
    } catch (error: any) {
      set({ error: 'Could not load new providers', isLoading: false });
    }
  },
}));