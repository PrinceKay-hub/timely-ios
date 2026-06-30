import React, { useEffect } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { RegistrationChatScreen } from '@/components/manage/RegistrationChatScreen';
import { useServiceRegistrationStore } from '@/stores/serviceRegistrationStore';
import { useHomeStore } from '@/stores/home'; // adjust path if needed

const PURPLE = '#8B5CF6';

export default function RegistrationChatRoute() {
  const { updateServiceField, setStep, currentService } = useServiceRegistrationStore();
  const { categories, loadCategories } = useHomeStore(); // adjust to your actual store API

  useEffect(() => {
    // Make sure categories are loaded before the chat needs to validate against them
    loadCategories?.();
  }, []);

  const categoryNames: string[] = (categories || []).map((c: any) => c.name);

  // Wait for categories before rendering the chat, so the AI's category
  // constraint is built from the real list rather than an empty one.
  if (!currentService || categoryNames.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  return (
    <RegistrationChatScreen
      categoryNames={categoryNames}
      onProfileExtracted={(profile) => {
        updateServiceField('name', profile.name);
        updateServiceField('category', profile.category);
        updateServiceField('description', profile.description);
        updateServiceField('services', profile.services);
        updateServiceField('workingDays', profile.workingDays);
        updateServiceField('workingHours', profile.workingHours);
        updateServiceField('amenities', profile.amenities);

        // Skip straight to Location (step 4) — the only steps left are
        // the ones that genuinely need native pickers (location, photos).
        setStep(4);
        router.back();
      }}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
