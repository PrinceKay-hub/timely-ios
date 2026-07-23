import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth';
import { useServiceRegistrationStore } from '@/stores/serviceRegistrationStore';
import { ServiceRegistrationForm } from '@/components/manage/ServiceRegistrationForm';
import { ServiceOverviewCard } from '@/components/manage/ServiceOverviewCard';
import { useTheme } from '@/providers/ThemeProvider';

export default function ServiceRegistrationScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user } = useAuthStore();
  const { theme } = useTheme();
  const colors = theme.colors;

  const styles = useMemo(() => createStyles(colors), [colors]);

  const {
    services,
    isLoading,
    error,
    step,
    setStep,
    currentService,
    saveService,
    loadServicesByProvider,
    startNewService,
    clearError,
  } = useServiceRegistrationStore();

  const effectiveUserId = userId || user?.uid;

  useEffect(() => {
    if (effectiveUserId) {
      loadServicesByProvider(effectiveUserId);
    }
  }, [effectiveUserId]);

  // Errors now surface via Toast directly from the store (saveService,
  // updateExistingService, deleteExistingService all show an error toast
  // on failure) — clearError() still runs so stale error state doesn't
  // linger, but we no longer duplicate it with an Alert dialog.
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [error]);

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  const handleClose = () => router.back();

  const canProceed = (): boolean => {
    if (!currentService) return false;
    switch (step) {
      case 1:
        return currentService.name.trim().length > 0;
      case 2:
        return currentService.category.trim().length > 0;
      case 3:
        return currentService.description.length >= 50;
      case 4:
        return (
          currentService.location.trim().length > 0 &&
          currentService.number.trim().length > 0 &&
          currentService.latitude != null &&
          currentService.longitude != null &&
          (currentService.latitude !== 0 || currentService.longitude !== 0)
        );
      case 5: {
        const startMin = currentService.workingHours.startHour * 60 + currentService.workingHours.startMinute;
        const endMin = currentService.workingHours.endHour * 60 + currentService.workingHours.endMinute;
        return (
          currentService.workingDays.length > 0 &&
          currentService.workingHours.startHour != null &&
          currentService.workingHours.endHour != null &&
          endMin > startMin
        );
      }
      case 6:
        return currentService.services.length > 0;
      case 7:
        return (currentService.images?.length || 0) >= 1;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (step < 7) {
      setStep(step + 1);
    } else {
      await saveService(effectiveUserId!, currentService?.images || []);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.surface }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Form mode (step > 0) — same for both "add another" and "edit"
  if (step > 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <View style={[styles.progressHeader, { backgroundColor: colors.primary }]}>
          <TouchableOpacity
            onPress={handleBack}
            style={[styles.backButton, { backgroundColor: '#fff' }]}
          >
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.stepText}>Step {step} of 7</Text>
          <TouchableOpacity
            onPress={handleClose}
            style={[styles.closeButton, { backgroundColor: '#fff' }]}
          >
            <Ionicons name="close" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(step / 7) * 100}%` }]} />
        </View>

        <ScrollView contentContainerStyle={styles.formContent}>
          <ServiceRegistrationForm userId={effectiveUserId!} />
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border || '#eee' }]}>
          <TouchableOpacity
            style={[styles.nextButton, !canProceed() && styles.disabledButton, { backgroundColor: colors.primary }]}
            onPress={handleNext}
            disabled={!canProceed() || isLoading}
          >
            <Text style={styles.nextButtonText}>
              {step === 7 ? 'Submit' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Overview mode — list of ALL the provider's services
  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity
          onPress={handleClose}
          style={[styles.backButton, { backgroundColor: '#fff' }]}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Services ({services.length})</Text>
        {services.length > 0 ? (
          <TouchableOpacity
            onPress={startNewService}
            style={[styles.backButton, { backgroundColor: '#fff' }]}
          >
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {services.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="business-outline" size={80} color={colors.primary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Service Yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            You haven't registered any service. Add one now to start receiving bookings.
          </Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={startNewService}
          >
            <Text style={styles.addButtonText}>Add Service</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {services.map((service) => (
            <View key={service.id} style={styles.serviceCardWrap}>
              <ServiceOverviewCard service={service} />
            </View>
          ))}

          <TouchableOpacity
            style={[styles.addAnotherButton, { borderColor: colors.primary }]}
            onPress={startNewService}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.addAnotherText, { color: colors.primary }]}>
              Add another service
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}
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
    backButton: { borderRadius: 20, padding: 8 },
    closeButton: { borderRadius: 20, padding: 8 },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    progressHeader: {
      paddingTop: 50,
      paddingHorizontal: 20,
      paddingBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    stepText: { color: 'white', fontSize: 14, fontWeight: '600' },
    progressBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.3)', width: '100%' },
    progressFill: { height: 4, backgroundColor: 'white' },
    formContent: { paddingBottom: 20, flexGrow: 1 },
    footer: { padding: 20, borderTopWidth: 1 },
    nextButton: { borderRadius: 30, paddingVertical: 16, alignItems: 'center' },
    disabledButton: { opacity: 0.5 },
    nextButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    content: { padding: 20 },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    emptyTitle: { fontSize: 22, fontWeight: 'bold', marginTop: 20, marginBottom: 8 },
    emptySubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 30 },
    addButton: { borderRadius: 30, paddingVertical: 16, paddingHorizontal: 40 },
    addButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

    // ── Multi-service list ──
    serviceCardWrap: { marginBottom: 16 },
    addAnotherButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderRadius: 15,
      paddingVertical: 16,
      marginTop: 8,
    },
    addAnotherText: { fontSize: 15, fontWeight: '600' },
  });