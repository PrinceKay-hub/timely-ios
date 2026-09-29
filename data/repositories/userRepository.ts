
import { auth, db } from "@/firebase";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

export const userRepository = {
  async saveLocation(params: {
    latitude: number;
    longitude: number;
    address: string | null;
  }): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not signed in");

    await setDoc(
      doc(db, "users", uid),
      {
        location: {
          latitude: params.latitude,
          longitude: params.longitude,
          address: params.address,
          updatedAt: serverTimestamp(),
        },
      },
      { merge: true }
    );
  },
};