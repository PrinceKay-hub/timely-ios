import { useCallback, useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getFirestore,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { Product, ProductCategory } from "../types/product";

const PAGE_SIZE = 20;

export function useProducts(category: ProductCategory | "all") {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const buildQuery = useCallback(
    (after?: QueryDocumentSnapshot | null) => {
      const db = getFirestore();
      const base = collection(db, "products");
      const constraints = [
        where("status", "==", "active"),
        ...(category !== "all" ? [where("category", "==", category)] : []),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE),
      ];
      return after
        ? query(base, ...constraints, startAfter(after))
        : query(base, ...constraints);
    },
    [category]
  );

  const load = useCallback(
    async (mode: "initial" | "refresh" | "more") => {
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      if (mode === "more") setLoadingMore(true);

      try {
        const snap = await getDocs(
          buildQuery(mode === "more" ? lastDoc : null)
        );
        const docs = snap.docs.map((d) => d.data() as Product);

        setProducts((prev) => (mode === "more" ? [...prev, ...docs] : docs));
        setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
        setHasMore(snap.docs.length === PAGE_SIZE);
      } catch (err) {
        console.error("Failed to load products:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [buildQuery, lastDoc]
  );

  useEffect(() => {
    setLastDoc(null);
    load("initial");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  return {
    products,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    refresh: () => load("refresh"),
    loadMore: () => hasMore && !loadingMore && load("more"),
  };
}