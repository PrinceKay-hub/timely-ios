import { db } from '@/firebase';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';

export interface Review {
  id: string;
  providerId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: Date;
  serviceId: string;
}

export const submitReview = async ({
  providerId,
  userId,
  userName,
  rating,
  comment,
  serviceId,
}: {
  providerId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  serviceId: string;
}) => {
  const reviewData = {
    providerId,
    userId,
    userName,
    rating,
    comment,
    createdAt: Timestamp.now(),
    serviceId
  };

  const reviewsRef = collection(db, 'reviews');
  const docRef = await addDoc(reviewsRef, reviewData);

  return { id: docRef.id, ...reviewData, createdAt: reviewData.createdAt.toDate() };
};


export const fetchReviews = async (providerId: string): Promise<Review[]> => {
  const reviewsRef = collection(db, 'reviews');
  const q = query(
    reviewsRef,
    where('providerId', '==', providerId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
  })) as Review[];
};