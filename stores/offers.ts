// stores/offers.ts
import { create } from 'zustand';
import { OfferModel } from '@/types/offer';
import { subscribeToActiveOffers } from '@/services/offersRepository';

type OffersStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface OffersState {
  status: OffersStatus;
  offers: OfferModel[];
  error: string | null;
  _unsubscribe: (() => void) | null;
  subscribe: () => void;
  unsubscribe: () => void;
}

export const useOffersStore = create<OffersState>((set, get) => ({
  status: 'idle',
  offers: [],
  error: null,
  _unsubscribe: null,

  subscribe: () => {
    if (get()._unsubscribe) return; // already subscribed, don't double-listen
    set({ status: 'loading' });

    const unsubscribe = subscribeToActiveOffers(
      (offers) => set({ status: 'loaded', offers, error: null }),
      (error) => set({ status: 'error', error: error.message }),
    );

    set({ _unsubscribe: unsubscribe });
  },

  unsubscribe: () => {
    get()._unsubscribe?.();
    set({ _unsubscribe: null, status: 'idle' });
  },
}));