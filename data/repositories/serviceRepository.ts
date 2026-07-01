// services/serviceRepository.ts
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

// Service type for better type safety
export interface Service {
  id: string;
  [key: string]: any; 
}

export const getAllServices = async (): Promise<Service[]> => {
  try {
    const serviceCollection = collection(db, 'services'); 
    const q = query(
      serviceCollection,
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    const snapshot = await getDocs(q);
    const services: Service[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return services;
  } catch (e) {
    throw new Error(`Failed to get all services: ${e}`);
  }
};

export const getServiceById = async (serviceId: string) => {
  try {
    const docRef = doc(db, 'services', serviceId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) throw new Error('Service not found');
    return { id: docSnap.id, ...docSnap.data() };
  } catch (e) {
    throw new Error(`Failed to get service: ${e}`);
  }
};