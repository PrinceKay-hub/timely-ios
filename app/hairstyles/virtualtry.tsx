import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, Alert, Dimensions, Modal, Share,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirestore, collection, query, where, orderBy, onSnapshot, doc, limit, getDocs, } from "firebase/firestore";
import { app } from "@/firebase";
import { useTheme } from "@/providers/ThemeProvider";
import { useRouter } from "expo-router";
import { useTryOnUsage } from "@/hooks/useTryOnUsage";
import { getAuth } from "firebase/auth";
import { Image } from 'expo-image';
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/auth";

const functions = getFunctions(app);
const db = getFirestore(app);

const { width } = Dimensions.get("window");
const TILE_SIZE = (width - 48) / 3;

interface HairstyleOption {
  id: string;
  name: string;
  targetHairstyle?: string;
  hairColor?: string;
  category: string;
  imageUrl: string;
  gender?: "male" | "female";
  type?: "hairstyle" | "haircut";
  order?: number;
  isCustom?: boolean;
  base64?: string;
}

export default function VirtualTryOnScreen() {
  const { user} = useAuthStore();
  const router = useRouter();
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);

  // Custom hairstyle base64 & option state
  const [selectedStyle, setSelectedStyle] = useState<HairstyleOption | null>(null);
  const [customHairBase64, setCustomHairBase64] = useState<string | null>(null);

  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [gender, setGender] = useState<"female" | "male">("female");
  const [styleType, setStyleType] = useState<"hairstyle" | "haircut">("hairstyle");
  const [hairstyles, setHairstyles] = useState<HairstyleOption[]>([]);
  const [loadingStyles, setLoadingStyles] = useState(true);
  const { remaining, limitReached, usedToday } = useTryOnUsage();
  const [saved, setSaved] = useState(false);
  const [fullScreenVisible, setFullScreenVisible] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);

  // Fetch hairstyles from Firestore based on gender + type
  useEffect(() => {
    setLoadingStyles(true);
    setActiveCategory("All");
    setSelectedStyle(null);
    setResultUrl(null);

    const q = query(
      collection(db, "hairstyles"),
      where("gender", "==", gender),
      where("type", "==", styleType),
      orderBy("order")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as HairstyleOption[];
      setHairstyles(data);
      setLoadingStyles(false);
    }, (error) => {
      console.error("Firestore error:", error);
      setLoadingStyles(false);
    });

    return unsub;
  }, [gender, styleType]);


  // -------------------------------------------------------------
  // RESTORE STATE ON MOUNT
  // -------------------------------------------------------------
  useEffect(() => {
    if (!user.uid) return;

    let unsubPending: (() => void) | null = null;
    let unsubHistory: (() => void) | null = null;

    const restoreSession = async () => {
      try {
        // 1. Check if there is an in-flight pending task for this user
        const pendingSnap = await getDocs(
          query(
            collection(db, "users", user.uid, "pendingTryOns"),
            where("status", "==", "PROCESSING"),
            orderBy("createdAt", "desc"),
            limit(1)
          )
        );

        if (!pendingSnap.empty) {
          const pendingDoc = pendingSnap.docs[0];
          const pendingData = pendingDoc.data();
          const targetRequestId = pendingData.requestId;

          // Resume loading state & set active request ID
          setLoading(true);
          setActiveRequestId(targetRequestId);

          // Listen for job completion in tryOnHistory
          unsubHistory = onSnapshot(
            query(
              collection(db, "users", user.uid, "tryOnHistory"),
              where("requestId", "==", targetRequestId)
            ),
            (snapshot) => {
              if (!snapshot.empty) {
                const resultDoc = snapshot.docs[0].data();
                if (resultDoc.imageUrl) {
                  setResultUrl(resultDoc.imageUrl);
                  setLoading(false);
                  if (unsubPending) unsubPending();
                  if (unsubHistory) unsubHistory();
                }
              }
            }
          );

          // Listen for job failure in pendingTryOns
          unsubPending = onSnapshot(
            doc(db, "users", user.uid, "pendingTryOns", targetRequestId),
            (docSnap) => {
              if (docSnap.exists() && docSnap.data()?.status === "FAILED") {
                setLoading(false);
                Alert.alert("Try-On Failed", docSnap.data()?.error || "Generation failed.");
                if (unsubPending) unsubPending();
                if (unsubHistory) unsubHistory();
              }
            }
          );
        } else {
          // 2. No pending task — load the user's latest generated image (if available)
          const historySnap = await getDocs(
            query(
              collection(db, "users", user.uid, "tryOnHistory"),
              orderBy("savedAt", "desc"),
              limit(1)
            )
          );

          if (!historySnap.empty) {
            const latestDoc = historySnap.docs[0].data();
            setResultUrl(latestDoc.imageUrl);
          }
        }
      } catch (err) {
        console.error("Error restoring try-on state:", err);
      }
    };

    restoreSession();

    return () => {
      if (unsubPending) unsubPending();
      if (unsubHistory) unsubHistory();
    };
  }, [user.uid]);

  const categories = ["All", ...Array.from(new Set(hairstyles.map((h) => h.category)))];

  const filteredStyles = activeCategory === "All"
    ? hairstyles
    : hairstyles.filter((h) => h.category === activeCategory);

  const pickUserImage = async (source: "camera" | "gallery") => {
    if (source === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please allow camera access.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.85,
        base64: true,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setImageBase64(result.assets[0].base64 ?? null);
        setResultUrl(null);
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please allow photo access.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images',],
        quality: 0.85,
        base64: true,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setImageBase64(result.assets[0].base64 ?? null);
        setResultUrl(null);
      }
    }
  };

  const pickCustomHairstyleImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow photo access.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images',],
      quality: 0.85,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const customOption: HairstyleOption = {
        id: "custom_upload",
        name: "Custom Reference",
        category: "Custom",
        imageUrl: result.assets[0].uri,
        isCustom: true,
        base64: result.assets[0].base64 ?? undefined,
      };
      setCustomHairBase64(result.assets[0].base64 ?? null);
      setSelectedStyle(customOption);
      setResultUrl(null);
    }
  };

  const showImageSourceSheet = () => {
    Alert.alert(
      "Upload your photo",
      "Choose a source",
      [
        { text: "📷 Take a photo", onPress: () => pickUserImage("camera") },
        { text: "🖼️ Choose from gallery", onPress: () => pickUserImage("gallery") },
        { text: "Cancel", style: "cancel" },
      ],
      { cancelable: true }
    );
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


  const runTryOn = async () => {
    // 1. Guard check for required base image and style selection
    if (!imageBase64 || !selectedStyle) {
      Alert.alert("Missing Information", "Please select both a base photo and a hairstyle.");
      return;
    }

    const auth = getAuth(app);
    const uid = auth.currentUser?.uid;

    if (!uid) {
      Alert.alert("Authentication Error", "You must be logged in to try on hairstyles.");
      return;
    }

    setLoading(true);

    try {
      // 2. Resolve reference hairstyle base64 (Custom upload vs. Preset URL)
      let hairstyleBase64 = customHairBase64;

      if (!selectedStyle.isCustom) {
        try {
          const response = await fetch(selectedStyle.imageUrl);
          const blob = await response.blob();
          hairstyleBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (err) {
          setLoading(false);
          Alert.alert("Error", "Could not process selected hairstyle image.");
          return;
        }
      }

      if (!hairstyleBase64) {
        setLoading(false);
        Alert.alert("Error", "Hairstyle image data is missing.");
        return;
      }

      // 3. Call Cloud Function to submit job to fal.ai Queue
      const virtualHairstyleTryOn = httpsCallable(functions, "virtualHairstyleFalSegmindTryOn");

      const response = await virtualHairstyleTryOn({
        userImageBase64: imageBase64,
        hairstyleImageBase64: hairstyleBase64,
        styleName: selectedStyle.name,
        category: selectedStyle.category,
      });

      const data = response.data as {
        success: boolean;
        status: string;
        requestId: string;
        remainingToday?: number;
      };

      if (!data?.success || !data?.requestId) {
        throw new Error("Failed to queue try-on job. Please try again.");
      }

      const targetRequestId = data.requestId;

      // 4. Listen directly to pendingTryOns to catch processing errors if fal.ai fails
      const pendingRef = doc(db, "users", uid, "pendingTryOns", targetRequestId);
      const unsubscribePending = onSnapshot(pendingRef, (docSnap) => {
        if (docSnap.exists()) {
          const pendingData = docSnap.data();
          if (pendingData?.status === "FAILED") {
            unsubscribePending();
            unsubscribeHistory();
            setLoading(false);
            Alert.alert("Try-On Failed", pendingData?.error || "Failed to process hairstyle.");
          }
        }
      });

      // 5. Listen to user's tryOnHistory filtered specifically for this requestId
      const historyQuery = query(
        collection(db, "users", uid, "tryOnHistory"),
        where("requestId", "==", targetRequestId)
      );

      const unsubscribeHistory = onSnapshot(
        historyQuery,
        (snapshot) => {
          if (!snapshot.empty) {
            const resultDoc = snapshot.docs[0].data();
            const imageUrl = resultDoc.imageUrl;

            if (imageUrl) {
              setResultUrl(imageUrl);
              setLoading(false);
              setTransferring(false);

              // Clean up active listeners once result is retrieved
              unsubscribePending();
              unsubscribeHistory();
            }
          }
        },
        (error) => {
          console.error("Firestore history listener error:", error);
          unsubscribePending();
          unsubscribeHistory();
          setLoading(false);
          Alert.alert("Error", "Failed to retrieve generated hairstyle result.");
        }
      );

    } catch (e: any) {
      setLoading(false);
      const message = e?.details?.message || e?.message || "Try-on failed. Please try again.";
      Alert.alert("Error", message);
    }
  };



  return (
    <View style={[styles.div, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: '#fff' }]}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Virtual Try‑On ✨</Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
      >
        {/* Usage banner */}
        <View style={[styles.usageBanner, limitReached && styles.usageBannerExhausted]}>
          <Text style={limitReached ? styles.usageTextExhausted : styles.usageText}>
            {limitReached
              ? "⛔ Daily limit reached — resets at midnight"
              : `✨ ${remaining} of 3 free try-ons remaining today`}
          </Text>
          <View style={styles.usagePills}>
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                style={[styles.pill, i <= usedToday ? styles.pillUsed : styles.pillAvailable]}
              />
            ))}
          </View>
        </View>

        {/* Gender Toggle */}
        <View style={[styles.genderToggle, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[styles.genderBtn, gender === "female" && [styles.genderBtnActive, { backgroundColor: colors.primary }]]}
            onPress={() => setGender("female")}
          >
            <Text style={[styles.genderText, { color: gender === "female" ? '#fff' : colors.textSecondary }]}>👩 Women</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.genderBtn, gender === "male" && [styles.genderBtnActive, { backgroundColor: colors.primary }]]}
            onPress={() => setGender("male")}
          >
            <Text style={[styles.genderText, { color: gender === "male" ? '#fff' : colors.textSecondary }]}>👨 Men</Text>
          </TouchableOpacity>
        </View>

        {/* Style Type Toggle */}
        <View style={[styles.typeToggle, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[styles.typeBtn, styleType === "hairstyle" && [styles.typeBtnActive, { backgroundColor: colors.card || colors.background }]]}
            onPress={() => setStyleType("hairstyle")}
          >
            <Text style={[styles.typeBtnText, { color: styleType === "hairstyle" ? colors.text : colors.textSecondary }]}>💇 Hairstyles</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, styleType === "haircut" && [styles.typeBtnActive, { backgroundColor: colors.card || colors.background }]]}
            onPress={() => setStyleType("haircut")}
          >
            <Text style={[styles.typeBtnText, { color: styleType === "haircut" ? colors.text : colors.textSecondary }]}>✂️ Haircuts</Text>
          </TouchableOpacity>
        </View>

        {/* Step 1 — Upload Face Photo */}
        <Text style={[styles.stepLabel, { color: colors.text }]}>1. Upload your photo</Text>
        <TouchableOpacity style={styles.imagePicker} onPress={showImageSourceSheet}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} contentFit="cover" />
          ) : (
            <View style={styles.placeholderContent}>
              <Text style={styles.placeholderIcon}>📷</Text>
              <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>Tap to upload face photo</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Step 2 — Pick style */}
        <Text style={[styles.stepLabel, { color: colors.text }]}>2. Select target hairstyle</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.tab, { backgroundColor: activeCategory === cat ? colors.primary : colors.surface }]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[styles.tabText, { color: activeCategory === cat ? '#fff' : colors.textSecondary }]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Hairstyle grid */}
        <View style={styles.grid}>
          {/* Custom Reference Image Upload Tile */}
          <TouchableOpacity
            style={[
              styles.tile,
              styles.customUploadTile,
              selectedStyle?.isCustom && [styles.tileSelected, { borderColor: colors.primary }],
            ]}
            onPress={pickCustomHairstyleImage}
          >
            {selectedStyle?.isCustom ? (
              <Image source={{ uri: selectedStyle.imageUrl }} style={styles.tileImage} contentFit="cover" />
            ) : (
              <View style={styles.customTileContent}>
                <Ionicons name="add-circle-outline" size={32} color={colors.primary} />
                <Text style={[styles.customTileText, { color: colors.primary }]}>Upload Custom Hairstyle</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Preset Styles */}
          {filteredStyles.map((style) => {
            const isSelected = selectedStyle?.id === style.id;
            return (
              <TouchableOpacity
                key={style.id}
                style={[styles.tile, isSelected && [styles.tileSelected, { borderColor: colors.primary }]]}
                onPress={() => {
                  setSelectedStyle(style);
                  setCustomHairBase64(null);
                  setResultUrl(null);
                }}
              >
                <Image source={{ uri: style.imageUrl }} style={styles.tileImage} contentFit="cover" />
                {isSelected && (
                  <View style={[styles.tileOverlay, { backgroundColor: 'rgba(108,60,225,0.35)' }]}>
                    <Text style={styles.checkIcon}>✓</Text>
                  </View>
                )}
                <View style={styles.tileLabel}>
                  <Text style={styles.tileLabelText} numberOfLines={1}>{style.name}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedStyle && (
          <View style={[styles.selectedBanner, { backgroundColor: `${colors.primary}18` }]}>
            <Text style={[styles.selectedBannerText, { color: colors.primary }]}>
              Selected: <Text style={{ fontWeight: "700" }}>{selectedStyle.name}</Text>
            </Text>
          </View>
        )}

        {/* Try On Button */}
        <TouchableOpacity
          style={[(!imageBase64 || !selectedStyle || loading || transferring || limitReached) && styles.buttonDisabled]}
          onPress={runTryOn}
          disabled={!imageBase64 || !selectedStyle || loading || transferring || limitReached}
        >
          {/* Active Processing Card */}
          {loading || transferring ? (
            <View style={[styles.processingCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
              <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 12 }} />

              <Text style={[styles.processingTitle, { color: colors.text }]}>
                Generating Your Hairstyle ✨
              </Text>

              <View style={styles.estimateBanner}>
                <Ionicons name="time-outline" size={18} color="#D97706" />
                <Text style={styles.estimateText}>
                  AI processing takes approx. <Text style={{ fontWeight: "700" }}>5–10 minutes</Text>. You can safely leave or wait here—your look will auto-update when ready!
                </Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.button,
                (!imageBase64 || !selectedStyle || limitReached) && styles.buttonDisabled,
              ]}
              onPress={runTryOn}
              disabled={!imageBase64 || !selectedStyle || limitReached}
            >
              <Text style={styles.buttonText}>
                {limitReached ? "⛔ Limit Reached" : "✨ Try This Style"}
              </Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Result view */}
        {resultUrl && (
          <View style={styles.resultSection}>
            <Text style={[styles.resultTitle, { color: colors.text }]}>Your New Look ✨</Text>
            <View style={styles.beforeAfterItem}>
              <TouchableOpacity activeOpacity={0.85} onPress={() => setFullScreenVisible(true)} style={styles.beforeAfterImage}>
                <Image source={{ uri: resultUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
              </TouchableOpacity>
            </View>

            <View style={styles.resultActionsRow}>
              <TouchableOpacity
                style={[styles.resultActionBtn, { backgroundColor: colors.surface, borderColor: saved ? "#22c55e" : colors.border, borderWidth: 1 }]}
              >
                <Text style={[styles.resultActionBtnText, { color: saved ? "#22c55e" : colors.primary }]}>
                  ✅ Saved
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Full Screen Modal */}
      <Modal
        visible={!!fullScreenVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setFullScreenVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setFullScreenVisible(false)}
              style={[styles.modalCloseBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.modalTitleBlock}>
              <Text style={styles.modalTitle}>New look</Text>
            </View>
            <TouchableOpacity
              style={[styles.shareBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
              onPress={() => resultUrl && handleShare(resultUrl)}
            >
              <Text style={styles.shareBtnText}>Share</Text>
            </TouchableOpacity>
          </View>

          {/* Full Image */}
          {resultUrl && (
            <Image
              source={{ uri: resultUrl }}
              style={styles.fullImage}
              contentFit="contain"
              transition={200}
              placeholder={colors.surface || '#f3f4f6'}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    div: { paddingBottom: 200, flexGrow: 1 },
    container: { padding: 16, paddingBottom: 40, flexGrow: 1 },
    header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backButton: { borderRadius: 20, padding: 8 },
    headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#fff', textAlign: 'center' },
    genderToggle: { flexDirection: "row", borderRadius: 12, padding: 4, marginBottom: 10 },
    genderBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
    genderBtnActive: { backgroundColor: colors.primary },
    genderText: { fontWeight: "600", fontSize: 14 },
    typeToggle: { flexDirection: "row", borderRadius: 12, padding: 4, marginBottom: 16 },
    typeBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
    typeBtnActive: { elevation: 2 },
    typeBtnText: { fontWeight: "600", fontSize: 14 },
    stepLabel: { fontSize: 15, fontWeight: "700", marginBottom: 10, marginTop: 8 },
    imagePicker: { height: 200, borderRadius: 16, borderWidth: 1, justifyContent: "center", alignItems: "center", overflow: "hidden", marginBottom: 8 },
    previewImage: { width: "100%", height: "100%" },
    placeholderContent: { alignItems: "center", gap: 4 },
    placeholderIcon: { fontSize: 36 },
    placeholderText: { fontSize: 15 },
    tabsRow: { marginBottom: 12 },
    tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
    tabText: { fontSize: 13, fontWeight: "500" },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
    tile: { width: TILE_SIZE, height: TILE_SIZE * 1.3, borderRadius: 12, overflow: "hidden", position: "relative" },
    tileSelected: { borderWidth: 3 },
    tileImage: { width: "100%", height: "100%" },
    customUploadTile: { borderWidth: 2, borderStyle: "dashed", borderColor: colors.primary, justifyContent: "center", alignItems: "center", backgroundColor: `${colors.primary}10` },
    customTileContent: { alignItems: "center", padding: 8, gap: 4 },
    customTileText: { fontSize: 11, fontWeight: "700", textAlign: "center" },
    tileOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center" },
    checkIcon: { color: "#fff", fontSize: 28, fontWeight: "700" },
    tileLabel: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.5)", padding: 4 },
    tileLabelText: { color: "#fff", fontSize: 11 },
    selectedBanner: { borderRadius: 8, padding: 10, marginTop: 8, marginBottom: 4 },
    selectedBannerText: { fontSize: 13 },
    button: { marginTop: 20, borderRadius: 12, paddingVertical: 14, alignItems: "center", backgroundColor: colors.primary },
    buttonDisabled: { opacity: 0.4 },
    buttonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
    loadingRow: { flexDirection: "row", alignItems: "center" },
    resultSection: { marginTop: 24 },
    resultTitle: { fontSize: 18, fontWeight: "700", marginBottom: 2 },
    beforeAfterItem: { flex: 1, alignItems: "center" },
    beforeAfterImage: { width: "100%", height: 280, borderRadius: 12, overflow: "hidden" },
    usageBanner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#f3eeff", borderRadius: 12, padding: 12, marginBottom: 16 },
    usageBannerExhausted: { backgroundColor: "#fff0f0" },
    usageText: { color: "#6C3CE1", fontSize: 13, fontWeight: "600", flex: 1 },
    usageTextExhausted: { color: "#E14444", fontSize: 13, fontWeight: "600", flex: 1 },
    usagePills: { flexDirection: "row", gap: 6 },
    pill: { width: 24, height: 8, borderRadius: 4 },
    pillUsed: { backgroundColor: "#ccc" },
    pillAvailable: { backgroundColor: "#6C3CE1" },
    resultActionsRow: { flexDirection: "row", gap: 10, marginTop: 16 },
    resultActionBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
    resultActionBtnText: { fontWeight: "600", fontSize: 14 },
    processingCard: { marginTop: 20, padding: 20, borderRadius: 16, borderWidth: 1, alignItems: "center", },
    processingTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4, },
    processingTimer: { fontSize: 15, fontWeight: "600", marginBottom: 16, },
    estimateBanner: { flexDirection: "row", alignItems: "center", backgroundColor: "#FEF3C7", borderRadius: 10, padding: 12, gap: 10, },
    estimateText: { flex: 1, color: "#92400E", fontSize: 12, lineHeight: 18, },

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