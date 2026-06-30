import { create } from 'zustand';
import { serviceCatalogRepository } from '@/data/repositories/serviceCatalogRepository';

interface ServiceCatalogState {
  serviceCatalog: string[];
  serviceCatalogError: string | null;
  isLoadingServiceCatalog: boolean;
  loadServiceCatalog: () => Promise<void>;
}

export const useServiceCatalogStore = create<ServiceCatalogState>((set, get) => ({
  serviceCatalog: [],
  serviceCatalogError: null,
  isLoadingServiceCatalog: false,

  loadServiceCatalog: async () => {
    // Avoid refetching if we already have data
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
