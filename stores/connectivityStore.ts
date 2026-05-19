// stores/connectivityStore.ts
import { create } from 'zustand';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export type ConnectivityStatus = 'online' | 'offline' | 'unknown';

interface ConnectivityState {
  status: ConnectivityStatus;
  checkConnectivity: () => Promise<void>;
}

export const useConnectivityStore = create<ConnectivityState>((set) => ({
  status: 'unknown',
  checkConnectivity: async () => {
    const state = await NetInfo.fetch();
    const isConnected = state.isConnected ?? false;
    set({ status: isConnected ? 'online' : 'offline' });
  },
}));

// Subscribe to changes (run once in your app's root)
let unsubscribe: (() => void) | null = null;

export const initConnectivityListener = () => {
  if (unsubscribe) return; // already subscribed

  unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    const isConnected = state.isConnected ?? false;
    useConnectivityStore.setState({ status: isConnected ? 'online' : 'offline' });
  });

  // Check initial status
  useConnectivityStore.getState().checkConnectivity();
};

// Optional: cleanup function
export const cleanupConnectivityListener = () => {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
};