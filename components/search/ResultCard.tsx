import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { Image } from 'expo-image';

interface ResultCardProps {
  item: any;
}


export const ResultCard: React.FC<ResultCardProps> = ({ item }) => {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = theme.colors;

  // Create dynamic styles based on the theme
  const styles = useMemo(() => createStyles(colors), [colors]);

  const formatDistance = (distanceInKm: number) => {
    if (!distanceInKm) return 'N/A';
    if (distanceInKm < 1) return `${Math.round(distanceInKm * 1000)} m`;
    if (distanceInKm < 10) return `${distanceInKm.toFixed(1)} km`;
    return `${Math.round(distanceInKm)} km`;
  };

  const services = item.services?.slice(0, 3) || [];


  // ─── Rating row ────────────────────────────────────────────────────────
const RatingRow = React.memo<{ rating: number; reviews?: number; small?: boolean; colors: any }>(
  ({ rating, reviews, small, colors }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Text style={{ fontSize: small ? 10 : 14 }}>⭐</Text>
      <Text style={{ fontWeight: '700', fontSize: small ? 10 : 13, color: colors.text }}>
        {rating.toFixed(1)}
      </Text>
      {reviews !== undefined && !small && (
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>({reviews} reviews)</Text>
      )}
      <View style={styles.distance}>
        <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
        <Text style={[styles.distanceText, { color: colors.textSecondary }]}>
          {formatDistance(item.distance)}
        </Text>
      </View>
    </View>
  )
);

  return (
    <TouchableOpacity
      style={styles.listCard}
      onPress={() => router.push(`/service/${item.id}`)}
      activeOpacity={0.85}
    >
      {/* Image */}
      <View style={styles.tileImage}>
        <Image
          source={{ uri: item.images?.[0] }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
          placeholder={colors.surface || '#f3f4f6'}
        />
        <View style={[styles.favoriteIcon, { backgroundColor: colors.background }]}>
          <Ionicons name="heart-outline" size={20} color={colors.primary} />
        </View>
      </View>
      <View style={styles.listBody}>
        <Text style={styles.listName} numberOfLines={2}>
          {item.name ?? ''}
        </Text>
        <RatingRow rating={item.rating ?? 0} reviews={item.totalReviews ?? 0} colors={colors} />
        <Text style={styles.listLocation} numberOfLines={2}>
          {item.district ?? 'Unknown location'}
          {item.landmark ? `, ${item.landmark}` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
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
    tileImage: { height: 120, width: '35%' },
    image: {
      width: '100%',
    },
    listBody: { flex: 1, padding: 12, gap: 10, justifyContent: 'center' },
    listName: { fontSize: 14, fontWeight: '700', color: colors.text },
    listLocation: { color: colors.textSecondary, fontSize: 12 },

    favoriteIcon: {
      position: 'absolute',
      top: 12,
      right: 12,
      borderRadius: 20,
      padding: 8,
    },
    content: {
      padding: 16,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      flex: 1,
    },
    verifiedIcon: {
      marginLeft: 8,
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      flexWrap: 'wrap',
    },
    rating: {
      fontWeight: 'bold',
      marginLeft: 4,
    },
    reviews: {
      fontSize: 13,
      marginLeft: 4,
    },
    distance: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 'auto',
    },
    distanceText: {
      fontSize: 13,
      marginLeft: 2,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
    },
    locationText: {
      fontSize: 13,
      marginLeft: 4,
      flex: 1,
    },
    serviceChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 12,
    },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      marginRight: 6,
      marginBottom: 4,
    },
    chipText: {
      fontSize: 12,
      fontWeight: '600',
    },
  });