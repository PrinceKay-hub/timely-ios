import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth';
import { useServiceRegistrationStore } from '@/stores/serviceRegistrationStore';
import { ServiceRegistrationForm } from '@/components/manage/ServiceRegistrationForm';
import { ServiceOverviewCard } from '@/components/manage/ServiceOverviewCard';

const PURPLE = '#8B5CF6';

interface MenuItemConfig {
  icon: string;
  title: string;
  onPress: () => void;
  trailing?: React.ReactNode;
}


// ─── Menu section ─────────────────────────────────────────────────────────────
const MenuSection: React.FC<{ title: string; items: MenuItemConfig[] }> = ({ title, items }) => (
  <View style={styles.menuSection}>
    <Text style={styles.menuSectionTitle}>{title}</Text>
    {items.map((item, index) => (
      <TouchableOpacity
        key={item.title}
        style={[
          styles.menuItem,
          index < items.length - 1 && styles.menuItemBorder,
        ]}
        onPress={item.onPress}
        activeOpacity={0.7}
      >
        {/* Icon box */}
        <View style={styles.menuIconBox}>
          <Text style={styles.menuIconText}>{item.icon}</Text>
        </View>

        <Text style={styles.menuItemTitle}>{item.title}</Text>

        {/* Trailing: custom widget or default chevron */}
        {item.trailing ?? (
          <Text style={styles.menuChevron}>›</Text>
        )}
      </TouchableOpacity>
    ))}
  </View>
);

export default function ServiceRegistrationScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user } = useAuthStore();
  const {
    existingService,
    isLoading,
    error,
    step,
    setStep,
    currentService,
    saveService,
    loadServiceByProvider,
    clearError,
  } = useServiceRegistrationStore();

  const effectiveUserId = userId || user?.uid;

  useEffect(() => {
    if (effectiveUserId) {
      loadServiceByProvider(effectiveUserId);
    }
  }, [effectiveUserId]);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
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
          currentService.number.trim().length > 0
        );
      case 5:
        return (
          currentService.workingDays.length > 0 &&
          currentService.workingHours.startHour != null &&
          currentService.workingHours.endHour != null
        );
      case 6:
        return currentService.services.length > 0;
      case 7:
        return (currentService.images?.length || 0) >= 1; // at least one image
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (step < 7) {
      setStep(step + 1);
    } else {
      // Submit
      await saveService(effectiveUserId!, currentService?.images || []);
      // After success, the store will set step back to 0 and reload service
    }
  };

  if (isLoading ) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  // ── Menu definitions (unchanged) ────────────────────────────────────────────
    const accountItems = [
      {
        icon: '📷',
        title: 'Portfolio',
        onPress: () => {
          router.push({
                  pathname: '/portfolio/portfolioscreen',
                  params: {
                    id: existingService?.id, serviceName: existingService?.name
                  },
                })
          //navigation.navigate('portfolio/portfolioscreen', { id: currentService?.id, serviceName: currentService?.name  });
        },
      },
    ];

  // Form mode (step > 0)
  if (step > 0) {
    return (
      <View style={styles.container}>
        {/* Progress header */}
        <View style={styles.progressHeader}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={PURPLE} />
          </TouchableOpacity>
          <Text style={styles.stepText}>Step {step} of 7</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={PURPLE} />
          </TouchableOpacity>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(step / 7) * 100}%` }]} />
        </View>

        <ScrollView contentContainerStyle={styles.formContent}>
          <ServiceRegistrationForm userId={effectiveUserId!} />
        </ScrollView>

        {/* Bottom Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.nextButton, !canProceed() && styles.disabledButton]}
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

  // No service: empty state
  if (!existingService) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={PURPLE} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Service</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="business-outline" size={80} color={PURPLE} />
          <Text style={styles.emptyTitle}>No Service Yet</Text>
          <Text style={styles.emptySubtitle}>
            You haven't registered any service. Add one now to start receiving bookings.
          </Text>
          <TouchableOpacity style={styles.addButton} onPress={() => setStep(1)}>
            <Text style={styles.addButtonText}>Add Service</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Existing service overview
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={PURPLE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Service</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <ServiceOverviewCard service={existingService} />
        {/* Menu sections */}
                <View style={styles.menuWrap}>
                  <MenuSection title="Extra options" items={accountItems} />
                  <View style={styles.sectionGap} />
                </View>
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
  backButton: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 8,
  },
  closeButton: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 8,
  },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  progressHeader: {
    backgroundColor: PURPLE,
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepText: { color: 'white', fontSize: 14, fontWeight: '600' },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    width: '100%',
  },
  progressFill: {
    height: 4,
    backgroundColor: 'white',
  },
  formContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: 'white',
  },
  nextButton: {
    backgroundColor: PURPLE,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: { padding: 20 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', marginTop: 20, marginBottom: 8 },
  emptySubtitle: { color: 'gray', fontSize: 14, textAlign: 'center', marginBottom: 30 },
  addButton: {
    backgroundColor: PURPLE,
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 40,
  },
  addButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

  // ── Menu wrap ──
  menuWrap: {
    marginTop: 24,
  },
  sectionGap: {
    height: 16,
  },

  // ── Menu section ──
  menuSection: {
    backgroundColor: '#fff',
    borderRadius: 15,
    overflow: 'hidden',
  },
  menuSectionTitle: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    fontSize: 13,
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: 0.3,
  },

  // ── Menu item ──
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.07)',
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f3f0ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuIconText: {
    fontSize: 18,
  },
  menuItemTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  menuChevron: {
    fontSize: 22,
    color: '#9ca3af',
    lineHeight: 24,
  },
});