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

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/service/${item.id}`)}
      activeOpacity={0.85}
    >
      {/* Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: item.images?.[0] }}
          style={styles.image}
          contentFit="cover"
          transition={200}
          placeholder={colors.surface || '#f3f4f6'}
        />
        <View style={[styles.favoriteIcon, { backgroundColor: colors.background }]}>
          <Ionicons name="heart-outline" size={20} color={colors.primary} />
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.isVerified && (
            <Ionicons name="checkmark-circle" size={16} color={colors.success || '#10B981'} style={styles.verifiedIcon} />
          )}
        </View>

        <View style={styles.ratingRow}>
          <Ionicons name="star" size={14} color="gold" />
          <Text style={[styles.rating, { color: colors.text }]}>
            {item.rating?.toFixed(1) || '0.0'}
          </Text>
          <Text style={[styles.reviews, { color: colors.textSecondary }]}>
            ({item.totalReviews || 0} reviews)
          </Text>
          <View style={styles.distance}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.distanceText, { color: colors.textSecondary }]}>
              {formatDistance(item.distance)}
            </Text>
          </View>
        </View>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.district || 'Unknown location'}
            {item.landmark ? `, ${item.landmark}` : ''}
          </Text>
        </View>

        {/* Service chips */}
        {services.length > 0 && (
          <View style={styles.serviceChips}>
            {services.map((service: any, i: number) => (
              <View key={i} style={[styles.chip, { backgroundColor: colors.primaryLight || `${colors.primary}18` }]}>
                <Text style={[styles.chipText, { color: '#fff' }]}>
                  {typeof service === 'object' ? service.name : String(service)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card || colors.background,
      borderRadius: 15,
      marginBottom: 16,
      overflow: 'hidden',
      shadowColor: colors.shadow || '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    imageContainer: {
      position: 'relative',
    },
    image: {
      width: '100%',
      height: 160,
    },
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