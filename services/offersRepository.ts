// services/offersRepository.ts
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { OfferModel, offerFromFirestore } from '@/types/offer';

export const subscribeToActiveOffers = (
  onData: (offers: OfferModel[]) => void,
  onError: (error: Error) => void,
) => {
    const offersQuery = query(
    collection(db, 'banners'),
    where('isActive', '==', true),
    orderBy('order')
  );

  return onSnapshot(
    offersQuery,
    (snapshot) => {
      const offers = snapshot.docs
    .map((doc) => offerFromFirestore(doc.data()))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      onData(offers);
    },
    (error) => onError(error),
  );
};