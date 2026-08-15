// services/searchService.ts

import { getFunctions, httpsCallable } from 'firebase/functions';
import * as Location from 'expo-location';
import { app } from '@/firebase';
import { AppError, mapLocationError, mapSearchError } from '@/utils/errorMapper';

const functions = getFunctions(app);

export interface SearchParams {
  query: string;
  region: string;
  district?: string;
  maxDistanceKm?: number;
  sortBy?: string;
  page?: number;
  pageSize?: number;
}

export interface SearchByCategoryParams {
  category: string;
  maxDistanceKm?: number;
  sortBy?: string;
  page?: number;
  pageSize?: number;
}

export interface SearchResponse {
  providers: any[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ─── Shared location fetching ───────────────────────────────────────────────

let cachedPosition: Location.LocationObject | null = null;
let lastLocationUpdate: number | null = null;
const LOCATION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getUserLocation(forceRefresh = false): Promise<Location.LocationObject> {
  const now = Date.now();
  if (
    !forceRefresh &&
    cachedPosition &&
    lastLocationUpdate &&
    now - lastLocationUpdate < LOCATION_CACHE_DURATION
  ) {
    return cachedPosition;
  }

  try {
    const serviceEnabled = await Location.hasServicesEnabledAsync();
    if (!serviceEnabled) {
      throw new AppError(
        'Turn on location services to find providers near you.',
        'location-service-disabled'
      );
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new AppError(
        'Location access is needed to search nearby. Please allow it and try again.',
        'location-permission-denied'
      );
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      timeout: 10000, // 10 seconds
    });

    cachedPosition = position;
    lastLocationUpdate = now;
    return position;
  } catch (error) {
    // Re‑throw as a friendly AppError (if not already)
    throw mapLocationError(error);
  }
}

// ─── Search functions ───────────────────────────────────────────────────────

export const searchProviders = async (params: SearchParams): Promise<SearchResponse> => {
  try {
    const position = await getUserLocation();

    const searchFn = httpsCallable(functions, 'searchProviders');
    const result = await searchFn({
      query: params.query,
      region: params.region,
      district: params.district,
      userLat: position.coords.latitude,
      userLng: position.coords.longitude,
      maxDistanceKm: params.maxDistanceKm ?? 10,
      sortBy: params.sortBy ?? 'distance',
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
    });

    const data = result.data as SearchResponse;
    return {
      providers: data.providers || [],
      totalCount: data.totalCount ?? 0,
      page: data.page ?? params.page ?? 1,
      pageSize: data.pageSize ?? params.pageSize ?? 20,
      hasMore: data.hasMore ?? false,
    };
  } catch (error) {
    console.error('Search error details:', error);
    throw mapSearchError(error);
  }
};

export const searchByCategory = async ({
  category,
  maxDistanceKm = 10,
  sortBy = 'distance',
  page = 1,
  pageSize = 20,
}: SearchByCategoryParams): Promise<SearchResponse> => {
  try {
    const position = await getUserLocation();

    const searchFn = httpsCallable(functions, 'searchByCategory');
    const result = await searchFn({
      category,
      userLat: position.coords.latitude,
      userLng: position.coords.longitude,
      maxDistanceKm,
      sortBy,
      page,
      pageSize,
    });

    const data = result.data as SearchResponse;
    return {
      providers: data.providers || [],
      totalCount: data.totalCount ?? 0,
      page: data.page ?? page,
      pageSize: data.pageSize ?? pageSize,
      hasMore: data.hasMore ?? false,
    };
  } catch (error) {
    console.error('Error in searchByCategory:', error);
    throw mapSearchError(error);
  }
};