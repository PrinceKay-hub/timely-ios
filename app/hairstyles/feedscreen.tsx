import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Animated,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { fetchAllHairstyles } from '@/services/hairstyleService';
import { useTheme } from '@/providers/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 8;
const GRID_COLUMNS = 3;
const GRID_ITEM_SIZE = (SCREEN_WIDTH - GRID_GAP * (GRID_COLUMNS + 1)) / GRID_COLUMNS;
const COLLECTION_COLUMNS = 2;
const COLLECTION_ITEM_SIZE = (SCREEN_WIDTH - GRID_GAP * (COLLECTION_COLUMNS + 1)) / COLLECTION_COLUMNS;

// --- Types (matches your Firestore document shape) ---
export interface HairstyleImageSet {
  thumb: string;
  card: string;
  full: string;
}

export interface Hairstyle {
  id: string;
  name: string;
  category: string;
  styleId?: string;
  images: HairstyleImageSet;
  createdAt?: any;
}

interface Collection {
  category: string;
  displayName: string;
  coverImage: string;
  count: number;
  styles: Hairstyle[];
}

type Mode = 'collections' | 'grid' | 'viewer';

// --- Helpers ---
const formatCategoryName = (category: string) =>
  category
    .split(/[_-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const groupByCategory = (hairstyles: Hairstyle[]): Collection[] => {
  const map = new Map<string, Hairstyle[]>();
  for (const style of hairstyles) {
    const key = style.category || 'uncategorized';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(style);
  }
  return Array.from(map.entries())
    .map(([category, styles]) => ({
      category,
      displayName: formatCategoryName(category),
      coverImage: styles[0]?.images.card,
      count: styles.length,
      styles,
    }))
    .sort((a, b) => b.count - a.count);
};

// --- Simple crossfade wrapper ---
const FadeIn: React.FC<{ children: React.ReactNode; deps: unknown[] }> = ({ children, deps }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return <Animated.View style={{ flex: 1, opacity }}>{children}</Animated.View>;
};

// --- Main component ---
const CollectionsExplorer: React.FC = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [hairstyles, setHairstyles] = useState<Hairstyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('collections');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState(0);

  const viewerListRef = useRef<FlatList>(null);

  const handleBack = () => router.back();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await fetchAllHairstyles();
        setHairstyles(data);
        setError(null);
      } catch (e) {
        console.error('Failed to load hairstyles:', e);
        setError('Could not load hairstyles. Pull down to try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const collections = useMemo(() => groupByCategory(hairstyles), [hairstyles]);
  const activeCollection = useMemo(
    () => collections.find((c) => c.category === activeCategory) ?? null,
    [collections, activeCategory]
  );

  const openCollection = useCallback((category: string) => {
    setActiveCategory(category);
    setMode('grid');
  }, []);

  const openViewer = useCallback((index: number) => {
    setViewerIndex(index);
    setMode('viewer');
  }, []);

  const goBack = useCallback(() => {
    if (mode === 'viewer') {
      setMode('grid');
    } else if (mode === 'grid') {
      setMode('collections');
      setActiveCategory(null);
    }
  }, [mode]);

  useEffect(() => {
    if (mode === 'viewer' && viewerListRef.current) {
      requestAnimationFrame(() => {
        viewerListRef.current?.scrollToIndex({ index: viewerIndex, animated: false });
      });
    }
  }, [mode, viewerIndex]);

  // --- Loading / error states ---
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.centered, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.viewerMeta, { color: colors.textSecondary }]}>Loading Hairstyles...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.centered, { backgroundColor: colors.background }]}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // --- Header ---
  const headerTitle =
    mode === 'collections' ? 'Hairstyles' : mode === 'grid' ? activeCollection?.displayName ?? '' : '';

  const isDark = theme.dark;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]} >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {mode !== 'viewer' && (
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          {mode !== 'collections' && (
            <TouchableOpacity onPress={goBack} hitSlop={12} style={[styles.backButton, { backgroundColor: '#fff' }]}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>

          )}
          {mode === 'collections' && 
          <TouchableOpacity onPress={handleBack} style={[styles.backButton, { backgroundColor: '#fff' }]}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>}
          <Text style={[styles.headerTitle, { color: colors.text }]}>{headerTitle}</Text>
        </View>
      )}

      {mode === 'collections' && (
        <FadeIn deps={[mode]}>
          <FlatList
            data={collections}
            keyExtractor={(item) => item.category}
            numColumns={COLLECTION_COLUMNS}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={{ gap: GRID_GAP }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.collectionCard,
                  {
                    width: COLLECTION_ITEM_SIZE,
                    height: COLLECTION_ITEM_SIZE * 1.2,
                    backgroundColor: colors.surface,
                  },
                ]}
                onPress={() => openCollection(item.category)}
                activeOpacity={0.85}
              >
                <Image source={{ uri: item.coverImage }} style={styles.collectionImage} contentFit="cover" transition={200} />
                <View style={[styles.collectionOverlay, { backgroundColor: 'rgba(0,0,0,0.35)' }]}>
                  <Text style={styles.collectionName} numberOfLines={1}>{item.displayName}</Text>
                  <Text style={styles.collectionCount}>{item.count} styles</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </FadeIn>
      )}

      {mode === 'grid' && activeCollection && (
        <FadeIn deps={[mode, activeCategory]}>
          <FlatList
            data={activeCollection.styles}
            keyExtractor={(item) => item.id}
            numColumns={GRID_COLUMNS}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={{ gap: GRID_GAP }}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[styles.gridImageWrapper, { width: GRID_ITEM_SIZE, height: GRID_ITEM_SIZE, marginBottom: GRID_GAP }]}
                onPress={() => openViewer(index)}
                activeOpacity={0.85}
              >
                <Image
                  source={{ uri: item.images.thumb }}
                  style={styles.gridImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={150}
                />
              </TouchableOpacity>
            )}
          />
        </FadeIn>
      )}

      {mode === 'viewer' && activeCollection && (
        <View style={[styles.viewerContainer, { backgroundColor: '#000' }]}>
          <FlatList
            ref={viewerListRef}
            data={activeCollection.styles}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={viewerIndex}
            getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setViewerIndex(index);
            }}
            renderItem={({ item }) => (
              <View style={{ width: SCREEN_WIDTH }}>
                <Image
                  source={{ uri: item.images.full }}
                  placeholder={{ uri: item.images.card }}
                  style={styles.viewerImage}
                  contentFit="contain"
                  transition={200}
                />
              </View>
            )}
          />

          {/* Overlaid chrome */}
          <SafeAreaView style={styles.viewerChrome} pointerEvents="box-none">
            <TouchableOpacity onPress={goBack} style={[styles.closeButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]} hitSlop={12}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <View style={[styles.viewerCaption, { backgroundColor: 'rgba(0,0,0,0.35)' }]}>
              <Text style={styles.viewerName}>{activeCollection.styles[viewerIndex]?.name}</Text>
              <Text style={styles.viewerMeta}>
                {viewerIndex + 1} of {activeCollection.styles.length} · {activeCollection.displayName}
              </Text>
            </View>
          </SafeAreaView>
        </View>
      )}
    </View>
  );
};

// ─── Style factory ──────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    errorText: { fontSize: 16, textAlign: 'center', paddingHorizontal: 32 },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 12,
      paddingTop: 50,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
    },
    headerButton: { width: 32, alignItems: 'flex-start', justifyContent: 'center' },
    headerButtonText: { fontSize: 30, fontWeight: '400', lineHeight: 30 },
    headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' },

    gridContent: { padding: GRID_GAP },

    collectionCard: {
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: GRID_GAP,
    },
    collectionImage: { width: '100%', height: '100%' },
    collectionOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      padding: 10,
    },
    collectionName: { color: 'white', fontWeight: '700', fontSize: 15 },
    collectionCount: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },

    gridImageWrapper: { borderRadius: 8, overflow: 'hidden', backgroundColor: colors.surface },
    gridImage: { width: '100%', height: '100%', borderRadius: 8 },

    viewerContainer: { flex: 1 },
    viewerImage: { width: '100%', height: '100%' },
    viewerChrome: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'space-between',
    },
    closeButton: {
      alignSelf: 'flex-end',
      margin: 16,
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
    viewerCaption: {
      padding: 20,
      paddingBottom: 28,
    },
    viewerName: { color: 'white', fontSize: 20, fontWeight: '700' },
    viewerMeta: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 4 },

    backButton: {
      borderRadius: 20,
      padding: 8,
      marginRight: 16,
    },
  });

export default CollectionsExplorer;