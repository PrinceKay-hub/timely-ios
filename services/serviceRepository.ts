import { db, storage } from '@/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import * as ImageManipulator from 'expo-image-manipulator';
import { ServiceEntity } from '@/types/service';

// Create a new service
export const createService = async (service: ServiceEntity): Promise<string> => {
  const { id, ...data } = service;
  const docRef = await addDoc(collection(db, 'services'), {
    ...data,
    createdAt: new Date(),
  });
  await updateDoc(docRef, { id: docRef.id });
  return docRef.id;
};

// Update a service
export const updateService = async (serviceId: string, data: Partial<ServiceEntity>) => {
  const docRef = doc(db, 'services', serviceId);
  await updateDoc(docRef, data);
};

// Delete a service (including images)
export const deleteService = async (serviceId: string) => {
  const docRef = doc(db, 'services', serviceId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return;
  const data = snap.data();
  const imageUrls = data.images || [];
  // Delete images from Storage
  for (const url of imageUrls) {
    try {
      const imageRef = ref(storage, url);
      await deleteObject(imageRef);
    } catch (e) {
      console.warn('Failed to delete image', e);
    }
  }
  await deleteDoc(docRef);
};

// Get service by provider (assumes at most one)
export const getServiceByProvider = async (providerId: string): Promise<ServiceEntity | null> => {
  const q = query(collection(db, 'services'), where('providerId', '==', providerId), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as ServiceEntity;
};

// Upload multiple images to Storage
export const uploadServiceImages = async (imageFiles: string[], userId: string): Promise<string[]> => {
  const urls: string[] = [];
  for (const file of imageFiles) {
    try {
      // Convert to real JPEG bytes first. This is necessary because:
      // 1. iOS photo library images are often HEIC by default (Expo SDK 54+
      //    skips auto-conversion unless allowsEditing is true), and
      //    fetch(uri).blob() on HEIC files is unreliable in React Native —
      //    it can produce an empty/malformed blob that uploadBytes then
      //    fails to send, surfacing as a generic storage/unknown error.
      // 2. HEIC isn't viewable in most browsers, on Android, or on Windows —
      //    these listings need to render for every customer, not just
      //    iPhone users with Safari.
      const manipulated = await ImageManipulator.manipulateAsync(
        file,
        [],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );

      const response = await fetch(manipulated.uri);
      const blob = await response.blob();
      // Must match the storage.rules path: service_images/{providerId}/**
      const filename = `service_images/${userId}/${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
      const url = await getDownloadURL(storageRef);
      urls.push(url);
    } catch (e: any) {
      // Log the real cause instead of letting it surface only as
      // a generic "storage/unknown" with no context.
      console.error('Image upload failed:', {
        file,
        code: e?.code,
        message: e?.message,
        serverResponse: e?.customData?.serverResponse,
      });
      throw e;
    }
  }
  return urls;
};