import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const PURPLE = '#8B5CF6';

interface ResultCardProps {
  item: any;
}

export const ResultCard: React.FC<ResultCardProps> = ({ item }) => {
  const router = useRouter();

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
          resizeMode="cover"
        />
        <View style={styles.favoriteIcon}>
          <Ionicons name="heart-outline" size={20} color={PURPLE} />
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {item.name}
          </Text>
          {item.isVerified && (
            <Ionicons name="checkmark-circle" size={16} color="#10B981" style={styles.verifiedIcon} />
          )}
        </View>

        <View style={styles.ratingRow}>
          <Ionicons name="star" size={14} color="gold" />
          <Text style={styles.rating}>{item.rating?.toFixed(1) || '0.0'}</Text>
          <Text style={styles.reviews}>({item.reviews || 0} reviews)</Text>
          <View style={styles.distance}>
            <Ionicons name="location-outline" size={14} color="gray" />
            <Text style={styles.distanceText}>{formatDistance(item.distance)}</Text>
          </View>
        </View>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color="gray" />
          <Text style={styles.locationText} numberOfLines={1}>
            {item.location || 'Unknown location'}
          </Text>
        </View>

        {/* Service chips */}
        {services.length > 0 && (
          <View style={styles.serviceChips}>
            {services.map((service: any, i: number) => (
              <View key={i} style={styles.chip}>
                <Text style={styles.chipText}>
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 15,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',  // Changed from '100' to '100%' (string)
    height: 160,
  },
  favoriteIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'white',
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
    flex: 1, // This is okay on Text in newer RN versions, but if it causes issues, move flex to container
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
    color: 'gray',
    fontSize: 13,
    marginLeft: 4,
  },
  distance: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  distanceText: {
    color: 'gray',
    fontSize: 13,
    marginLeft: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  locationText: {
    color: 'gray',
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
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  chipText: {
    color: PURPLE,
    fontSize: 12,
    fontWeight: '600',
  },
});