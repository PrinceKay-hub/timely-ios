import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useServiceRegistrationStore } from '@/stores/serviceRegistrationStore';
import { ServiceEntity } from '@/types/service';

const PURPLE = '#8B5CF6';

interface Props {
  service: ServiceEntity;
}

export const ServiceOverviewCard: React.FC<Props> = ({ service }) => {
  const router = useRouter();
  const { setCurrentServiceForEdit, deleteExistingService, isLoading } = useServiceRegistrationStore();

  const handleEdit = () => {
    setCurrentServiceForEdit(service);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Service',
      'Are you sure you want to delete this service? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteExistingService(service.id);
            router.back(); // Go back to profile after deletion
          },
        },
      ]
    );
  };

  const firstImage = service.images?.[0];
  const firstServices = service.services?.slice(0, 3) || [];

  return (
    <View style={styles.card}>
      <View style={styles.imageContainer}>
        {firstImage ? (
          <Image source={{ uri: firstImage }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.placeholderImage]}>
            <Ionicons name="image-outline" size={40} color="#ccc" />
          </View>
        )}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
            <Ionicons name="create-outline" size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.deleteButton, isLoading && styles.disabledButton]}
            onPress={handleDelete}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="trash-outline" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>{service.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: service.status === 'pending' ? '#ff9800' : '#4caf50' }]}>
            <Text style={styles.statusText}>{service.status}</Text>
          </View>
        </View>

        <View style={styles.ratingRow}>
          <Ionicons name="star" size={16} color="gold" />
          <Text style={styles.rating}>{service.rating?.toFixed(1) || '0.0'}</Text>
          <Text style={styles.reviews}>({service.totalReviews || 0} reviews)</Text>
        </View>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color="gray" />
          <Text style={styles.location} numberOfLines={1}>{service.location || 'Unknown location'}</Text>
        </View>

        {firstServices.length > 0 && (
          <View style={styles.serviceChips}>
            {firstServices.map((svc, idx) => (
              <View key={idx} style={styles.chip}>
                <Text style={styles.chipText}>{svc.name}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 15,
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
    width: '100%',
    height: 180,
  },
  placeholderImage: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtons: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: PURPLE,
    borderRadius: 20,
    padding: 8,
  },
  deleteButton: {
    backgroundColor: '#f44336',
    borderRadius: 20,
    padding: 8,
    minWidth: 36,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  content: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  location: {
    color: 'gray',
    fontSize: 13,
    marginLeft: 4,
    flex: 1,
  },
  serviceChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chipText: {
    color: PURPLE,
    fontSize: 12,
    fontWeight: '600',
  },
});