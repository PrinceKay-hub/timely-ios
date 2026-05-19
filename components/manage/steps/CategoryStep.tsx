import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useServiceRegistrationStore } from '@/stores/serviceRegistrationStore';
import { useHomeStore } from '@/stores/home'; // adjust path

const PURPLE = '#8B5CF6';

export const CategoryStep = () => {
  const { currentService, updateServiceField } = useServiceRegistrationStore();
  const { categories, categoriesError } = useHomeStore();
  const [loading, ] = useState(false);
  
  const isEditing = !!currentService?.id;
  if (categoriesError) {
      return (
        <View>
          <Text>
            Failed to load categories: {categoriesError}
          </Text>
        </View>
      );
    }

  const selectedCategory = currentService?.category || '';

  

   return (
    <View style={styles.container}>
      <Ionicons name="grid-outline" size={60} color={PURPLE} />
      <Text style={styles.title}>Select Category</Text>
      <Text style={styles.subtitle}>Choose the category that best describes your business</Text>

      {/* Show a note when editing */}
      {isEditing && (
        <View style={styles.editNote}>
          <Ionicons name="information-circle-outline" size={20} color={PURPLE} />
          <Text style={styles.editNoteText}>Category cannot be changed after creation.</Text>
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
                isEditing && styles.disabledItem, // apply disabled style if editing
              ]}
              onPress={() => {
                // Prevent selection if editing
                if (!isEditing) {
                  updateServiceField('category', item.name);
                }
              }}
              disabled={isEditing} // disable touch when editing
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  subtitle: { color: 'gray', fontSize: 16, marginBottom: 24 },
  editNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  editNoteText: { color: PURPLE, marginLeft: 8, fontSize: 13, flex: 1 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryItem: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categorySelected: {
    borderColor: PURPLE,
    backgroundColor: '#EDE9FE',
  },
  disabledItem: {
    opacity: 0.5,
    backgroundColor: '#f0f0f0',
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
  categoryName: { fontSize: 16, fontWeight: 'bold' },
  categoryNameSelected: { color: PURPLE },
  disabledText: { color: '#999' },
});