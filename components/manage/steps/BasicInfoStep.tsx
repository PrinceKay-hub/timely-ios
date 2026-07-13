import React, { useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useServiceRegistrationStore } from '@/stores/serviceRegistrationStore';
import { useTheme } from '@/providers/ThemeProvider';

export const BasicInfoStep = () => {
  const router = useRouter();
  const { currentService, updateServiceField } = useServiceRegistrationStore();
  const { theme } = useTheme();
  const colors = theme.colors;

  // Create dynamic styles based on the theme
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Safe: ServiceRegistrationForm guarantees currentService is non-null
  const service = currentService!;
  const workers = service.workers || 1;
  const isEditing = !!service.id;

  const incrementWorkers = () => {
    updateServiceField('workers', workers + 1);
  };

  const decrementWorkers = () => {
    if (workers > 1) {
      updateServiceField('workers', workers - 1);
    }
  };

  return (
    <View style={styles.container}>
      <Ionicons name="storefront-outline" size={60} color={colors.primary} />
      <Text style={[styles.title, { color: colors.text }]}>Basic Information</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Let's start with the basics. What's your business name?
      </Text>

      {!isEditing && (
        <TouchableOpacity
          style={[styles.chatBanner, { backgroundColor: colors.primary || `${colors.primary}18` }]}
          onPress={() => router.push('/manage/registration/chat')}
        >
          <Ionicons name="sparkles" size={18} color={colors.white} />
          <Text style={[styles.chatBannerText, { color: colors.white }]}>
            Prefer to just chat? Set up your whole profile by answering a few quick questions
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.white} />
        </TouchableOpacity>
      )}

      <View style={[styles.card, { backgroundColor: colors.card || colors.background }]}>
        <Text style={[styles.label, { color: colors.text }]}>Business Name</Text>
        <TextInput
          style={[
            styles.input,
            {
              borderColor: colors.border || '#ddd',
              color: colors.text,
              backgroundColor: colors.surface,
            }
          ]}
          value={service.name}
          onChangeText={(text) => updateServiceField('name', text)}
          placeholder="e.g., Classic Cuts Barber Shop"
          placeholderTextColor={colors.textSecondary || '#999'}
        />

        <Text style={[styles.label, { color: colors.text, marginTop: 24 }]}>Number of Staff</Text>
        <View style={styles.workerRow}>
          <TouchableOpacity
            onPress={decrementWorkers}
            style={[styles.workerButton, { backgroundColor: colors.primaryLight || `${colors.primary}18` }]}
          >
            <Ionicons name="remove" size={20} color={colors.primary} />
          </TouchableOpacity>
          <View style={[styles.workerCount, { backgroundColor: colors.surface }]}>
            <Text style={[styles.workerCountText, { color: colors.text }]}>
              {workers} {workers === 1 ? 'Staff Member' : 'Staff Members'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={incrementWorkers}
            style={[styles.workerButton, styles.workerButtonAdd, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    title: { fontSize: 28, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
    subtitle: { fontSize: 16, marginBottom: 24 },
    chatBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      padding: 14,
      marginBottom: 20,
      gap: 10,
    },
    chatBannerText: { flex: 1, fontSize: 13, fontWeight: '500', lineHeight: 18 },
    card: {
      borderRadius: 15,
      padding: 16,
    },
    label: { fontWeight: '600', fontSize: 14, marginBottom: 8 },
    input: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
    },
    workerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
    },
    workerButton: {
      padding: 8,
      borderRadius: 8,
    },
    workerButtonAdd: {
      // backgroundColor set inline
    },
    workerCount: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 16,
      marginHorizontal: 12,
      alignItems: 'center',
    },
    workerCountText: {
      fontSize: 16,
      fontWeight: 'bold',
    },
  });