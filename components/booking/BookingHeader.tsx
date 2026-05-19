import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBookingFormStore } from '@/stores/bookingFormStore';

const PURPLE = '#8B5CF6';

export const BookingHeader = () => {
  const router = useRouter();
  const providerData = useBookingFormStore((state) => state.providerData);
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
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.title}>Book Appointment</Text>
        <View style={styles.iconButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color={PURPLE} />
        </View>
      </View>

      <View style={styles.providerCard}>
        {imageUrl && !imageError ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.providerImage}
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={[styles.providerImage, styles.placeholderImage]}>
            <Text style={styles.placeholderText}>📷</Text>
          </View>
        )}
        <View style={styles.providerInfo}>
          <Text style={styles.providerName}>{providerData.name || ''}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color="gray" />
            <Text style={styles.locationText} numberOfLines={1}>
              {providerData.location || ''}
            </Text>
          </View>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color="gold" />
            <Text style={styles.ratingText}>{providerData.rating?.toFixed(1) || '0.0'}</Text>
            <Text style={styles.reviewCount}>({providerData.totalReviews || 0} reviews)</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  topBar: {
    backgroundColor: PURPLE,
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
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 8,
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  providerCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    margin: 20,
    padding: 16,
    borderRadius: 15,
    shadowColor: '#000',
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
    color: 'gray',
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
    color: 'gray',
    fontSize: 12,
    marginLeft: 4,
  },
  placeholderImage: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 24,
    color: '#ccc',
  },
});