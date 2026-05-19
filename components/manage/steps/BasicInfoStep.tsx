import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useServiceRegistrationStore } from '@/stores/serviceRegistrationStore';

const PURPLE = '#8B5CF6';

export const BasicInfoStep = () => {
  const { currentService, updateServiceField } = useServiceRegistrationStore();
  const service = currentService!;
  const workers = service.workers || 1;

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
      <Ionicons name="storefront-outline" size={60} color={PURPLE} />
      <Text style={styles.title}>Basic Information</Text>
      <Text style={styles.subtitle}>
        Let's start with the basics. What's your business name?
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Business Name</Text>
        <TextInput
          style={styles.input}
          value={service.name}
          onChangeText={(text) => updateServiceField('name', text)}
          placeholder="e.g., Classic Cuts Barber Shop"
          placeholderTextColor="#999"
        />

        <Text style={[styles.label, { marginTop: 24 }]}>Number of Staff</Text>
        <View style={styles.workerRow}>
          <TouchableOpacity onPress={decrementWorkers} style={styles.workerButton}>
            <Ionicons name="remove" size={20} color={PURPLE} />
          </TouchableOpacity>
          <View style={styles.workerCount}>
            <Text style={styles.workerCountText}>
              {workers} {workers === 1 ? 'Staff Member' : 'Staff Members'}
            </Text>
          </View>
          <TouchableOpacity onPress={incrementWorkers} style={[styles.workerButton, styles.workerButtonAdd]}>
            <Ionicons name="add" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 28, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  subtitle: { color: 'gray', fontSize: 16, marginBottom: 24 },
  card: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 16,
  },
  label: { fontWeight: '600', fontSize: 14, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
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
    backgroundColor: '#EDE9FE',
    borderRadius: 8,
  },
  workerButtonAdd: {
    backgroundColor: PURPLE,
  },
  workerCount: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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