import React, { useEffect, useState, useMemo } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, StatusBar, FlatList, ActivityIndicator,
  Alert, Share,
} from "react-native";
import { useRouter } from "expo-router";
import { getFirestore, collection, query, orderBy, onSnapshot, deleteDoc, where, doc, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { app } from "@/firebase";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { Image } from 'expo-image';
import GalleryWidget from "@/components/Gallerywidget";

const { width } = Dimensions.get("window");
const db = getFirestore(app);

interface TryOnRecord {
  id: string;
  imageUrl: string;
  styleName: string;
  category: string;
  savedAt: any;
}

export default function TryOnViewerScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [history, setHistory] = useState<TryOnRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<TryOnRecord | null>(null);

  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    const uid = getAuth(app).currentUser?.uid;
    if (!uid) return;

    const q = query(
      collection(db, "users", uid, "tryOnHistory"),
      orderBy("savedAt", "desc"),
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as TryOnRecord[];
      setHistory(data);
      setLoading(false);
    });

    return unsub;
  }, []);


  const deleteImage = async ( imageUrl: string) => {
    const uid = getAuth(app).currentUser?.uid;
    if (!uid) return;
    setLoading(true);
    try {

      const q = query(
        collection(db, "users", uid, "tryOnHistory"),
        where("imageUrl", "==", imageUrl)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        console.warn("No matching try-on history found");
        return;
      }

      const deletions = snapshot.docs.map((d: { id: string; }) => deleteDoc(doc(db, "users", uid, "tryOnHistory", d.id)));
      await Promise.all(deletions);

      // Listener will reflect deletion automatically
      setLoading(false);
    } catch (error: any) {
      setLoading(false);
      console.error("Error deleting image:", error);
      Alert.alert("Error", "Failed to delete the image. Please try again.");
    }
  };

  const handleShare = async (imageUrl: string) => {
    try {
      await Share.share({
        message: `Check out my new hairstyle from Timely! 💇‍♀️`,
        url: imageUrl, // iOS only
      });
    } catch (e) {
      console.error("Share error:", e);
    }
  };

  const handleDelete = (image: any) => {
    console.log("Attempting to delete image:", image.imageUrl);
    Alert.alert(
      'Delete Image',
      'Are you sure you want to remove this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteImage(image.imageUrl),
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: '#fff' }]}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Try-On History</Text>
      </View>

      {history.length === 0 ? (
        <View style={[styles.centered, { backgroundColor: colors.background }]}>
          <Text style={styles.emptyIcon}>💇‍♀️</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No saved looks yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Try on a hairstyle and save your favourite looks here
          </Text>
          <TouchableOpacity
            style={[styles.ctaBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.ctaBtnText}>Try a Style</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.tile, { backgroundColor: colors.card || colors.surface }]}
              activeOpacity={0.85}
              onPress={() => {
                setGalleryIndex(item.id ? history.findIndex(h => h.id === item.id) : 0);
                setGalleryVisible(true);
              }}
             onLongPress={() => handleDelete(item)}
            >
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.tileImage}
                contentFit="cover"
                transition={200}
                placeholder={colors.surface || '#f3f4f6'}
              />
              <View style={[styles.tileOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                <Text style={styles.tileName} numberOfLines={1}>
                  {item.styleName}
                </Text>
                <Text style={styles.tileCategory} numberOfLines={1}>
                  {item.category}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {galleryVisible && (
        <GalleryWidget
          images={history.map((item) => item.imageUrl)}
          index={galleryIndex}
          onClose={() => setGalleryVisible(false)}
        />
      )}

    </View>
  );
}

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },

    // Header
    header: {
      paddingTop: 50,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      paddingBottom: 12,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
    },
    backButton: {
      borderRadius: 20,
      padding: 8,
      marginRight: 16,
    },
    backBtn: { padding: 8 },
    backText: { color: "#fff", fontSize: 15, fontWeight: "600" },
    headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },

    // Empty state
    emptyIcon: { fontSize: 56, marginBottom: 16 },
    emptyTitle: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
    emptySubtitle: {
      fontSize: 14,
      textAlign: "center",
      paddingHorizontal: 40,
      marginBottom: 24,
    },
    ctaBtn: {
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 32,
    },
    ctaBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

    // Grid
    grid: { padding: 12 },
    row: { justifyContent: "space-between", marginBottom: 12 },
    tile: {
      width: (width - 36) / 2,
      height: (width - 36) / 2 * 1.3,
      borderRadius: 16,
      overflow: "hidden",
    },
    tileImage: { width: "100%", height: "100%" },
    tileOverlay: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: 10,
    },
    tileName: { color: "#fff", fontSize: 13, fontWeight: "700" },
    tileCategory: { color: "#ccc", fontSize: 11, marginTop: 2 },

    // Modal – stays dark for image viewing
    modalContainer: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)" },
    modalHeader: {
      paddingTop: 60,
      paddingBottom: 16,
      paddingHorizontal: 20,
      flexDirection: "row",
      alignItems: "center",
    },
    modalCloseBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: "center",
      alignItems: "center",
    },
    modalCloseText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    modalTitleBlock: { flex: 1, alignItems: "center" },
    modalTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
    modalSubtitle: { color: "#aaa", fontSize: 12, marginTop: 2 },
    shareBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
    },
    shareBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
    fullImage: { flex: 1, width: "100%" },
  });