import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View, Text, Image, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, Alert, Dimensions, Modal, Share,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirestore, collection, query, where, orderBy, onSnapshot, serverTimestamp, addDoc, } from "firebase/firestore";
import { app } from "@/firebase";
import { useTheme } from "@/providers/ThemeProvider";
import { useRouter } from "expo-router";
import { useTryOnUsage } from "@/hooks/useTryOnUsage";
import { getAuth } from "firebase/auth";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";


const functions = getFunctions(app);
const db = getFirestore(app);
const storage = getStorage(app);

const { width } = Dimensions.get("window");
const TILE_SIZE = (width - 48) / 3;

interface HairstyleOption {
  id: string;
  name: string;
  targetHairstyle: string; // replaces prompt
  hairColor: string;
  category: string;
  imageUrl: string;
  gender: "male" | "female";
  type: "hairstyle" | "haircut";
  order: number;
}

export default function VirtualTryOnScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<HairstyleOption | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [gender, setGender] = useState<"female" | "male">("female");
  const [styleType, setStyleType] = useState<"hairstyle" | "haircut">("hairstyle");
  const [hairstyles, setHairstyles] = useState<HairstyleOption[]>([]);
  const [loadingStyles, setLoadingStyles] = useState(true);
  const { remaining, limitReached, usedToday } = useTryOnUsage();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fullScreenVisible, setFullScreenVisible] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const resultSectionY = useRef<number>(0);

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

  // Derive categories from fetched styles
  const categories = ["All", ...Array.from(new Set(hairstyles.map((h) => h.category)))];

  const filteredStyles = activeCategory === "All"
    ? hairstyles
    : hairstyles.filter((h) => h.category === activeCategory);

  const pickImage = async (source: "camera" | "gallery") => {
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
        aspect: [3, 4],
      });
      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setImageBase64(result.assets[0].base64 ?? null);
        setResultUrl(null);
      }
    } else {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please allow photo access.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        base64: true,
        allowsEditing: true,
        aspect: [3, 4],
      });
      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setImageBase64(result.assets[0].base64 ?? null);
        setResultUrl(null);
      }
    }
  };

  const showImageSourceSheet = () => {
    Alert.alert(
      "Upload your photo",
      "Choose a source",
      [
        {
          text: "📷 Take a photo",
          onPress: () => pickImage("camera"),
        },
        {
          text: "🖼️ Choose from gallery",
          onPress: () => pickImage("gallery"),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true },
    );
  };

  const saveFalImageToStorage = async (
    falUrl: string,
    retries = 3,
  ): Promise<string> => {
    const uid = getAuth(app).currentUser?.uid;
    if (!uid) throw new Error("Not authenticated");

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Fetching fal.ai image, attempt ${attempt}...`);
        const response = await fetch(falUrl, {
          headers: { "Cache-Control": "no-cache" },
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const blob = await response.blob();
        const timestamp = Date.now();
        const storageRef = ref(
          storage,
          `tryOnResults/${uid}/${timestamp}.jpg`,
        );
        await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
        const permanentUrl = await getDownloadURL(storageRef);
        return permanentUrl;
      } catch (err) {
        console.warn(`Attempt ${attempt} failed:`, err);
        if (attempt === retries) throw err;
        // Wait before retrying: 2s, 4s, 6s
        await new Promise((r) => setTimeout(r, attempt * 2000));
      }
    }
    throw new Error("All retry attempts failed");
  };

  const runTryOn = async () => {
    if (!imageBase64 || !selectedStyle) return;
    if (limitReached) {
      Alert.alert(
        "Daily Limit Reached",
        "You've used all 3 free try-ons for today. Come back tomorrow! 💇‍♀️",
      );
      return;
    }
    setLoading(true);
    try {
      const fn = httpsCallable(functions, "virtualHairstyleTryOn");
      const response = await fn({
        imageBase64,
        hairstylePrompt: selectedStyle.targetHairstyle,
        hairColor: selectedStyle.hairColor,
      });
      const falUrl = (response.data as any).outputImageUrl;

      // Transfer phase — separate state so UI can show different message
      setLoading(false);
      setTransferring(true);
      setSaved(false);
      const permanentUrl = await saveFalImageToStorage(falUrl);
      setResultUrl(permanentUrl);
    } catch (e: any) {
      // Firebase httpsCallable wraps errors — extract correctly
      const message =
        e?.details?.message ||   // fal.ai detail from HttpsError
        e?.message ||             // Firebase error message
        "Try-on failed. Please try again.";

      console.error("runTryOn error:", JSON.stringify({
        code: e?.code,
        message: e?.message,
        details: e?.details,
      }));

      Alert.alert("Error", message);
    } finally {
      setLoading(false);
      setTransferring(false);
    }
  };

  const saveResult = async () => {
    const uid = getAuth(app).currentUser?.uid;
    if (!uid || !resultUrl || !selectedStyle) return;
    try {
      setSaving(true);
      await addDoc(collection(db, "users", uid, "tryOnHistory"), {
        imageUrl: resultUrl,
        styleName: selectedStyle.name,
        targetHairstyle: selectedStyle.targetHairstyle,
        hairColor: selectedStyle.hairColor,
        category: selectedStyle.category,
        gender: selectedStyle.gender,
        type: selectedStyle.type,
        savedAt: serverTimestamp(),
      });
      setSaved(true); // ✅ mark as saved
      Alert.alert("Saved! ✅", "Your look has been saved to your history.");
    } catch (e: any) {
      Alert.alert("Error", "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.div, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>Virtual Try‑On ✨</Text>

      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
      >

        {/* ── Usage counter banner ── */}
        <View style={[
          styles.usageBanner,
          limitReached && styles.usageBannerExhausted,
        ]}>
          {limitReached ? (
            <Text style={styles.usageTextExhausted}>
              ⛔ Daily limit reached — resets at midnight
            </Text>
          ) : (
            <Text style={styles.usageText}>
              ✨ {remaining} of 3 free try-ons remaining today
            </Text>
          )}
          {/* Pill indicators */}
          <View style={styles.usagePills}>
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.pill,
                  i <= usedToday ? styles.pillUsed : styles.pillAvailable,
                ]}
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
            <Text style={[styles.genderText, { color: gender === "female" ? '#fff' : colors.textSecondary }]}>
              👩 Women
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.genderBtn, gender === "male" && [styles.genderBtnActive, { backgroundColor: colors.primary }]]}
            onPress={() => setGender("male")}
          >
            <Text style={[styles.genderText, { color: gender === "male" ? '#fff' : colors.textSecondary }]}>
              👨 Men
            </Text>
          </TouchableOpacity>
        </View>

        {/* Style Type Toggle */}
        <View style={[styles.typeToggle, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[
              styles.typeBtn,
              styleType === "hairstyle" && [
                styles.typeBtnActive,
                {
                  backgroundColor: colors.card || colors.background,
                  shadowColor: '#000',
                },
              ],
            ]}
            onPress={() => setStyleType("hairstyle")}
          >
            <Text style={[
              styles.typeBtnText,
              { color: styleType === "hairstyle" ? colors.text : colors.textSecondary },
            ]}>
              💇 Hairstyles
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeBtn,
              styleType === "haircut" && [
                styles.typeBtnActive,
                {
                  backgroundColor: colors.card || colors.background,
                  shadowColor: '#000',
                },
              ],
            ]}
            onPress={() => setStyleType("haircut")}
          >
            <Text style={[
              styles.typeBtnText,
              { color: styleType === "haircut" ? colors.text : colors.textSecondary },
            ]}>
              ✂️ Haircuts
            </Text>
          </TouchableOpacity>
        </View>

        {/* Step 1 — Upload */}
        <Text style={[styles.stepLabel, { color: colors.text }]}>1. Upload your photo</Text>
        <TouchableOpacity
          style={styles.imagePicker}
          onPress={showImageSourceSheet}  // ✅ changed from pickImage
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.placeholderContent}>
              <Text style={styles.placeholderIcon}>📷</Text>
              <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
                Tap to upload
              </Text>
              <Text style={[styles.placeholderSub, { color: colors.textSecondary }]}>
                Camera or gallery
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Step 2 — Pick style */}
        <Text style={[styles.stepLabel, { color: colors.text }]}>2. Pick a style</Text>

        {/* Category tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsRow}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.tab,
                {
                  backgroundColor: activeCategory === cat ? colors.primary : colors.surface,
                },
              ]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[
                styles.tabText,
                { color: activeCategory === cat ? '#fff' : colors.textSecondary },
              ]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Hairstyle grid */}
        {loadingStyles ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading styles...</Text>
          </View>
        ) : filteredStyles.length === 0 ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No styles available yet.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredStyles.map((style) => {
              const isSelected = selectedStyle?.id === style.id;
              return (
                <TouchableOpacity
                  key={style.id}
                  style={[
                    styles.tile,
                    isSelected && [
                      styles.tileSelected,
                      {
                        borderColor: colors.primary,
                        shadowColor: colors.primary,
                      },
                    ],
                  ]}
                  onPress={() => {
                    setSelectedStyle(style);
                    setResultUrl(null);
                  }}
                >
                  <Image source={{ uri: style.imageUrl }} style={styles.tileImage} />
                  {isSelected && (
                    <View style={[styles.tileOverlay, { backgroundColor: 'rgba(108,60,225,0.35)' }]}>
                      <Text style={styles.checkIcon}>✓</Text>
                    </View>
                  )}
                  <View style={styles.tileLabel}>
                    <Text style={styles.tileLabelText} numberOfLines={1}>
                      {style.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Selected style indicator */}
        {selectedStyle && (
          <View style={[styles.selectedBanner, { backgroundColor: `${colors.primary}18` }]}>
            <Text style={[styles.selectedBannerText, { color: colors.primary }]}>
              Selected: <Text style={{ fontWeight: "700" }}>{selectedStyle.name}</Text>
            </Text>
          </View>
        )}

        {/* Try On button */}
        <TouchableOpacity
          style={[
            styles.button,
            (!imageBase64 || !selectedStyle || loading ||
              transferring || limitReached) && styles.buttonDisabled,
          ]}
          onPress={runTryOn}
          disabled={!imageBase64 || !selectedStyle || loading || transferring || limitReached}
        >
          {loading || transferring ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#fff" />
              <Text style={[styles.buttonText, { marginLeft: 8 }]}>
                {loading ? "Generating..." : "Saving result..."}
              </Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>
              {limitReached ? "⛔ Limit Reached" : "✨ Try This Style"}
            </Text>
          )}
        </TouchableOpacity>

        {/* Before / After result */}
        {resultUrl && (
          <View
            onLayout={(event) => {
              resultSectionY.current = event.nativeEvent.layout.y;
              scrollViewRef.current?.scrollTo({
                y: resultSectionY.current,
                animated: true,
              });
            }}
            style={styles.resultSection}
          >
            <Text style={[styles.resultTitle, { color: colors.text }]}>
              Your New Look ✨
            </Text>
            <Text style={[styles.resultSubtitle, { color: colors.primary }]}>
              {selectedStyle?.name}
            </Text>

            <View style={styles.beforeAfterItem}>
              <Text style={[styles.beforeAfterLabel, { color: colors.textSecondary }]}>
                After
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setFullScreenVisible(true)}
                style={styles.beforeAfterImage}
              >
                <Image
                  source={{ uri: resultUrl }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                  onLoad={() => console.log("After image loaded:", resultUrl)}
                  onError={(e) => console.error("After image error:", e.nativeEvent.error, resultUrl)}
                />
                <View style={styles.tapToViewOverlay}>
                  <Text style={styles.tapToViewText}>Tap to view</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Action buttons row */}
            <View style={styles.resultActionsRow}>
              {/* Save button */}
              <TouchableOpacity
                style={[
                  styles.resultActionBtn,
                  {
                    backgroundColor: saved
                      ? colors.surface
                      : colors.surface,
                    borderColor: saved ? "#22c55e" : colors.border,
                    borderWidth: 1,
                    opacity: saved ? 0.7 : 1,
                  },
                ]}
                onPress={saved ? undefined : saveResult}
                disabled={saving || saved}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text
                    style={[
                      styles.resultActionBtnText,
                      { color: saved ? "#22c55e" : colors.primary },
                    ]}
                  >
                    {saved ? "✅ Saved" : "🔖 Save Look"}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Book button 
              <TouchableOpacity
                style={[styles.resultActionBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.resultActionBtnText, { color: "#fff" }]}>
                  💅 Book Style
                </Text>
              </TouchableOpacity>
              */}
            </View>

            <TouchableOpacity
              style={styles.tryAnotherBtn}
              onPress={() => {
                setResultUrl(null);
                setSelectedStyle(null);
                scrollViewRef.current?.scrollTo({ y: 0, animated: true });
              }}
            >
              <Text style={[styles.tryAnotherText, { color: colors.primary }]}>
                Try another style
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      {/* Full Screen Result Modal */}
      <Modal
        visible={fullScreenVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setFullScreenVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setFullScreenVisible(false)}
              style={styles.modalCloseBtn}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.modalTitleBlock}>
              <Text style={styles.modalTitle}>{selectedStyle?.name}</Text>
              <Text style={styles.modalSubtitle}>{selectedStyle?.category}</Text>
            </View>
            <TouchableOpacity
              style={styles.shareBtn}
              onPress={async () => {
                try {
                  await Share.share({
                    message: "Check out my new hairstyle from Timely! 💇‍♀️",
                    url: resultUrl ?? "",
                  });
                } catch (e) {
                  console.error("Share error:", e);
                }
              }}
            >
              <Text style={styles.shareBtnText}>Share</Text>
            </TouchableOpacity>
          </View>

          {/* Full image */}
          <Image
            source={{ uri: resultUrl ?? "" }}
            style={styles.fullImage}
            resizeMode="contain"
          />

          {/* Footer */}
          <View style={styles.modalFooter}>
            <View style={styles.resultActionsRow}>
              <TouchableOpacity
                style={[styles.resultActionBtn, {
                  backgroundColor: "rgba(255,255,255,0.15)",
                  borderColor: "rgba(255,255,255,0.3)",
                  borderWidth: 1,
                }]}
                onPress={() => {
                  setFullScreenVisible(false);
                  saveResult();
                }}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.resultActionBtnText, { color: "#fff" }]}>
                    🔖 Save Look
                  </Text>
                )}
              </TouchableOpacity>
              {/* 
              <TouchableOpacity
                style={[styles.resultActionBtn, { backgroundColor: colors.primary }]}
                onPress={() => setFullScreenVisible(false)}
              >
                <Text style={[styles.resultActionBtnText, { color: "#fff" }]}>
                  💅 Book Style
                </Text>
              </TouchableOpacity>
              */}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    div: { paddingBottom: 200, flexGrow: 1,  },
    container: { padding: 16, paddingBottom: 40, flexGrow: 1 },
    header: {
      paddingTop: 60,
      paddingHorizontal: 20,
      paddingBottom: 20,
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
    },
    backButton: {
      borderRadius: 20,
      padding: 8,
    },
    headerTitle: {
      flex: 1,
      fontSize: 24,
      fontWeight: '700',
      color: '#fff',
      textAlign: 'left',
    },

    genderToggle: {
      flexDirection: "row",
      borderRadius: 12,
      padding: 4,
      marginBottom: 10,
    },
    genderBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: "center",
      borderRadius: 10,
    },
    genderBtnActive: { backgroundColor: colors.primary },
    genderText: { fontWeight: "600", fontSize: 14 },

    typeToggle: {
      flexDirection: "row",
      borderRadius: 12,
      padding: 4,
      marginBottom: 16,
    },
    typeBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: "center",
      borderRadius: 10,
    },
    typeBtnActive: {
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    typeBtnText: { fontWeight: "600", fontSize: 14 },

    stepLabel: { fontSize: 15, fontWeight: "700", marginBottom: 10, marginTop: 8 },
    imagePicker: {
      height: 200,
      borderRadius: 16,
      borderWidth: 1,
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
      marginBottom: 8,
    },
    previewImage: { width: "100%", height: "100%" },
    placeholderText: { fontSize: 15 },

    tabsRow: { marginBottom: 12 },
    tab: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 8,
    },
    tabText: { fontSize: 13, fontWeight: "500" },

    loadingContainer: { alignItems: "center", paddingVertical: 40 },
    loadingText: { marginTop: 10, fontSize: 13 },
    emptyText: { fontSize: 13 },

    grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
    tile: {
      width: TILE_SIZE,
      height: TILE_SIZE * 1.3,
      borderRadius: 12,
      overflow: "hidden",
      position: "relative",
    },
    tileSelected: {
      borderWidth: 3,
      shadowOpacity: 0.4,
      shadowRadius: 6,
      elevation: 4,
    },
    tileImage: { width: "100%", height: "100%" },
    tileOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "center",
      alignItems: "center",
    },
    checkIcon: { color: "#fff", fontSize: 28, fontWeight: "700" },
    tileLabel: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      padding: 4,
    },
    tileLabelText: { color: "#fff", fontSize: 11 },

    selectedBanner: {
      borderRadius: 8,
      padding: 10,
      marginTop: 8,
      marginBottom: 4,
    },
    selectedBannerText: { fontSize: 13 },

    button: {
      marginTop: 20,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: colors.primary,
    },
    buttonDisabled: { opacity: 0.4 },
    bookButton: { marginTop: 12 },
    buttonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
    loadingRow: { flexDirection: "row", alignItems: "center" },

    resultSection: { marginTop: 24 },
    resultTitle: { fontSize: 18, fontWeight: "700", marginBottom: 2 },
    resultSubtitle: { fontSize: 13, marginBottom: 12 },
    beforeAfterRow: { flexDirection: "row", gap: 10 },
    beforeAfterItem: { flex: 1, alignItems: "center" },
    beforeAfterLabel: { fontSize: 12, marginBottom: 6 },
    beforeAfterImage: {
      width: "100%",
      height: 180,
      borderRadius: 12,
      overflow: "hidden",  // ✅ needed for absoluteFill + borderRadius to work
      backgroundColor: "#f0f0f0", // ✅ shows placeholder while loading
    },

    tryAnotherBtn: { alignItems: "center", marginTop: 16, paddingVertical: 8 },
    tryAnotherText: { fontSize: 14, fontWeight: "500" },

    usageBanner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "#f3eeff",
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
    },
    usageBannerExhausted: {
      backgroundColor: "#fff0f0",
    },
    usageText: {
      color: "#6C3CE1",
      fontSize: 13,
      fontWeight: "600",
      flex: 1,
    },
    usageTextExhausted: {
      color: "#E14444",
      fontSize: 13,
      fontWeight: "600",
      flex: 1,
    },
    usagePills: {
      flexDirection: "row",
      gap: 6,
    },
    pill: {
      width: 24,
      height: 8,
      borderRadius: 4,
    },
    pillUsed: {
      backgroundColor: "#ccc",
    },
    pillAvailable: {
      backgroundColor: "#6C3CE1",
    },

    tapToViewOverlay: {
      position: "absolute", bottom: 0, left: 0, right: 0,
      backgroundColor: "rgba(0,0,0,0.4)",
      paddingVertical: 4, borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
      alignItems: "center",
    },
    tapToViewText: { color: "#fff", fontSize: 11, fontWeight: "600" },
    resultActionsRow: {
      flexDirection: "row", gap: 10, marginTop: 16,
    },
    resultActionBtn: {
      flex: 1, paddingVertical: 14,
      borderRadius: 12, alignItems: "center",
    },
    resultActionBtnText: { fontWeight: "600", fontSize: 14 },

    modalContainer: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)" },
    modalHeader: {
      paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20,
      flexDirection: "row", alignItems: "center",
    },
    modalCloseBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.15)",
      justifyContent: "center", alignItems: "center",
    },
    modalCloseText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    modalTitleBlock: { flex: 1, alignItems: "center" },
    modalTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
    modalSubtitle: { color: "#aaa", fontSize: 12, marginTop: 2 },
    shareBtn: {
      paddingHorizontal: 14, paddingVertical: 8,
      backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20,
    },
    shareBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
    fullImage: { flex: 1, width: "100%" },
    modalFooter: { padding: 24, paddingBottom: 40 },

    placeholderContent: {
      alignItems: "center",
      gap: 4,
    },
    placeholderIcon: { fontSize: 36 },
    placeholderSub: { fontSize: 12, marginTop: 2 },
  });