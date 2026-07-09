import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useServiceRegistrationStore } from '@/stores/serviceRegistrationStore';
import { useHomeStore } from '@/stores/home';
import { useTheme } from '@/providers/ThemeProvider';

export const CategoryStep = () => {
  const { currentService, updateServiceField } = useServiceRegistrationStore();
  const { categories, categoriesError } = useHomeStore();
  const { theme } = useTheme();
  const colors = theme.colors;

  // Create dynamic styles based on the theme
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isEditing = !!currentService?.id;
  const selectedCategory = currentService?.category || '';

  if (categoriesError) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: colors.surface }]}>
        <Text style={{ color: colors.error || 'red' }}>
          Failed to load categories: {categoriesError}
        </Text>
      </View>
    );
  }


  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Ionicons name="grid-outline" size={60} color={colors.primary} />
      <Text style={[styles.title, { color: colors.text }]}>Select Category</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Choose the category that best describes your business
      </Text>

      {/* Show a note when editing */}
      {isEditing && (
        <View style={[styles.editNote, { backgroundColor: colors.primaryLight || `${colors.primary}18` }]}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <Text style={[styles.editNoteText, { color: colors.primary }]}>
            Category cannot be changed after creation.
          </Text>
        </View>
      )}

      <View style={styles.grid}>
        {categories.map((item: any) => {
          const isSelected = item.name === selectedCategory;
          return (
            <TouchableOpacity
              key={item.name}
              style={[
                styles.categoryItem,
                isSelected && styles.categorySelected,
                isEditing && styles.disabledItem,
              ]}
              onPress={() => {
                if (!isEditing) {
                  updateServiceField('category', item.name);
                }
              }}
              disabled={isEditing}
            >
              <Image
                source={{ uri: item.icon }}
                style={[styles.categoryIcon, isEditing && styles.disabledIcon]}
              />
              <Text
                style={[
                  styles.categoryName,
                  isSelected && styles.categoryNameSelected,
                  isEditing && styles.disabledText,
                ]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 20 },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 28, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
    subtitle: { fontSize: 16, marginBottom: 24 },
    editNote: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
    },
    editNoteText: { marginLeft: 8, fontSize: 13, flex: 1 },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    categoryItem: {
      width: '48%',
      backgroundColor: colors.card || colors.background,
      borderRadius: 15,
      padding: 16,
      alignItems: 'center',
      marginBottom: 16,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    categorySelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight || `${colors.primary}18`,
    },
    disabledItem: {
      opacity: 0.5,
      backgroundColor: colors.surface,
    },
    categoryIcon: {
      width: 50,
      height: 50,
      marginBottom: 8,
      resizeMode: 'contain',
    },
    disabledIcon: {
      opacity: 0.5,
    },
    categoryName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
    },
    categoryNameSelected: {
      color: colors.primary,
    },
    disabledText: {
      color: colors.textSecondary || '#999',
    },
  });