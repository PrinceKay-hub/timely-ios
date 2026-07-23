import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBookingFormStore } from '@/stores/bookingFormStore';
import { useTheme } from '@/providers/ThemeProvider';
import { Image } from 'expo-image';

export const BookingHeader = () => {
  const router = useRouter();
  const providerData = useBookingFormStore((state) => state.providerData);
  const { theme } = useTheme();
  const colors = theme.colors;

  // Create dynamic styles based on the theme
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [imageError, setImageError] = useState(false);

  const getImageUrl = (): string | null => {
    const images = providerData.images;
    if (!images || images.length === 0) return null;

    const first = images[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object') {
      return first.url || first.uri || null;
    }
    return null;
  };

  const imageUrl = getImageUrl();

  return (
    <View>
      <View style={[styles.topBar, { backgroundColor: colors.primary }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.iconButton, { backgroundColor: '#fff' }]}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: '#fff' }]}>Book Appointment</Text>
        <View style={[{ backgroundColor: colors.primary }]}>
          <Ionicons name="ellipsis-horizontal" size={24} color={colors.primary} />
        </View>
      </View>

      <View style={[styles.providerCard, { backgroundColor: colors.card }]}>
        {imageUrl && !imageError ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.providerImage}
            contentFit="cover"
            transition={200}
            placeholder={colors.surface || '#f3f4f6'}
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={[styles.providerImage, styles.placeholderImage, { backgroundColor: colors.surface }]}>
            <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>📷</Text>
          </View>
        )}
        <View style={styles.providerInfo}>
          <Text style={[styles.providerName, { color: colors.text }]}>{providerData.name || ''}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
              {providerData.location || ''}
            </Text>
          </View>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color="gold" />
            <Text style={[styles.ratingText, { color: colors.text }]}>
              {providerData.rating?.toFixed(1) || '0.0'}
            </Text>
            <Text style={[styles.reviewCount, { color: colors.textSecondary }]}>
              ({providerData.totalReviews || 0} reviews)
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    topBar: {
      paddingTop: 50,
      paddingBottom: 20,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
    },
    iconButton: {
      borderRadius: 20,
      padding: 8,
      shadowColor: colors.shadow || '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
    },
    providerCard: {
      flexDirection: 'row',
      margin: 20,
      padding: 16,
      borderRadius: 15,
      shadowColor: colors.shadow || '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    providerImage: {
      width: 80,
      height: 80,
      borderRadius: 12,
    },
    providerInfo: {
      flex: 1,
      marginLeft: 16,
      justifyContent: 'center',
    },
    providerName: {
      fontWeight: 'bold',
      fontSize: 16,
      marginBottom: 4,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    locationText: {
      fontSize: 12,
      marginLeft: 4,
      flex: 1,
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    ratingText: {
      fontWeight: 'bold',
      marginLeft: 4,
    },
    reviewCount: {
      fontSize: 12,
      marginLeft: 4,
    },
    placeholderImage: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderText: {
      fontSize: 24,
    },
  });