import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Linking,
  Alert,
  Share,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useAuthStore } from '@/stores/auth';
import { useChatStore } from '@/stores/chat';
import { router, useLocalSearchParams, type Href } from "expo-router";
import {
  doc,
  getDoc,
  getFirestore,
  updateDoc,
  increment,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { Product } from "../../types/product";
import { CATEGORIES } from "../../types/product";
import GalleryWidget from "@/components/Gallerywidget";
import { useTheme } from "@/providers/ThemeProvider";
import { findCurrency } from "@/components/Currencypickermodal";

const { width } = Dimensions.get("window");

// ─── Helpers (unchanged) ────────────────────────────────────────────────
function toMillis(value: unknown): number {
  if (typeof value === "number") return value;
  if (value && typeof (value as any).toMillis === "function") {
    return (value as any).toMillis();
  }
  if (value && typeof (value as any).seconds === "number") {
    const nanos = (value as any).nanoseconds ?? 0;
    return (value as any).seconds * 1000 + Math.floor(nanos / 1e6);
  }
  return Date.now();
}

function timeAgo(ms: number): string {
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function formatViewCount(count: number): string {
  if (count < 1000) return `${count}`;
  if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
  return `${Math.floor(count / 1000)}k`;
}

// ─── Main Component ──────────────────────────────────────────────────────
export default function ProductDetailScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const { user, profile } = useAuthStore();
  const [isOpeningChat, setIsOpeningChat] = useState(false);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const snap = await getDoc(doc(getFirestore(), "products", productId));
        if (snap.exists()) {
          setProduct(snap.data() as Product);
          const isOwnListing = getAuth().currentUser?.uid === snap.data().sellerId;

          if (!isOwnListing) {
            updateDoc(doc(getFirestore(), "products", productId), {
              viewCount: increment(1),
            }).catch(() => { });
          }
        }
      } catch (err) {
        console.error("Failed to load product:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [productId]);

  useEffect(() => {
    if (!product) return;
    let cancelled = false;

    (async () => {
      setRelatedLoading(true);
      try {
        const q = query(
          collection(getFirestore(), "products"),
          where("category", "==", product.category),
          where("status", "==", "active"),
          orderBy("createdAt", "desc"),
          limit(11)
        );
        const snap = await getDocs(q);
        const items = snap.docs
          .map((d) => d.data() as Product)
          .filter((p) => p.productId !== product.productId)
          .slice(0, 10);
        if (!cancelled) setRelatedProducts(items);
      } catch (err) {
        console.error("Failed to load related products:", err);
      } finally {
        if (!cancelled) setRelatedLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [product?.category, product?.productId]);

  const handleMessage = useCallback(async () => {
    if (!product?.sellerId) {
      Alert.alert('Error', 'Provider not available');
      return;
    }
    if (!user?.uid) {
      Alert.alert('Sign in required', 'Please sign in to message this provider.');
      return;
    }
    setIsOpeningChat(true);
    try {
      const chatId = await useChatStore.getState().getOrCreateChat({
        currentUserId: user.uid,
        currentUserName: profile?.displayName || user.displayName,
        currentUserPhoto: profile?.photoURL || user.photoURL,
        otherUserId: product.sellerId,
        otherUserName: product.sellerName,
        otherUserPhoto: product.images?.[0],
        serviceId: product.productId,
        serviceName: product.name,
        providerId: product.sellerId,
      });
      router.push(`/chats/${chatId}`);
    } catch (error) {
      console.error('Failed to open chat:', error);
      Alert.alert('Error', 'Could not open chat. Please try again.');
    } finally {
      setIsOpeningChat(false);
    }
  }, [product, user, profile]);

  const handleContact = async () => {
    if (!product) return;

    if (product.contact) {
      if (!product.contact) {
        Alert.alert('Error', 'Phone number not available');
        return;
      }
      const url = `tel:${product.contact}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot make a call');
      }
    } else {
      handleMessage();
    }
  };

  const handleShare = async () => {
    if (!product) return;
    const url = `https://timelygh.com/shop/${product.productId}`;
    try {
      await Share.share({ message: `${product.name} — ${product.currency} ${product.price.toLocaleString()}: ${url}` });
    } catch (error) {
      console.log(error);
    }
  };

  const handleBack = () => {
      if (router.canGoBack()) {
        router.back();
      } else {
        // Cold boot from notification: no history, so route to fallback.
        // `replace` (not `push`) so this screen is removed from the stack.
        router.replace('/(tabs)/home' as Href);
      }
    };

  if (loading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={styles.notFound}>This listing isn't available anymore.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={styles.backLink}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isOwnListing = getAuth().currentUser?.uid === product.sellerId;
  const isSoldOut = product.status === "offline";
  const categoryLabel =
    CATEGORIES.find((c) => c.id === product.category)?.label ?? product.category;
  const contactLabel = product.contact ? "Call Now" : "Message seller";
  const locationLine = product.location || null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />

      <ScrollView bounces={true} showsVerticalScrollIndicator={false}>
        <View style={[styles.imageSection, { backgroundColor: colors.surface }]}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setActiveImage(Math.round(e.nativeEvent.contentOffset.x / width))
            }
          >
            {product.images.map((uri, i) => (
              <TouchableOpacity
                key={i}
                activeOpacity={0.9}
                onPress={() => {
                  setGalleryIndex(i);
                  setGalleryVisible(true);
                }}
              >
                <Image
                  source={{ uri }}
                  style={{ width, height: width }}
                  contentFit="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.floatingHeader}>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.background }]}
              onPress={handleBack}
            >
              <MaterialCommunityIcons name="arrow-left" size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.background }]}
              onPress={handleShare}
            >
              <MaterialCommunityIcons name="share-variant" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          {product.images.length > 1 && (
            <View style={styles.imageCounter}>
              <Text style={styles.imageCounterText}>
                {activeImage + 1}/{product.images.length}
              </Text>
            </View>
          )}

          {isSoldOut && (
            <View style={styles.soldOutBanner}>
              <Text style={styles.soldOutBannerText}>Sold out</Text>
            </View>
          )}
        </View>

        <View style={[
          styles.content,
          {
            backgroundColor: colors.card || colors.background,
          }
        ]}>
          {isOwnListing && (
            <View style={[styles.ownListingBanner, { backgroundColor: colors.primaryLight || `${colors.primary}18` }]}>
              <MaterialCommunityIcons name="account-check-outline" size={14} color={colors.primary} />
              <Text style={[styles.ownListingText, { color: colors.primary }]}>This is your listing</Text>
            </View>
          )}

          <View style={styles.titleRow}>
            <Text style={styles.name}>{product.name}</Text>
            <Text style={[styles.price, { color: colors.primary }]}>
              {findCurrency(product.currency).symbol}{product.price.toLocaleString()}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="eye-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.metaText}>{formatViewCount(product.viewCount)} views</Text>
            </View>
            <Text style={[styles.metaDot, { color: colors.textSecondary }]}>·</Text>
            <Text style={styles.metaText}>{timeAgo(toMillis(product.createdAt))}</Text>
          </View>

          <View style={styles.metaRow}>
            <View style={[styles.categoryPill, { backgroundColor: colors.primaryLight || `${colors.primary}18` }]}>
              <Text style={[styles.categoryPillText, { color: colors.text }]}>{categoryLabel}</Text>
            </View>
            {product.isDelivery && (
              <View style={[styles.deliveryPill, { backgroundColor: '#E9F8EF' }]}>
                <MaterialCommunityIcons name="truck-outline" size={13} color={colors.success || "#2E9E5B"} />
                <Text style={[styles.deliveryPillText, { color: colors.success || "#2E9E5B" }]}>Delivery available</Text>
              </View>
            )}
          </View>

          {locationLine && (
            <View style={[styles.locationCard, { backgroundColor: colors.surface }]}>
              <MaterialCommunityIcons name="map-marker-outline" size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.locationText}>{locationLine}</Text>
              </View>
            </View>
          )}

          {!!product.description && (
            <>
              <Text style={styles.sectionLabel}>Description</Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>{product.description}</Text>
            </>
          )}

          {product.tags.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Tags</Text>
              <View style={styles.tagRow}>
                {product.tags.map((tag) => (
                  <View key={tag} style={[styles.tagChip, { backgroundColor: colors.primaryLight || `${colors.primary}18` }]}>
                    <Text style={[styles.tagChipText, { color: colors.text }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        {(relatedLoading || relatedProducts.length > 0) && (
          <View style={[styles.relatedSection, { backgroundColor: colors.card || colors.background }]}>
            <Text style={styles.relatedSectionLabel}>You might also like</Text>
            {relatedLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.relatedRow}
              >
                {relatedProducts.map((item) => (
                  <TouchableOpacity
                    key={item.productId}
                    style={styles.relatedCard}
                    onPress={() =>
                      router.push({
                        pathname: "/shop/[productId]",
                        params: { productId: item.productId },
                      })
                    }
                  >
                    <Image
                      source={{ uri: item.thumbnailUrl || item.images[0] }}
                      style={[styles.relatedImage, { backgroundColor: colors.surface }]}
                      contentFit="cover"
                    />
                    <Text style={styles.relatedName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[styles.relatedPrice, { color: colors.primary }]}>
                      {findCurrency(product.currency).symbol}{product.price.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}
      </ScrollView>

      {!isOwnListing && (
        <View style={[styles.footer, { backgroundColor: colors.card || colors.background, borderTopColor: colors.border || '#E7E4EF' }]}>
          <TouchableOpacity
            style={[
              styles.contactButton,
              { backgroundColor: colors.primary },
              isSoldOut && [styles.contactButtonDisabled, { backgroundColor: colors.border || '#C9C4DA' }],
            ]}
            onPress={handleContact}
            disabled={isSoldOut}
          >
            {isOpeningChat ? (
              <ActivityIndicator size="small" color='#fff' />
            ) : (
              <MaterialCommunityIcons
                name={product.contact ? "phone" : "chat-outline"}
                size={18}
                color="#FFFFFF"
              />
            )}

            <Text style={styles.contactButtonText}>
              {isSoldOut ? "No longer available" : contactLabel}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {galleryVisible && (
        <GalleryWidget
          images={product?.images}
          index={galleryIndex}
          onClose={() => setGalleryVisible(false)}
        />
      )}
    </View>
  );
}

// ─── Style factory ──────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    notFound: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    backLink: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: "500",
    },
    imageSection: {
      position: "relative",
    },
    floatingHeader: {
      position: "absolute",
      top: 50,
      left: 12,
      right: 12,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      // Note: applied per-instance in JSX with opacity for translucency
      opacity: 0.9,
    },
    imageCounter: {
      position: "absolute",
      bottom: 25,
      right: 12,
      backgroundColor: "rgba(0,0,0,0.55)",
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 10,
    },
    imageCounterText: {
      color: "#FFFFFF",
      fontSize: 11,
      fontWeight: "600",
    },
    soldOutBanner: {
      position: "absolute",
      top: 12,
      right: 12,
      backgroundColor: "rgba(0,0,0,0.7)",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
    },
    soldOutBannerText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "500",
    },
    content: {
      padding: 16,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      marginTop: -20,
    },
    ownListingBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      marginBottom: 12,
    },
    ownListingText: {
      fontSize: 11,
      fontWeight: "600",
    },
    titleRow: {
      marginBottom: 8,
    },
    name: {
      fontSize: 19,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    price: {
      fontSize: 21,
      fontWeight: "700",
    },
    statsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 14,
    },
    metaDot: {
      fontSize: 12,
    },
    metaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 8,
      marginBottom: 16,
    },
    categoryPill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 14,
    },
    categoryPillText: {
      fontSize: 12,
    },
    deliveryPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 14,
    },
    deliveryPillText: {
      fontSize: 12,
      fontWeight: "500",
    },
    metaItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
    },
    metaText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    locationCard: {
      flexDirection: "row",
      gap: 10,
      borderRadius: 14,
      padding: 12,
      marginBottom: 16,
    },
    locationText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
    },
    landmarkText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
      marginTop: 12,
      marginBottom: 6,
    },
    description: {
      fontSize: 13,
      lineHeight: 19,
    },
    tagRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    tagChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 14,
    },
    tagChipText: {
      fontSize: 12,
    },
    relatedSection: {
      paddingTop: 4,
      paddingBottom: 20,
    },
    relatedSectionLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
      paddingHorizontal: 16,
      marginBottom: 10,
    },
    relatedRow: {
      paddingHorizontal: 16,
      gap: 12,
    },
    relatedCard: {
      width: 130,
    },
    relatedImage: {
      width: 130,
      height: 100,
      borderRadius: 12,
      marginBottom: 6,
    },
    relatedName: {
      fontSize: 12,
      fontWeight: "500",
      color: colors.text,
    },
    relatedPrice: {
      fontSize: 12,
      fontWeight: "600",
      marginTop: 2,
    },
    footer: {
      padding: 16,
      borderTopWidth: 0.5,
    },
    contactButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: 12,
      paddingVertical: 14,
    },
    contactButtonDisabled: {},
    contactButtonText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "600",
    },
  });