import { create } from 'zustand';
import { db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface ServiceListState {
  serviceList: string[];
  fetchServiceList: () => Promise<void>;
}

export const useServiceListStore = create<ServiceListState>((set) => ({
  serviceList: [],
  fetchServiceList: async () => {
    try {
      const docRef = doc(db, 'categories', 'serviceList');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const list = data.services || [];
        set({ serviceList: list });
      }
    } catch (error) {
      console.error('Failed to fetch service list', error);
    }
  },
}));