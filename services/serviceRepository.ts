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
    const response = await fetch(file);
    const blob = await response.blob();
    const filename = `service_images/${userId}/${Date.now()}.jpg`;
    const storageRef = ref(storage, filename);
    await uploadBytes(storageRef, blob);
    const url = await getDownloadURL(storageRef);
    urls.push(url);
  }
  return urls;
};