import { useBookingStore } from '@/stores/bookingStore';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { getServiceById } from '../../data/repositories/serviceRepository';

const PURPLE = '#8B5CF6';

export default function RebookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { userBookings } = useBookingStore();
  const [booking, setBooking] = useState<any>(null);
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Find the original booking
      const found = userBookings.find(b => b.id === id);
      if (!found) {
        Alert.alert('Error', 'Booking not found');
        router.back();
        return;
      }
      setBooking(found);

      // Fetch the full service details using serviceId
      try {
        const serviceData = await getServiceById(found.serviceId);
        setService(serviceData);
      } catch (error) {
        console.error('Failed to load service', error);
        Alert.alert('Error', 'Could not load service details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, userBookings]);


  const handleRebook = () => {
    if (!service) return;

    // Navigate to booking screen with the full service data
    router.push({
        pathname: '/booking/[id]',
        params: { id: service.id }
    })
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  if (!booking || !service) {
    return (
      <View style={styles.center}>
        <Text>Unable to load booking details.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rebook Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Service Card */}
        <View style={styles.card}>
          <Text style={styles.serviceName}>{service.name}</Text>
          <Text style={styles.location}>{service.location}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={16} color="gold" />
            <Text style={styles.rating}>{service.rating?.toFixed(1)} ({service.totalReviews} reviews)</Text>
          </View>
        </View>

        {/* Previous Booking Info */}
        <View style={styles.previousCard}>
          <Text style={styles.previousTitle}>Previous Appointment</Text>
          <Text style={styles.previousDetail}>
            Date: {new Date(booking.appointmentDate).toLocaleDateString()}
          </Text>
          <Text style={styles.previousDetail}>
            Time: {booking.timeSlot?.displayTime}
          </Text>
          <Text style={styles.previousDetail}>
            Service: {booking.serviceOption?.title}
          </Text>
        </View>

        <TouchableOpacity style={styles.rebookButton} onPress={handleRebook}>
          <Text style={styles.rebookButtonText}>Book Again</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: PURPLE,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { padding: 8 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  content: { padding: 20 },
  card: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceName: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  providerName: { fontSize: 16, color: '#666', marginBottom: 4 },
  location: { fontSize: 14, color: 'gray', marginBottom: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  rating: { marginLeft: 4, fontSize: 14, color: '#333' },
  previousCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  previousTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, color: PURPLE },
  previousDetail: { fontSize: 14, color: '#333', marginBottom: 4 },
  rebookButton: {
    backgroundColor: PURPLE,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
  },
  rebookButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});