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
  orderBy,
  setDoc,
  arrayRemove,
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

// Delete a service (including images), and unlink it from the provider's user doc
export const deleteService = async (serviceId: string, providerId?: string) => {
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

  // Remove this service's id from the provider's user doc so the
  // `services` array on users/{uid} doesn't accumulate stale ids.
  const ownerId = providerId || data.providerId;
  if (ownerId) {
    try {
      const userDocRef = doc(db, 'users', ownerId);
      await updateDoc(userDocRef, { services: arrayRemove(serviceId) });
    } catch (e) {
      console.warn('Failed to unlink deleted service from user doc', e);
    }
  }
};

// Get a single service by id (used when deep-linking to one specific listing)
export const getServiceById = async (serviceId: string): Promise<ServiceEntity | null> => {
  const docRef = doc(db, 'services', serviceId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as ServiceEntity;
};

// Get ALL services belonging to a provider — replaces the old
// getServiceByProvider(...) which used limit(1) and assumed a provider
// could only ever have a single listing.
export const getServicesByProvider = async (providerId: string): Promise<ServiceEntity[]> => {
  const q = query(
    collection(db, 'services'),
    where('providerId', '==', providerId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ServiceEntity);
};

// Marks a user as a provider and links a new service id onto their
// account. Uses arrayUnion so multiple services accumulate instead of
// each new service overwriting the previous one's reference — this
// replaces the old `{ service: service.id }` single-field write.
// setDoc + merge is used (not updateDoc) so this can't throw if the
// users/{uid} doc doesn't exist yet for some reason.
export const linkServiceToProvider = async (providerId: string) => {
  const userDocRef = doc(db, 'users', providerId);
  await setDoc(
    userDocRef,
    {
      isProvider: true,
    },
    { merge: true }
  );
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