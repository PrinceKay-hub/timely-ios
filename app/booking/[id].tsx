import { BookingBottomBar } from '@/components/booking/BookingBottomBar';
import { BookingForm } from '@/components/booking/BookingForm';
import { BookingHeader } from '@/components/booking/BookingHeader';
import { useBookingFormStore } from '@/stores/bookingFormStore';
import { useBookingStore } from '@/stores/bookingStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { getServiceById } from '../../data/repositories/serviceRepository';
import { useTheme } from '@/providers/ThemeProvider';

export default function BookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isLoading, error, successMessage, clearMessages } = useBookingStore();
  const { setProviderData, isProviderDataLoaded } = useBookingFormStore();
  const { theme } = useTheme();
  const colors = theme.colors;

  // Create dynamic styles based on the theme
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (id) {
        try {
          const serviceData = await getServiceById(id);
          setProviderData(serviceData);
        } catch (error) {
          console.error('Failed to load service', error);
          Alert.alert('Error', 'Could not load service details');
        } finally {
          setLoading(false);
        }
      }
    };
    fetchData();
  }, [id]);

  // Handle errors
  useEffect(() => {
    if (error) {
      Alert.alert('Booking Error', error);
      clearMessages();
    }
  }, [error]);

  // Handle success
  useEffect(() => {
    if (successMessage) {
      Alert.alert('Success', successMessage, [
        { text: 'OK', onPress: () => router.back() },
      ]);
      clearMessages();
    }
  }, [successMessage]);

  // Show a loader until provider data is ready
  if (!isProviderDataLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <BookingHeader />
      <View style={styles.formContainer}>
        <BookingForm />
      </View>
      <BookingBottomBar />
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="white" />
        </View>
      )}
    </View>
  );
}

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    formContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });