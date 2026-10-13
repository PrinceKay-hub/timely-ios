import { db } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import * as Location from "expo-location";

/**
 * Fetches all regions and their districts from Firestore.
 * Expected document structure:
 *   - name: string (region name)
 *   - districts: array of strings
 */
export const fetchAllRegions = async (): Promise<Map<string, string[]>> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'regions'));
    const locationsData = new Map<string, string[]>();
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const name = data.name as string;
      const districts = data.districts as string[];
      locationsData.set(name, districts);
    });
    return locationsData;
  } catch (e) {
    throw new Error(`Failed to fetch regions: ${e}`);
  }
};



export async function getAddressFromCoordinates(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    const p = results[0];
    if (!p) return null;

    // Prefer the pre-formatted address when the platform provides it
    if (p.formattedAddress) return p.formattedAddress;

    const parts = [
      p.city,
      p.region,
    ].filter((part): part is string => !!part && part.trim().length > 0);

    return parts.length ? parts.join(", ") : null;
  } catch (e) {
    console.log("Reverse geocoding failed", e);
    return null;
  }
}

export async function getAddressFromLatLng(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    const p = results[0];
    if (!p) return null;

    // Prefer the pre-formatted address when the platform provides it
    if (p.formattedAddress) return p.formattedAddress;

    const parts = [
      p.district,
      p.city,
      p.region,
      p.country,
    ].filter((part): part is string => !!part && part.trim().length > 0);

    return parts.length ? parts.join(", ") : null;
  } catch (e) {
    console.log("Reverse geocoding failed", e);
    return null;
  }
}