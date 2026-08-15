import { create } from 'zustand';
import { searchProviders, searchByCategory, SearchParams } from '@/services/searchService';

interface SearchState {
  results: any[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  page: number;
  totalCount: number;
  hasMore: boolean;
  lastParams: Omit<SearchParams, 'maxDistanceKm' | 'sortBy' | 'page' | 'pageSize'> | null;
  fetchSearchResults: (
    params: Omit<SearchParams, 'maxDistanceKm' | 'sortBy' | 'page' | 'pageSize'>
  ) => Promise<void>;
  loadMoreResults: () => Promise<void>;
  searchByCategoryAction: (category: string) => Promise<void>;
  clearResults: () => void;
}

// Monotonically increasing ID used to discard stale responses from
// superseded requests (fixes a race where a slow earlier search could
// overwrite the results of a faster, more recent one).
let currentRequestId = 0;

export const useSearchStore = create<SearchState>((set, get) => ({
  results: [],
  isLoading: false,
  isLoadingMore: false,
  error: null,
  page: 1,
  totalCount: 0,
  hasMore: false,
  lastParams: null,

  fetchSearchResults: async (params) => {
    const requestId = ++currentRequestId;
    set({ isLoading: true, error: null, page: 1 });
    try {
      const { providers, hasMore, totalCount } = await searchProviders({ ...params, page: 1 });
      if (requestId !== currentRequestId) return;
      set({
        results: providers,
        isLoading: false,
        hasMore,
        totalCount,
        lastParams: params,
      });
    } catch (err: any) {
      if (requestId !== currentRequestId) return;
      set({ error: err.message, isLoading: false });
    }
  },

  loadMoreResults: async () => {
    const { isLoadingMore, hasMore, page, results, lastParams } = get();
    if (isLoadingMore || !hasMore || !lastParams) return;

    const requestId = ++currentRequestId;
    set({ isLoadingMore: true });
    try {
      const nextPage = page + 1;
      const { providers, hasMore: more, totalCount } = await searchProviders({
        ...lastParams,
        page: nextPage,
      });
      if (requestId !== currentRequestId) return;
      set({
        results: [...results, ...providers],
        page: nextPage,
        hasMore: more,
        totalCount,
        isLoadingMore: false,
      });
    } catch (err: any) {
      if (requestId !== currentRequestId) return;
      set({ error: err.message, isLoadingMore: false });
    }
  },

  searchByCategoryAction: async (category: string) => {
    const requestId = ++currentRequestId;
    set({ isLoading: true, error: null, page: 1 });
    try {
      const { providers, hasMore, totalCount } = await searchByCategory({ category, page: 1 });
      if (requestId !== currentRequestId) return;
      set({ results: providers, isLoading: false, hasMore, totalCount });
    } catch (err: any) {
      if (requestId !== currentRequestId) return;
      set({ error: err.message, isLoading: false });
    }
  },

  clearResults: () =>
    set({
      results: [],
      error: null,
      isLoading: false,
      isLoadingMore: false,
      page: 1,
      totalCount: 0,
      hasMore: false,
      lastParams: null,
    }),
}));