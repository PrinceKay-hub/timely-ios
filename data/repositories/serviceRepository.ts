// data/repositories/serviceRepository.ts
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/firebase';
import {
  geohashNeighborsAndSelf,
  geohashPrecisionForRadiusKm,
  haversineKm,
} from '@/utils/geohash'; // ADJUST to wherever you place geohash.ts

// Service type for better type safety
export interface Service {
  id: string;
  distanceKm?: number; // present only on Near You results
  [key: string]: any;
}

const servicesCollection = () => collection(db, 'services');

// If your cloud functions are deployed to a non-default region, pass it
// here to match, e.g. getFunctions(undefined, 'us-central1') — must match
// the `region` set on the getServicesPage cloud function.
const functions = getFunctions();

export const getAllServices = async (): Promise<Service[]> => {
  try {
    const q = query(
      servicesCollection(),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const snapshot = await getDocs(q);
    const services: Service[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
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

// ─── Paginated, randomized Top services (via getServicesPage cloud fn) ────
//
// Random ordering is generated server-side using a stored `randomValue`
// field on each service doc + a random `anchor` chosen once per session.
// Pagination is a stable cursor (`lastRandomValue` + `wrapped` flag) rather
// than a Firestore DocumentSnapshot, since the query itself now lives in
// the cloud function, not here.

export interface ServicesPageRequest {
  anchor: number;
  wrapped: boolean;
  lastRandomValue: number | null;
  limit: number;
}

export interface ServicesPageResponse {
  items: Service[];
  hasMore: boolean;
  wrapped: boolean;
  lastRandomValue: number | null;
}

const getServicesPageCallable = httpsCallable<
  ServicesPageRequest,
  ServicesPageResponse
>(functions, 'getServicesPage');

export const getServicesPage = async (
  params: ServicesPageRequest
): Promise<ServicesPageResponse> => {
  try {
    const result = await getServicesPageCallable(params);
    return result.data;
  } catch (e) {
    throw new Error(`Failed to get services page: ${e}`);
  }
};

// ─── Near You: geohash 3x3 cell grid + exact Haversine filter/sort ─────────

export const getNearbyServices = async ({
  latitude,
  longitude,
  radiusKm = 15,
  maxResults = 15,
}: {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  maxResults?: number;
}): Promise<Service[]> => {
  try {
    const precision = geohashPrecisionForRadiusKm(radiusKm);
    const cellHashes = geohashNeighborsAndSelf(latitude, longitude, precision);

    const queries = Array.from(cellHashes).map((prefix) =>
      getDocs(
        query(
          servicesCollection(),
          where('status', '==', 'approved'),
          where('geohash', '>=', prefix),
          where('geohash', '<=', prefix + '\uf8ff'),
          limit(25)
        )
      )
    );

    const snapshots = await Promise.all(queries);

    const seenIds = new Set<string>();
    const withDistance: { distanceKm: number; data: Service }[] = [];

    for (const snap of snapshots) {
      for (const docSnap of snap.docs) {
        if (seenIds.has(docSnap.id)) continue;
        seenIds.add(docSnap.id);

        const data = docSnap.data();
        const lat = typeof data.latitude === 'number' ? data.latitude : null;
        const lng = typeof data.longitude === 'number' ? data.longitude : null;
        if (lat === null || lng === null) continue;

        const distanceKm = haversineKm(latitude, longitude, lat, lng);
        if (distanceKm <= radiusKm) {
          withDistance.push({
            distanceKm,
            data: { id: docSnap.id, ...data, distanceKm },
          });
        }
      }
    }

    withDistance.sort((a, b) => a.distanceKm - b.distanceKm);
    return withDistance.slice(0, maxResults).map((e) => e.data);
  } catch (e) {
    throw new Error(`Failed to get nearby services: ${e}`);
  }
};

// ─── Top Rated: pool by rating, re-rank with a review-count weight ────────

export const getTopRatedServices = async ({
  poolSize = 60,
  maxResults = 15,
}: { poolSize?: number; maxResults?: number } = {}): Promise<Service[]> => {
  try {
    const q = query(
      servicesCollection(),
      where('status', '==', 'approved'),
      orderBy('rating', 'desc'),
      limit(poolSize)
    );
    const snapshot = await getDocs(q);

    const scored = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      const rating = typeof data.rating === 'number' ? data.rating : 0;
      const reviews =
        typeof data.totalReviews === 'number' ? data.totalReviews : 0;
      const confidence = Math.min(1, Math.max(0, reviews / (reviews + 20)));
      return {
        score: rating * confidence,
        data: { id: docSnap.id, ...data } as Service,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxResults).map((e) => e.data);
  } catch (e) {
    throw new Error(`Failed to get top rated services: ${e}`);
  }
};

// ─── New on Timely: most recently added approved services ─────────────────

export const getNewServices = async ({
  maxResults = 10,
}: { maxResults?: number } = {}): Promise<Service[]> => {
  try {
    const q = query(
      servicesCollection(),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc'),
      limit(maxResults)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    throw new Error(`Failed to get new services: ${e}`);
  }
};