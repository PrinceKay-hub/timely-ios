import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { useFavoriteStore } from '@/stores/favorite';
import { useTheme } from '@/providers/ThemeProvider';

const { width: SCREEN_W } = Dimensions.get('window');
const STATUS_H = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 44;

// ─── ServiceImage ─────────────────────────────────────────────────────────────
const ServiceImage: React.FC<{ uri: string; style: any }> = ({ uri, style }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError]   = useState(false);
  const shimmerAnim         = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!loaded && !error) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(shimmerAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    } else {
      shimmerAnim.stopAnimation();
    }
  }, [loaded, error]);

  const shimmerOpacity = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.9] });

  return (
    <View style={[style, { overflow: 'hidden', backgroundColor: theme.colors.gray100 }]}>
      {!error && uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onLoad={() => setLoaded(true)}
          onError={() => { setError(true); setLoaded(true); }}
        />
      ) : null}

      {/* Shimmer placeholder */}
      {!loaded && (
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.shimmerLayer, { opacity: shimmerOpacity }]}
        />
      )}

      {/* Fallback icon */}
      {error && (
        <View style={[StyleSheet.absoluteFill, styles.imageFallback]}>
          <Text style={styles.imageFallbackIcon}>🖼</Text>
        </View>
      )}
    </View>
  );
};

// ─── ServiceChip ──────────────────────────────────────────────────────────────
const ServiceChip: React.FC<{ name: string }> = ({ name }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{name}</Text>
    </View>
  );
};

// ─── RatingBadge — compact pill ───────────────────────────────────────────────
const RatingBadge: React.FC<{ rating: number; reviews?: number }> = ({ rating, reviews }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  return (
    <View style={styles.ratingPill}>
      <Text style={styles.ratingStar}>★</Text>
      <Text style={styles.ratingVal}>{rating.toFixed(1)}</Text>
      {reviews !== undefined && (
        <Text style={styles.ratingReviews}> · {reviews}</Text>
      )}
    </View>
  );
};

// ─── FavoriteCard — the main service card ─────────────────────────────────────
const FavoriteCard: React.FC<{ item: Record<string, any>; index: number }> = ({ item, index }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const router    = useRouter();
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const chips = Array.isArray(item.services)
    ? (item.services as any[]).slice(0, 3)
    : [];

  // Staggered entrance
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 380,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 380,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn  = () =>
    Animated.spring(scaleAnim, { toValue: 0.975, useNativeDriver: true, speed: 40 }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

  return (
    <Animated.View
      style={[
        styles.cardWrap,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
        
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => router.push({
              pathname: '/service/[id]',
              params: { id: item.id }
            })}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          {/* Image */}
          <View style={styles.imageWrap}>
          <ServiceImage uri={item?.images?.[0] ?? ''} style={styles.cardImage} />

          {/* Verified badge on image */}
          {item.isVerified && (
            <View style={styles.verifiedOverlay}>
              <Text style={styles.verifiedOverlayText}>✔ Verified</Text>
            </View>
          )}

          {/* Rating badge on image */}
          <View style={styles.ratingOverlay}>
            <RatingBadge rating={item.rating ?? 0} reviews={item.reviews ?? 0} />
          </View>
        </View>
        </TouchableOpacity>
        

        {/* Body */}
        <View style={styles.cardBody}>
          {/* Name row */}
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name ?? ''}
          </Text>

          {/* Location */}
          <View style={styles.locationRow}>
            <Text style={styles.locationPin}>📍</Text>
            <Text style={styles.locationText} numberOfLines={1}>
              {item.location ?? 'Unknown location'}
            </Text>
          </View>

          {/* Service chips */}
          {chips.length > 0 && (
            <View style={styles.chipRow}>
              {chips.map((s: any, i: number) => (
                <ServiceChip
                  key={i}
                  name={typeof s === 'object' ? (s.name ?? '') : String(s)}
                />
              ))}
            </View>
          )}

          {/* Footer — CTA */}
          <TouchableOpacity
          onPress={() => router.push({
              pathname: '/booking/[id]',
              params: { id: item.id }
            })}
          >
            <View style={styles.cardFooter}>
            <Text style={styles.bookCta}>Book Now →</Text>
          </View>
          </TouchableOpacity>
          
        </View>
    </Animated.View>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────
const EmptyState: React.FC = () => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.emptyWrap}>
      <Animated.View style={[styles.emptyIconWrap, { transform: [{ scale: pulseAnim }] }]}>
        <Text style={styles.emptyIcon}>♡</Text>
      </Animated.View>
      <Text style={styles.emptyTitle}>No favorites yet</Text>
      <Text style={styles.emptySubtitle}>
        Tap the heart on any service you love{'\n'}to save it here for quick access.
      </Text>
    </View>
  );
};

// ─── Header Component ─────────────────────────────────────────────────────────
const ListHeader: React.FC<{ count: number }> = ({ count }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  return (
    <View style={styles.listHeader}>
      <View>
        <Text style={styles.headerTitle}>Favorites</Text>
        {count > 0 && (
          <Text style={styles.headerSubtitle}>
            {count} saved service{count !== 1 ? 's' : ''}
          </Text>
        )}
      </View>
      {count > 0 && (
        <View style={styles.headerCountBadge}>
          <Text style={styles.headerCountText}>{count}</Text>
        </View>
      )}
    </View>
  );
};

// ─── Loading State ────────────────────────────────────────────────────────────
const LoadingState: React.FC = () => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  return (
    <View style={styles.loadingWrap}>
      {/* Skeleton cards */}
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonImage} />
          <View style={styles.skeletonBody}>
            <View style={[styles.skeletonLine, { width: '70%' }]} />
            <View style={[styles.skeletonLine, { width: '45%', marginTop: 8 }]} />
            <View style={[styles.skeletonLine, { width: '55%', marginTop: 8 }]} />
          </View>
        </View>
      ))}
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function Favorite() {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const { favoriteItems, isLoading, loadFavoriteItems } = useFavoriteStore();

  useEffect(() => {
    const unsubscribePromise = loadFavoriteItems();
    return () => {
      unsubscribePromise.then((unsub) => unsub?.());
    };
  }, []);

  

  return (
    <View style={styles.root}>
      <StatusBar barStyle={theme.colors.statusBar} backgroundColor={theme.colors.background} />

      {isLoading ? (
        <>
          <ListHeader count={0} />
          <LoadingState />
        </>
      ) : (
        <FlatList
          data={favoriteItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <FavoriteCard item={item} index={index} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<ListHeader count={favoriteItems.length} />}
          ListEmptyComponent={<EmptyState />}
          // Slight over-scroll bounce feel
          bounces
          overScrollMode="never"
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const getStyles = (theme: any) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingTop: STATUS_H,
      paddingBottom: 70,
    },

    // ── List ──
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },

    // ── Header ──
    listHeader: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      paddingTop: 24,
      paddingBottom: 20,
      paddingHorizontal: 20,
    },
    headerTitle: {
      fontSize: 32,
      fontWeight: '800',
      color: theme.colors.text,
      letterSpacing: -0.8,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    headerCountBadge: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: `${theme.colors.primary}1A`,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    headerCountText: {
      color: theme.colors.primary,
      fontWeight: '800',
      fontSize: 15,
    },

    // ── Card ──
    cardWrap: {
      marginBottom: 18,
      borderRadius: 20,
      backgroundColor: theme.colors.card,
      // Layered shadow for depth
      shadowColor: theme.colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 12,
      elevation: 4,
    },
    imageWrap: {
      position: 'relative',
    },
    cardImage: {
      height: 200,
      width: '100%',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    },

    // Overlays on image
    verifiedOverlay: {
      position: 'absolute',
      top: 12,
      left: 12,
      backgroundColor: `${theme.colors.success}E6`,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 4,
      flexDirection: 'row',
      alignItems: 'center',
    },
    verifiedOverlayText: {
      color: theme.colors.white,
      fontSize: 11,
      fontWeight: '700',
    },
    ratingOverlay: {
      position: 'absolute',
      bottom: 12,
      right: 12,
    },
    ratingPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 5,
      gap: 3,
    },
    ratingStar: {
      color: theme.colors.warning,
      fontSize: 13,
    },
    ratingVal: {
      color: theme.colors.white,
      fontWeight: '700',
      fontSize: 13,
    },
    ratingReviews: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: 12,
    },

    // Card body
    cardBody: {
      padding: 16,
      gap: 6,
    },
    cardName: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      letterSpacing: -0.3,
    },

    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    locationPin: { fontSize: 12 },
    locationText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      flex: 1,
    },

    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 4,
    },
    chip: {
      backgroundColor: `${theme.colors.primary}1A`,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    chipText: {
      color: theme.colors.primary,
      fontSize: 11,
      fontWeight: '600',
    },

    cardFooter: {
      marginTop: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderLight,
      alignItems: 'flex-end',
    },
    bookCta: {
      color: theme.colors.primary,
      fontWeight: '700',
      fontSize: 14,
      letterSpacing: 0.1,
    },

    // ── Image ──
    shimmerLayer: {
      backgroundColor: theme.colors.gray200,
    },
    imageFallback: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.gray100,
    },
    imageFallbackIcon: { fontSize: 32 },

    // ── Skeleton loading ──
    loadingWrap: {
      paddingHorizontal: 20,
      paddingTop: 8,
      gap: 18,
    },
    skeletonCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 20,
      overflow: 'hidden',
      shadowColor: theme.colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    skeletonImage: {
      height: 200,
      backgroundColor: theme.colors.gray200,
    },
    skeletonBody: {
      padding: 16,
    },
    skeletonLine: {
      height: 14,
      backgroundColor: theme.colors.gray100,
      borderRadius: 7,
    },

    // ── Empty state ──
    emptyWrap: {
      alignItems: 'center',
      paddingTop: 60,
      paddingHorizontal: 32,
    },
    emptyIconWrap: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: `${theme.colors.primary}1A`,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    emptyIcon: {
      fontSize: 42,
      color: theme.colors.primary,
    },
    emptyTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: theme.colors.text,
      letterSpacing: -0.5,
      marginBottom: 10,
    },
    emptySubtitle: {
      fontSize: 15,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 23,
    },
  });
