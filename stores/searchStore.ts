import { create } from 'zustand';
import { searchProviders, SearchParams, searchByCategory } from '@/services/searchService';

interface SearchState {
  results: any[];
  isLoading: boolean;
  error: string | null;
  fetchSearchResults: (params: Omit<SearchParams, 'maxDistanceKm' | 'sortBy' | 'page' | 'pageSize'>) => Promise<void>;
  searchByCategoryAction: (category: string) => Promise<void>;
  clearResults: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  results: [],
  isLoading: false,
  error: null,
  fetchSearchResults: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const providers = await searchProviders(params);
      set({ results: providers, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },
  searchByCategoryAction: async (category: string) => {
    set({ isLoading: true, error: null });
    try {
      const providers = await searchByCategory({ category });
      set({ results: providers, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },
  clearResults: () => set({ results: [], error: null }),
}));