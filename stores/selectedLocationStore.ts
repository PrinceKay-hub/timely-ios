import { create } from 'zustand';

interface SelectedLocationState {
  selectedLocation: string;
  setSelectedLocation: (location: string) => void;
}

export const useSelectedLocationStore = create<SelectedLocationState>((set) => ({
  selectedLocation: 'Select Location',
  setSelectedLocation: (location) => set({ selectedLocation: location }),
}));