import {
    getAllServices,
    getServiceById,
    Service,
} from "@/data/repositories/serviceRepository";
import { create } from "zustand";

interface ServiceDataState {
  // For listing multiple services
  services: Service[];
  // For a single service detail
  currentService: Service | null;
  isLoading: boolean;
  error: string | null;
  fetchServiceData: () => Promise<void>;
  fetchServiceById: (id: string) => Promise<void>;
  clearCurrentService: () => void;
}

export const useServiceDataStore = create<ServiceDataState>((set) => ({
  services: [],
  currentService: null,
  isLoading: false,
  error: null,

  fetchServiceData: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await getAllServices();
      set({ services: data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchServiceById: async (id: string) => {
    set({ isLoading: true, error: null, currentService: null });
    if (!id) {
      set({ error: "No service ID provided", isLoading: false });
      return;
    }
    try {
      const service = await getServiceById(id);
      set({ currentService: service, isLoading: false });
    } catch (error: any) {
      console.log("fetchServiceById failed, error:", error);
      set({ error: error.message, isLoading: false });
    }
  },

  clearCurrentService: () => set({ currentService: null, error: null }),
}));
