import React, { useEffect, useMemo } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { RegistrationChatScreen } from '@/components/manage/RegistrationChatScreen';
import { useServiceRegistrationStore } from '@/stores/serviceRegistrationStore';
import { useHomeStore } from '@/stores/home';
import { useTheme } from '@/providers/ThemeProvider';

export default function RegistrationChatRoute() {
  const { updateServiceField, setStep, currentService } = useServiceRegistrationStore();
  const { categories, loadCategories } = useHomeStore();
  const { theme } = useTheme();
  const colors = theme.colors;

  // Create dynamic styles based on the theme
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    loadCategories?.();
  }, []);

  const categoryNames: string[] = (categories || []).map((c: any) => c.name);

  // Wait for categories before rendering the chat
  if (!currentService || categoryNames.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.surface }]}>
        <ActivityIndicator size="large" color={colors.primary} />
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

        setStep(4);
        router.back();
      }}
    />
  );
}

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });