import { useBookingStore } from '@/stores/bookingStore';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
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
import { useTheme } from '@/providers/ThemeProvider';

export default function RebookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { userBookings } = useBookingStore();
  const { theme } = useTheme();
  const colors = theme.colors;

  // Create dynamic styles based on the theme
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [booking, setBooking] = useState<any>(null);
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const found = userBookings.find(b => b.id === id);
      if (!found) {
        Alert.alert('Error', 'Booking not found');
        router.back();
        return;
      }
      setBooking(found);

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
    router.push({
        pathname: '/booking/[id]',
        params: { id: service.id }
    });
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.surface }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!booking || !service) {
    return (
      <View style={[styles.center, { backgroundColor: colors.surface }]}>
        <Text style={{ color: colors.text }}>Unable to load booking details.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rebook Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Service Card */}
        <View style={[styles.card, { backgroundColor: colors.card || colors.background }]}>
          <Text style={[styles.serviceName, { color: colors.text }]}>{service.name}</Text>
          <Text style={[styles.location, { color: colors.textSecondary }]}>{service.location}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={16} color="gold" />
            <Text style={[styles.rating, { color: colors.textSecondary }]}>
              {service.rating?.toFixed(1)} ({service.totalReviews} reviews)
            </Text>
          </View>
        </View>

        {/* Previous Booking Info */}
        <View style={[
          styles.previousCard,
          {
            backgroundColor: colors.card || colors.background,
            borderColor: colors.border || '#e0e0e0',
          }
        ]}>
          <Text style={[styles.previousTitle, { color: colors.primary }]}>Previous Appointment</Text>
          <Text style={[styles.previousDetail, { color: colors.text }]}>
            Date: {new Date(booking.appointmentDate).toLocaleDateString()}
          </Text>
          <Text style={[styles.previousDetail, { color: colors.text }]}>
            Time: {booking.timeSlot?.displayTime}
          </Text>
          <Text style={[styles.previousDetail, { color: colors.text }]}>
            Service: {booking.serviceOption?.title}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.rebookButton, { backgroundColor: colors.primary }]}
          onPress={handleRebook}
        >
          <Text style={styles.rebookButtonText}>Book Again</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
      paddingTop: 50,
      paddingBottom: 20,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: { padding: 8 },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    content: { padding: 20 },
    card: {
      borderRadius: 15,
      padding: 20,
      marginBottom: 20,
      shadowColor: colors.shadow || '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    serviceName: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
    location: { fontSize: 14, marginBottom: 8 },
    ratingRow: { flexDirection: 'row', alignItems: 'center' },
    rating: { marginLeft: 4, fontSize: 14 },
    previousCard: {
      borderRadius: 15,
      padding: 20,
      marginBottom: 30,
      borderWidth: 1,
    },
    previousTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
    previousDetail: { fontSize: 14, marginBottom: 4 },
    rebookButton: {
      borderRadius: 30,
      paddingVertical: 16,
      alignItems: 'center',
    },
    rebookButtonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 'bold',
    },
  });