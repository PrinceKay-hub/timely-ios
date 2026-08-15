// services/hairstyleService.ts
import { db } from '@/firebase';
import { collection, query, orderBy, limit, startAfter, getDocs, DocumentSnapshot, DocumentData } from 'firebase/firestore';

export interface Hairstyle {
  id: string;
  name: string;
  category: string;
  images: {
    thumb: string;
    card: string;
    full: string;
  };
  styleId?: string;
  createdAt?: any;
}

const PAGE_SIZE = 5;

export const fetchHairstyles = async (
  lastDoc: DocumentSnapshot<DocumentData> | null = null
): Promise<{
  hairstyles: Hairstyle[];
  lastDoc: DocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}> => {
  try {
    let q = query(
      collection(db, 'timelyHairstyles'),
      orderBy('createdAt', 'desc'),
      limit(PAGE_SIZE)
    );

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const snapshot = await getDocs(q);
    const hairstyles = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Hairstyle, 'id'>),
    }));

    const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
    const hasMore = snapshot.docs.length === PAGE_SIZE;

    return { hairstyles, lastDoc: newLastDoc, hasMore };
  } catch (error) {
    console.error('Error fetching hairstyles:', error);
    throw error;
  }
};

// Add this to your existing services/hairstyleService.ts
// It sits alongside your existing paginated `fetchHairstyles` — this one is
// for the Collections view, which needs the full catalog client-side in
// order to group by category and count each collection.


export async function fetchAllHairstyles(): Promise<Hairstyle[]> {
  const q = query(collection(db, 'timelyHairstyles'), orderBy('category'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<Hairstyle, 'id'>),
  }));
}

// Note: if your catalog grows into the thousands, this will start to feel
// heavy on load. At that point, the fix isn't to paginate this call (that
// breaks "show me every collection with an accurate count") — it's to
// maintain a small `categories` collection in Firestore, written whenever
// sync.js runs, with { category, count, coverImage } per category. Then
// Collections mode reads that tiny doc instead of the whole catalog, and
// only fetchHairstylesByCategory(category) pulls the full style list once
// a collection is opened.