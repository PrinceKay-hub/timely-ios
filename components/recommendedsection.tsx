// components/home/RecommendedSection.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useServiceDataStore } from '@/stores/serviceData';  
import { useHomeStore, ViewType } from '@/stores/home'; 
import { useRouter } from 'expo-router';

interface RecommendedSectionProps {
  user: Record<string, any>;
}

const PURPLE = '#8B5CF6';
const GREEN  = '#10B981';

// ─── Shared image component with shimmer fallback ─────────────────────────────
const ServiceImage: React.FC<{ uri: string; style: any }> = ({ uri, style }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  

  return (
    <View style={[style, { backgroundColor: '#f3f4f6', overflow: 'hidden' }]}>
      {!error && uri ? (
        <Image
          source={{ uri }}
          style={[StyleSheet.absoluteFill, { resizeMode: 'cover' }]}
          onLoadEnd={() => setLoading(false)}
          onError={() => { setError(true); setLoading(false); }}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.imageFallback]}>
          <Text style={styles.imageFallbackIcon}>🖼</Text>
        </View>
      )}
      {loading && !error && (
        <View style={[StyleSheet.absoluteFill, styles.shimmer]} />
      )}
    </View>
  );
};

// ─── Service chip ─────────────────────────────────────────────────────────────
const ServiceChip: React.FC<{ name: string }> = ({ name }) => (
  <View style={styles.chip}>
    <Text style={styles.chipText}>{name}</Text>
  </View>
);

// ─── Rating row ───────────────────────────────────────────────────────────────
const RatingRow: React.FC<{ rating: number; reviews?: number; small?: boolean }> = ({
  rating, reviews, small,
}) => (
  <View style={styles.ratingRow}>
    <Text style={{ fontSize: small ? 10 : 14 }}>⭐</Text>
    <Text style={[styles.ratingVal, small && styles.ratingValSm]}>
      {rating.toFixed(1)}
    </Text>
    {reviews !== undefined && !small && (
      <Text style={styles.reviewCount}>({reviews} reviews)</Text>
    )}
  </View>
);

// ─── Tile item ────────────────────────────────────────────────────────────────
const TileItem: React.FC<{ item: Record<string, any>; user: Record<string, any> }> = ({ item, user }) => {
  
  const chips = Array.isArray(item.services) ? (item.services as any[]).slice(0, 3) : [];
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.tileCard}
      onPress={() => router.push(`/service/${item.id}`)}
      activeOpacity={0.85}
    >
      <ServiceImage uri={item?.images?.[0] ?? ''} style={styles.tileImage} />
      <View style={styles.tileBody}>
        {/* Name + verified */}
        <View style={styles.rowBetween}>
          <Text style={styles.tileName} numberOfLines={1}>{item.name ?? ''}</Text>
          {item.isVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedIcon}>✔</Text>
            </View>
          )}
        </View>

        <RatingRow rating={item.rating ?? 0} reviews={item.reviews ?? 0} />

        {/* Location */}
        <View style={styles.locationRow}>
          <Text style={styles.locationIcon}>📍</Text>
          <Text style={styles.locationText} numberOfLines={1}>
            {item.location ?? 'Unknown location'}
          </Text>
        </View>

        {/* Service chips */}
        {chips.length > 0 && (
          <View style={styles.chipWrap}>
            {chips.map((s: any, i: number) => (
              <ServiceChip
                key={i}
                name={typeof s === 'object' ? (s.name ?? '') : String(s)}
              />
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// ─── Grid item ────────────────────────────────────────────────────────────────
const GRID_GAP    = 10;
const GRID_H_PAD  = 20;

const GridItem: React.FC<{ item: Record<string, any>; user: Record<string, any>; colWidth: number }> = ({
  item, user, colWidth,
}) => {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={[styles.gridCard, { width: colWidth }]}
      onPress={() => router.push(`/service/${item.id}`)}
      activeOpacity={0.85}
    >
      <ServiceImage uri={item?.images?.[0] ?? ''} style={styles.gridImage} />
      <View style={styles.gridBody}>
        <Text style={styles.gridName} numberOfLines={1}>{item.name ?? ''}</Text>
        <Text style={styles.gridLocation} numberOfLines={1}>{item.location ?? ''}</Text>
        <View style={styles.gridRatingPill}>
          <RatingRow rating={item.rating ?? 0} small />
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── List item ────────────────────────────────────────────────────────────────
const ListItem: React.FC<{ item: Record<string, any>; user: Record<string, any> }> = ({ item, user }) => {
  
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.listCard}
      onPress={() => router.push(`/service/${item.id}`)}
      activeOpacity={0.85}
    >
      <ServiceImage uri={item?.images?.[0] ?? ''} style={styles.listImage} />
      <View style={styles.listBody}>
        <Text style={styles.listName} numberOfLines={2}>{item.name ?? ''}</Text>
        <RatingRow rating={item.rating ?? 0} reviews={item.reviews ?? 0} />
        <Text style={styles.listLocation} numberOfLines={1}>
          {item.location ?? 'Unknown location'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// ─── Empty state ─────────────────────────────────────────────────────────────
const EmptyState: React.FC<{ onRefresh: () => void }> = ({ onRefresh }) => (
  <View style={styles.emptyWrap}>
    <View style={styles.emptyIconWrap}>
      <Text style={styles.emptyIcon}>🔍</Text>
    </View>
    <Text style={styles.emptyTitle}>No Content Available</Text>
    <Text style={styles.emptySubtitle}>
      Check back later for new updates{'\n'}and exciting content
    </Text>
    <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} activeOpacity={0.85}>
      <Text style={styles.refreshBtnText}>↺  Refresh</Text>
    </TouchableOpacity>
  </View>
);

// ─── View type switcher ───────────────────────────────────────────────────────
const ViewTypeSwitcher: React.FC = () => {
  const { viewType, setViewType } = useHomeStore();

  const btn = (type: ViewType, icon: string) => (
    <TouchableOpacity
      style={[styles.switchBtn, viewType === type && styles.switchBtnActive]}
      onPress={() => setViewType(type)}
      activeOpacity={0.7}
    >
      <Text style={[styles.switchIcon, viewType === type && styles.switchIconActive]}>
        {icon}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.switcher}>
      <Text style={styles.switcherTitle}>Top services</Text>
      <View style={styles.switcherButtons}>
        {btn('tile', '⊞')}
        {btn('grid', '⊟')}
        {btn('list', '☰')}
      </View>
    </View>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
export const RecommendedSection: React.FC<RecommendedSectionProps> = ({ user }) => {
  const { services, isLoading, error, fetchServiceData } = useServiceDataStore();
  const { viewType } = useHomeStore();

  React.useEffect(() => {
    if (!services.length && !isLoading && !error) {
      fetchServiceData();
    }
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={PURPLE} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.networkErrorWrap}>
        <Text style={styles.networkErrorText}>Network error.</Text>
        <TouchableOpacity onPress={fetchServiceData} style={styles.retryBtn}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!services || services.length === 0) {
    return <EmptyState onRefresh={fetchServiceData} />;
  }

  return (
    <View>
      <ViewTypeSwitcher />

      {viewType === 'tile' && (
        <FlatList
          data={services}
          keyExtractor={(_, i) => `tile-${i}`}
          renderItem={({ item }) => <TileItem item={item} user={user} />}
          contentContainerStyle={styles.listPad}
          scrollEnabled={false}
        />
      )}

      {viewType === 'grid' && (
        // FlatList with numColumns for grid layout
        <FlatList
          data={services}
          keyExtractor={(_, i) => `grid-${i}`}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item, index }) => {
            // Compute colWidth dynamically
            const { width } = require('react-native').Dimensions.get('window');
            const colWidth   = (width - GRID_H_PAD * 2 - GRID_GAP) / 2;
            return <GridItem item={item} user={user} colWidth={colWidth} />;
          }}
          contentContainerStyle={styles.listPad}
          scrollEnabled={false}
        />
      )}

      {viewType === 'list' && (
        <FlatList
          data={services}
          keyExtractor={(_, i) => `list-${i}`}
          renderItem={({ item }) => <ListItem item={item} user={user} />}
          contentContainerStyle={styles.listPad}
          scrollEnabled={false}
        />
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  listPad: { paddingHorizontal: 20, paddingBottom: 16 },

  // Shimmer / image fallback
  shimmer: { backgroundColor: '#e5e7eb' },
  imageFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' },
  imageFallbackIcon: { fontSize: 28 },

  // Rating
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  ratingVal: { fontWeight: '700', fontSize: 13 },
  ratingValSm: { fontSize: 10, color: '#fff' },
  reviewCount: { color: '#9ca3af', fontSize: 12 },

  // Chip
  chip: {
    backgroundColor: '#ede9fe',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: { color: PURPLE, fontSize: 11, fontWeight: '600' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },

  // Location
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  locationIcon: { fontSize: 12 },
  locationText: { color: '#9ca3af', fontSize: 12, flex: 1 },

  // Tile
  tileCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
  },
  tileImage: { height: 160, width: '100%' },
  tileBody: { padding: 16 },
  tileName: { fontSize: 17, fontWeight: '700', flex: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  verifiedBadge: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: `${GREEN}1a`,
    alignItems: 'center', justifyContent: 'center', marginLeft: 6,
  },
  verifiedIcon: { color: GREEN, fontSize: 11, fontWeight: '700' },

  // Grid
  gridRow: { gap: GRID_GAP, marginBottom: GRID_GAP },
  gridCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    overflow: 'hidden',
  },
  gridImage: { height: 120, width: '100%' },
  gridBody: { padding: 8, gap: 4 },
  gridName: { fontWeight: '700', fontSize: 13 },
  gridLocation: { fontSize: 11, color: '#9ca3af' },
  gridRatingPill: {
    alignSelf: 'flex-start',
    backgroundColor: PURPLE,
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginTop: 2,
  },

  // List
  listCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 16,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
  },
  listImage: { height: 120, width: 120 },
  listBody: { flex: 1, padding: 12, gap: 4, justifyContent: 'center' },
  listName: { fontSize: 14, fontWeight: '700' },
  listLocation: { color: '#9ca3af', fontSize: 12 },

  // Switcher
  switcher: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f9fafb',
    marginBottom: 4,
  },
  switcherTitle: { fontSize: 14, fontWeight: '700' },
  switcherButtons: { flexDirection: 'row', gap: 2 },
  switchBtn: {
    width: 36, height: 36, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  switchBtnActive: { backgroundColor: `${PURPLE}18` },
  switchIcon: { fontSize: 18, color: '#9ca3af' },
  switchIconActive: { color: PURPLE },

  // Empty state
  emptyWrap: { alignItems: 'center', padding: 40 },
  emptyIconWrap: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: `${PURPLE}1a`,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  emptyIcon: { fontSize: 44 },
  emptyTitle: { fontSize: 22, fontWeight: '700', marginBottom: 10 },
  emptySubtitle: { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  refreshBtn: {
    backgroundColor: PURPLE,
    borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  refreshBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  // Network error
  networkErrorWrap: { alignItems: 'center', padding: 32, gap: 12 },
  networkErrorText: { color: '#ef4444', fontSize: 15 },
  retryBtn: {
    backgroundColor: PURPLE,
    borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  retryBtnText: { color: '#fff', fontWeight: '600' },

  loadingWrap: {
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 15,
  },
});