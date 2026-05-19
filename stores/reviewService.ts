import { create } from 'zustand';
import { submitReview, fetchReviews, Review } from '@/services/reviewService'; 

interface ReviewState {
  reviews: Review[];
  isLoading: boolean;
  error: string | null;
  createReview: (params: {
    providerId: string;
    userId: string;
    userName: string;
    rating: number;
    comment: string;
    serviceId: string;
  }) => Promise<void>;
  fetchReviews: (providerId: string) => Promise<void>;
  clearError: () => void;
}

export const useReviewStore = create<ReviewState>((set) => ({
  reviews: [],
  isLoading: false,
  error: null,

  createReview: async (params) => {
    set({ isLoading: true, error: null });
    try {
      await submitReview(params);
      // Optionally refresh reviews after submitting? Usually not needed.
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchReviews: async (providerId: string) => {
    // Prevent double loading
    set((state) => {
      if (state.isLoading) return {}; // do nothing if already loading
      return { isLoading: true, error: null };
    });

    try {
      const reviews = await fetchReviews(providerId);
      set({ reviews, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));