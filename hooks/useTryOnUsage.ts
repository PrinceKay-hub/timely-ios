// hooks/useTryOnUsage.ts
import { useState, useEffect } from "react";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { app } from "@/firebase";

const db = getFirestore(app);
const DAILY_LIMIT = 3;

export function useTryOnUsage() {
  const [usedToday, setUsedToday] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = getAuth(app).currentUser?.uid;
    if (!uid) return;

    const today = new Date().toISOString().split("T")[0];
    const ref = doc(db, "tryOnUsage", uid, "daily", today);

    const unsub = onSnapshot(ref, (snap) => {
      setUsedToday(snap.exists() ? snap.data().count : 0);
      setLoading(false);
    });

    return unsub;
  }, []);

  return {
    usedToday,
    remaining: DAILY_LIMIT - usedToday,
    limitReached: usedToday >= DAILY_LIMIT,
    loading,
  };
}