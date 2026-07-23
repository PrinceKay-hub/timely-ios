import { getFunctions, httpsCallable } from 'firebase/functions';
import * as Location from 'expo-location';
import { app } from '@/firebase'; // adjust path

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

/**
 * Calls the Firebase Cloud Function 'searchProviders' with the user's current location.
 */
export const searchProviders = async (params: SearchParams): Promise<any[]> => {
  try {

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission required');
    }
    const location = await Location.getCurrentPositionAsync({});
    const userLat = location.coords.latitude;
    const userLng = location.coords.longitude;

    const searchFn = httpsCallable(functions, 'searchProviders');
    const result = await searchFn({
      query: params.query,
      region: params.region,
      district: params.district,
      userLat,
      userLng,
      maxDistanceKm: params.maxDistanceKm ?? 10,
      sortBy: params.sortBy ?? 'distance',
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
    });
    const data = result.data as any;
    return data.providers || [];
  } catch (error) {
    console.error('Search error details:', error);
    throw error; // This will be caught by the store
  }
};




// Simple location cache
let cachedPosition: Location.LocationObject | null = null;
let lastLocationUpdate: number | null = null;
const LOCATION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in ms

async function getUserLocation(forceRefresh = false): Promise<Location.LocationObject> {
  const now = Date.now();
  if (
    !forceRefresh &&
    cachedPosition &&
    lastLocationUpdate &&
    now - lastLocationUpdate < LOCATION_CACHE_DURATION
  ) {
    return cachedPosition;
  }

  // Check if location services are enabled
  const serviceEnabled = await Location.hasServicesEnabledAsync();
  if (!serviceEnabled) {
    throw new Error('Location services are disabled.');
  }

  // Request permissions
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission is required to search nearby services.');
  }

  // Get current position
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  // Cache it
  cachedPosition = position;
  lastLocationUpdate = now;

  return position;
}

export interface SearchByCategoryParams {
  category: string;
  maxDistanceKm?: number;
  sortBy?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Searches providers by category using a Firebase Cloud Function.
 * Returns an array of provider objects.
 */
export const searchByCategory = async ({
  category,
  maxDistanceKm = 10,
  sortBy = 'distance',
  page = 1,
  pageSize = 20,
}: SearchByCategoryParams): Promise<any[]> => {
  try {
    // Get user location (cached)
    const userPosition = await getUserLocation();
    const userLat = userPosition.coords.latitude;
    const userLng = userPosition.coords.longitude;

    const functions = getFunctions(app);
    const searchFn = httpsCallable(functions, 'searchByCategory');
    const result = await searchFn({
      category,
      userLat,
      userLng,
      maxDistanceKm,
      sortBy,
      page,
      pageSize,
    });

    const data = result.data as any;
    // Expecting the cloud function to return { providers: [...] }
    return data.providers || [];
  } catch (error) {
    console.error('Error in searchByCategory:', error);
    throw error; // rethrow so the caller can handle it
  }
};