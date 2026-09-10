// stores/serviceData.ts
import { create } from 'zustand';
import {
  getServiceById,
  getServicesPage,
  Service,
} from '@/data/repositories/serviceRepository';

const PAGE_SIZE = 20;
const MAX_TOTAL_SERVICES = 60;

interface ServiceDataState {
  services: Service[];
  currentService: Service | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  _anchor: number | null;
  _wrapped: boolean;
  _lastRandomValue: number | null;

  fetchServiceData: () => Promise<void>;
  fetchNextPage: () => Promise<void>;
  fetchServiceById: (id: string) => Promise<void>;
  clearCurrentService: () => void;
}

export const useServiceDataStore = create<ServiceDataState>((set, get) => ({
  services: [],
  currentService: null,
  isLoading: false,
  isLoadingMore: false,
  hasMore: true,
  error: null,
  _anchor: null,
  _wrapped: false,
  _lastRandomValue: null,

  // Loads the first page. Call on pull-to-refresh too — picks a fresh
  // random anchor, so the order is reshuffled on every full reload.
  fetchServiceData: async () => {
    const anchor = Math.random();
    set({
      isLoading: true,
      error: null,
      _anchor: anchor,
      _wrapped: false,
      _lastRandomValue: null,
    });
    try {
      const { items, hasMore, wrapped, lastRandomValue } = await getServicesPage({
        anchor,
        wrapped: false,
        lastRandomValue: null,
        limit: PAGE_SIZE,
      });
      set({
        services: items,
        hasMore,
        isLoading: false,
        _wrapped: wrapped,
        _lastRandomValue: lastRandomValue,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Called when the outer ScrollView nears the bottom (see Home.tsx).
  fetchNextPage: async () => {
    const { hasMore, isLoadingMore, _anchor, _wrapped, _lastRandomValue, services } =
      get();
    if (!hasMore || isLoadingMore || _anchor === null) return;

    set({ isLoadingMore: true });
    try {
      const remaining = MAX_TOTAL_SERVICES - services.length;
      const take = Math.min(remaining, PAGE_SIZE);
      if (take <= 0) {
        set({ isLoadingMore: false, hasMore: false });
        return;
      }

      const { items, hasMore, wrapped, lastRandomValue } = await getServicesPage({
        anchor: _anchor,
        wrapped: _wrapped,
        lastRandomValue: _lastRandomValue,
        limit: take,
      });

      const combined = [...services, ...items];
      set({
        services: combined,
        hasMore: combined.length < MAX_TOTAL_SERVICES && hasMore,
        isLoadingMore: false,
        _wrapped: wrapped,
        _lastRandomValue: lastRandomValue,
      });
    } catch (error: any) {
      // Keep existing data visible, just stop the spinner.
      set({ isLoadingMore: false });
    }
  },

  fetchServiceById: async (id: string) => {
    set({ isLoading: true, error: null, currentService: null });
    if (!id) {
      set({ error: 'No service ID provided', isLoading: false });
      return;
    }
    try {
      const service = await getServiceById(id);
      set({ currentService: service as Service, isLoading: false });
    } catch (error: any) {
      console.log('fetchServiceById failed, error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  clearCurrentService: () => set({ currentService: null, error: null }),
}));