import React, { useEffect, useState, useMemo } from "react";
import {
  View, Image, Text, TouchableOpacity, StyleSheet,
  Dimensions, StatusBar, FlatList, ActivityIndicator,
  Modal, Share,
} from "react-native";
import { useRouter } from "expo-router";
import { getFirestore, collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { app } from "@/firebase";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");
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
        <Text style={styles.headerTitle}>My Looks</Text>
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
              onPress={() => setSelectedImage(item)}
              activeOpacity={0.85}
            >
              <Image source={{ uri: item.imageUrl }} style={styles.tileImage} />
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

      {/* Full Screen Modal */}
      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setSelectedImage(null)}
              style={[styles.modalCloseBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.modalTitleBlock}>
              <Text style={styles.modalTitle}>{selectedImage?.styleName}</Text>
              <Text style={styles.modalSubtitle}>{selectedImage?.category}</Text>
            </View>
            <TouchableOpacity
              style={[styles.shareBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
              onPress={() => selectedImage && handleShare(selectedImage.imageUrl)}
            >
              <Text style={styles.shareBtnText}>Share</Text>
            </TouchableOpacity>
          </View>

          {/* Full Image */}
          {selectedImage && (
            <Image
              source={{ uri: selectedImage.imageUrl }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}

          {/* Bottom actions
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.bookNowBtn}
              onPress={() => {
                setSelectedImage(null);
                // Navigate to booking with style pre-selected
                // router.push({ pathname: "/booking", params: { style: selectedImage?.styleName } });
              }}
            >
              <Text style={styles.bookNowText}>💅 Book This Style</Text>
            </TouchableOpacity>
            
          </View>
           */}
        </View>
      </Modal>
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