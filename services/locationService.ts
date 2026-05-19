import { db } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';

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