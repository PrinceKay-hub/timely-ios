// components/home/RecommendedSection.tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useServiceDataStore } from '@/stores/serviceData';
import { useHomeStore, ViewType } from '@/stores/home';
import { useRouter } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';

interface RecommendedSectionProps {
  user: Record<string, any>;
}

// ─── Shared image component ─────────────────────────────────────────────
const ServiceImage: React.FC<{
  uri: string;
  style: any;
  colors: any;
}> = ({ uri, style, colors }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <View
      style={[
        style,
        {
          backgroundColor: colors.surface || '#f3f4f6',
          overflow: 'hidden',
        },
      ]}
    >
      {!error && uri ? (
        <Image
          source={{ uri }}
          style={[StyleSheet.absoluteFill, { resizeMode: 'cover' }]}
          onLoadEnd={() => setLoading(false)}
          onError={() => { setError(true); setLoading(false); }}
        />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.surface || '#f3f4f6',
            },
          ]}
        >
          <Text style={{ fontSize: 28 }}>🖼</Text>
        </View>
      )}
      {loading && !error && (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.border || '#e5e7eb' },
          ]}
        />
      )}
    </View>
  );
};

// ─── Service chip ──────────────────────────────────────────────────────
const ServiceChip: React.FC<{ name: string; colors: any }> = ({ name, colors }) => (
  <View
    style={{
      backgroundColor: colors.primaryLight || `${colors.primary}1a`,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
    }}
  >
    <Text style={{ color: colors.white, fontSize: 11, fontWeight: '600' }}>
      {name}
    </Text>
  </View>
);

// ─── Rating row ────────────────────────────────────────────────────────
const RatingRow: React.FC<{
  rating: number;
  reviews?: number;
  small?: boolean;
  colors: any;
}> = ({ rating, reviews, small, colors }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
    <Text style={{ fontSize: small ? 10 : 14 }}>⭐</Text>
    <Text
      style={{
        fontWeight: '700',
        fontSize: small ? 10 : 13,
        color: colors.text,
      }}
    >
      {rating.toFixed(1)}
    </Text>
    {reviews !== undefined && !small && (
      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
        ({reviews} reviews)
      </Text>
    )}
  </View>
);

// ─── Tile item ──────────────────────────────────────────────────────────
const TileItem: React.FC<{
  item: Record<string, any>;
  user: Record<string, any>;
  styles: any;
  colors: any;
}> = ({ item, user, styles, colors }) => {
  const chips = Array.isArray(item.services) ? item.services.slice(0, 3) : [];
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.tileCard}
      onPress={() => router.push(`/service/${item.id}`)}
      activeOpacity={0.85}
    >
      <ServiceImage uri={item?.images?.[0] ?? ''} style={styles.tileImage} colors={colors} />
      <View style={styles.tileBody}>
        <View style={styles.rowBetween}>
          <Text style={styles.tileName} numberOfLines={1}>
            {item.name ?? ''}
          </Text>
          {item.isVerified && (
            <View
              style={[
                styles.verifiedBadge,
                { backgroundColor: `${colors.success}1a` },
              ]}
            >
              <Text style={{ color: colors.success, fontSize: 11, fontWeight: '700' }}>
                ✔
              </Text>
            </View>
          )}
        </View>

        <RatingRow rating={item.rating ?? 0} reviews={item.reviews ?? 0} colors={colors} />

        <View style={styles.locationRow}>
          <Text style={styles.locationIcon}>📍</Text>
          <Text style={styles.locationText} numberOfLines={1}>
            {item.location ?? 'Unknown location'}
          </Text>
        </View>

        {chips.length > 0 && (
          <View style={styles.chipWrap}>
            {chips.map((s: any, i: number) => (
              <ServiceChip
                key={i}
                name={typeof s === 'object' ? s.name ?? '' : String(s)}
                colors={colors}
              />
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// ─── Grid item ──────────────────────────────────────────────────────────
const GridItem: React.FC<{
  item: Record<string, any>;
  user: Record<string, any>;
  colWidth: number;
  styles: any;
  colors: any;
}> = ({ item, user, colWidth, styles, colors }) => {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={[styles.gridCard, { width: colWidth }]}
      onPress={() => router.push(`/service/${item.id}`)}
      activeOpacity={0.85}
    >
      <ServiceImage uri={item?.images?.[0] ?? ''} style={styles.gridImage} colors={colors} />
      <View style={styles.gridBody}>
        <Text style={styles.gridName} numberOfLines={1}>
          {item.name ?? ''}
        </Text>
        <Text style={styles.gridLocation} numberOfLines={1}>
          {item.location ?? ''}
        </Text>
        <View style={[styles.gridRatingPill, { backgroundColor: colors.primary }]}>
          <RatingRow rating={item.rating ?? 0} small colors={colors} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── List item ──────────────────────────────────────────────────────────
const ListItem: React.FC<{
  item: Record<string, any>;
  user: Record<string, any>;
  styles: any;
  colors: any;
}> = ({ item, user, styles, colors }) => {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.listCard}
      onPress={() => router.push(`/service/${item.id}`)}
      activeOpacity={0.85}
    >
      <ServiceImage uri={item?.images?.[0] ?? ''} style={styles.listImage} colors={colors} />
      <View style={styles.listBody}>
        <Text style={styles.listName} numberOfLines={2}>
          {item.name ?? ''}
        </Text>
        <RatingRow rating={item.rating ?? 0} reviews={item.reviews ?? 0} colors={colors} />
        <Text style={styles.listLocation} numberOfLines={1}>
          {item.location ?? 'Unknown location'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// ─── Empty state ────────────────────────────────────────────────────────
const EmptyState: React.FC<{
  onRefresh: () => void;
  styles: any;
  colors: any;
}> = ({ onRefresh, styles, colors }) => (
  <View style={styles.emptyWrap}>
    <View
      style={[
        styles.emptyIconWrap,
        { backgroundColor: `${colors.primary}1a` },
      ]}
    >
      <Text style={styles.emptyIcon}>🔍</Text>
    </View>
    <Text style={[styles.emptyTitle, { color: colors.text }]}>No Content Available</Text>
    <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
      Check back later for new updates{'\n'}and exciting content
    </Text>
    <TouchableOpacity
      style={[styles.refreshBtn, { backgroundColor: colors.primary }]}
      onPress={onRefresh}
      activeOpacity={0.85}
    >
      <Text style={styles.refreshBtnText}>↺  Refresh</Text>
    </TouchableOpacity>
  </View>
);

// ─── View type switcher ─────────────────────────────────────────────────
const ViewTypeSwitcher: React.FC<{
  styles: any;
  colors: any;
}> = ({ styles, colors }) => {
  const { viewType, setViewType } = useHomeStore();

  const btn = (type: ViewType, icon: string) => (
    <TouchableOpacity
      style={[
        styles.switchBtn,
        viewType === type && [styles.switchBtnActive, { backgroundColor: `${colors.primary}18` }],
      ]}
      onPress={() => setViewType(type)}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.switchIcon,
          viewType === type && { color: colors.primary },
        ]}
      >
        {icon}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.switcher, { backgroundColor: colors.surface }]}>
      <Text style={[styles.switcherTitle, { color: colors.text }]}>Top services</Text>
      <View style={styles.switcherButtons}>
        {btn('tile', '⊞')}
        {btn('grid', '⊟')}
        {btn('list', '☰')}
      </View>
    </View>
  );
};

// ─── Main component ─────────────────────────────────────────────────────
export const RecommendedSection: React.FC<RecommendedSectionProps> = ({ user }) => {
  const { services, isLoading, error, fetchServiceData } = useServiceDataStore();
  const { viewType } = useHomeStore();
  const { theme } = useTheme();

  // Build dynamic styles based on the theme
  const styles = useMemo(() => createStyles(theme), [theme]);
  const colors = theme.colors;

  React.useEffect(() => {
    if (!services.length && !isLoading && !error) {
      fetchServiceData();
    }
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.networkErrorWrap}>
        <Text style={[styles.networkErrorText, { color: colors.error || '#ef4444' }]}>
          Network error.
        </Text>
        <TouchableOpacity
          onPress={fetchServiceData}
          style={[styles.retryBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!services || services.length === 0) {
    return <EmptyState onRefresh={fetchServiceData} styles={styles} colors={colors} />;
  }

  return (
    <View>
      <ViewTypeSwitcher styles={styles} colors={colors} />

      {viewType === 'tile' && (
        <FlatList
          data={services}
          keyExtractor={(_, i) => `tile-${i}`}
          renderItem={({ item }) => (
            <TileItem item={item} user={user} styles={styles} colors={colors} />
          )}
          contentContainerStyle={styles.listPad}
          scrollEnabled={false}
        />
      )}

      {viewType === 'grid' && (
        <FlatList
          data={services}
          keyExtractor={(_, i) => `grid-${i}`}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item, index }) => {
            const { width } = Dimensions.get('window');
            const GRID_GAP = 10;
            const GRID_H_PAD = 20;
            const colWidth = (width - GRID_H_PAD * 2 - GRID_GAP) / 2;
            return (
              <GridItem
                item={item}
                user={user}
                colWidth={colWidth}
                styles={styles}
                colors={colors}
              />
            );
          }}
          contentContainerStyle={styles.listPad}
          scrollEnabled={false}
        />
      )}

      {viewType === 'list' && (
        <FlatList
          data={services}
          keyExtractor={(_, i) => `list-${i}`}
          renderItem={({ item }) => (
            <ListItem item={item} user={user} styles={styles} colors={colors} />
          )}
          contentContainerStyle={styles.listPad}
          scrollEnabled={false}
        />
      )}
    </View>
  );
};

// ─── Styles factory ──────────────────────────────────────────────────────
const createStyles = (theme: any) => {
  const { colors } = theme;

  return StyleSheet.create({
    listPad: { paddingHorizontal: 20, paddingBottom: 16 },

    // Rating
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
    ratingVal: { fontWeight: '700', fontSize: 13, color: colors.text },
    ratingValSm: { fontSize: 10, color: '#fff' },
    reviewCount: { color: colors.textSecondary, fontSize: 12 },

    // Chip
    chip: {
      backgroundColor: colors.primaryLight || `${colors.primary}1a`,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    chipText: { color: colors.primary, fontSize: 11, fontWeight: '600' },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },

    // Location
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    locationIcon: { fontSize: 12 },
    locationText: { color: colors.textSecondary, fontSize: 12, flex: 1 },

    // Tile
    tileCard: {
      backgroundColor: colors.card || colors.background,
      borderRadius: 15,
      marginBottom: 16,
      shadowColor: colors.shadow || '#000',
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 3,
      overflow: 'hidden',
    },
    tileImage: { height: 160, width: '100%' },
    tileBody: { padding: 16 },
    tileName: { fontSize: 17, fontWeight: '700', color: colors.text, flex: 1 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    verifiedBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 6,
    },

    // Grid
    gridRow: { gap: 10, marginBottom: 10 },
    gridCard: {
      backgroundColor: colors.card || colors.background,
      borderRadius: 15,
      overflow: 'hidden',
    },
    gridImage: { height: 120, width: '100%' },
    gridBody: { padding: 8, gap: 4 },
    gridName: { fontWeight: '700', fontSize: 13, color: colors.text },
    gridLocation: { fontSize: 11, color: colors.textSecondary },
    gridRatingPill: {
      alignSelf: 'flex-start',
      borderRadius: 20,
      paddingHorizontal: 6,
      paddingVertical: 3,
      marginTop: 2,
    },

    // List
    listCard: {
      backgroundColor: colors.card || colors.background,
      borderRadius: 15,
      marginBottom: 16,
      flexDirection: 'row',
      shadowColor: colors.shadow || '#000',
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 3,
      overflow: 'hidden',
    },
    listImage: { height: 120, width: 120 },
    listBody: { flex: 1, padding: 12, gap: 4, justifyContent: 'center' },
    listName: { fontSize: 14, fontWeight: '700', color: colors.text },
    listLocation: { color: colors.textSecondary, fontSize: 12 },

    // Switcher
    switcher: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 10,
      marginBottom: 4,
    },
    switcherTitle: { fontSize: 14, fontWeight: '700' },
    switcherButtons: { flexDirection: 'row', gap: 2 },
    switchBtn: {
      width: 36,
      height: 36,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    switchBtnActive: {},
    switchIcon: { fontSize: 18, color: colors.textSecondary },

    // Empty state
    emptyWrap: { alignItems: 'center', padding: 40 },
    emptyIconWrap: {
      width: 100,
      height: 100,
      borderRadius: 50,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    emptyIcon: { fontSize: 44 },
    emptyTitle: { fontSize: 22, fontWeight: '700', marginBottom: 10 },
    emptySubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
    refreshBtn: {
      borderRadius: 12,
      paddingHorizontal: 24,
      paddingVertical: 12,
    },
    refreshBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

    // Network error
    networkErrorWrap: { alignItems: 'center', padding: 32, gap: 12 },
    networkErrorText: { fontSize: 15 },
    retryBtn: {
      borderRadius: 10,
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    retryBtnText: { color: '#fff', fontWeight: '600' },

    // Loading
    loadingWrap: { alignItems: 'center', padding: 40, gap: 16 },
    loadingText: { fontSize: 15 },
  });
};