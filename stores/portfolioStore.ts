// stores/portfolioStore.ts
import { create } from 'zustand';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, auth } from '@/firebase';
import { PortfolioImage } from '@/types/portfolio';

interface PortfolioState {
  images: PortfolioImage[];
  loading: boolean;
  error: string | null;
  unsubscribe: (() => void) | null;
  loadPortfolio: (serviceId: string) => void;            // now void, sets up listener
  addPortfolioImage: (imageFile: any, serviceId: string, serviceName: string, caption?: string) => Promise<void>;
  deletePortfolioImage: (imageId: string, imageUrl: string, serviceId: string) => Promise<void>;
  toggleLike: (serviceId: string, imageId: string) => Promise<void>;
  cleanup: () => void;                                   // to cancel listener on unmount
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  images: [],
  loading: false,
  error: null,
  unsubscribe: null,

  loadPortfolio: (serviceId) => {
    // Cancel previous subscription if any
    const { unsubscribe: prevUnsub } = get();
    if (prevUnsub) {
      prevUnsub();
      set({ unsubscribe: null });
    }

    set({ loading: true, error: null });

    const userId = auth.currentUser?.uid;
    if (!userId) {
      set({ error: 'User not authenticated', loading: false });
      return;
    }

    const portfolioRef = collection(db, 'services', serviceId, 'portfolio');
    const q = query(portfolioRef, orderBy('createdAt', 'desc'));

    // Start listening
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const images = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            imageUrl: data.imageUrl,
            createdAt: data.createdAt?.toDate() ?? new Date(),
            caption: data.caption ?? '',
            likes: data.likes ?? [],
            serviceName: data.serviceName ?? '',
          } as PortfolioImage;
        });
        set({ images, loading: false, error: null });
      },
      (error) => {
        set({ error: error.message, loading: false });
      }
    );

    set({ unsubscribe });
  },

  addPortfolioImage: async (imageFile, serviceId, serviceName, caption) => {
    set({ loading: true, error: null });
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('User not authenticated');

      const response = await fetch(imageFile.uri);
      const blob = await response.blob();

      const fileName = `${Date.now()}.jpg`;
      const storageRef = ref(storage, `providers/${userId}/portfolio/${fileName}`);
      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);

      const portfolioRef = collection(db, 'services', serviceId, 'portfolio');
      await addDoc(portfolioRef, {
        imageUrl: downloadUrl,
        createdAt: serverTimestamp(),
        caption: caption || '',
        likes: [],
        serviceName,
      });

      // No manual reload – the listener will pick up the new document automatically
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  deletePortfolioImage: async (imageId, imageUrl, serviceId) => {
    set({ loading: true, error: null });
    try {
      const storageRef = ref(storage, imageUrl);
      await deleteObject(storageRef);

      const docRef = doc(db, 'services', serviceId, 'portfolio', imageId);
      await deleteDoc(docRef);

      // Listener will reflect deletion automatically
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  toggleLike: async (serviceId, imageId) => {
    const { images } = get();
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const targetImage = images.find(img => img.id === imageId);
    if (!targetImage) return;

    const currentLikes = targetImage.likes ?? [];

    // Optimistic update
    const updatedImages = images.map(img => {
      if (img.id === imageId) {
        const isLiked = currentLikes.includes(userId);
        const newLikes = isLiked
          ? currentLikes.filter(id => id !== userId)
          : [...currentLikes, userId];
        return { ...img, likes: newLikes };
      }
      return img;
    });
    set({ images: updatedImages });

    try {
      const docRef = doc(db, 'services', serviceId, 'portfolio', imageId);
      await runTransaction(db, async (transaction) => {
        const docSnapshot = await transaction.get(docRef);
        if (!docSnapshot.exists()) return;
        const data = docSnapshot.data();
        const currentLikesInDb = (data?.likes ?? []) as string[];
        const isLiked = currentLikesInDb.includes(userId);

        if (isLiked) {
          transaction.update(docRef, {
            likes: currentLikesInDb.filter(id => id !== userId),
          });
        } else {
          transaction.update(docRef, {
            likes: [...currentLikesInDb, userId],
          });
        }
      });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  cleanup: () => {
    const { unsubscribe } = get();
    if (unsubscribe) {
      unsubscribe();
      set({ unsubscribe: null });
    }
  },
}));