import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useServiceRegistrationStore } from '@/stores/serviceRegistrationStore';

const PURPLE = '#8B5CF6';

export const DescriptionStep = () => {
  const { currentService, updateServiceField } = useServiceRegistrationStore();
  const description = currentService?.description || '';
  const minChars = 50;

  return (
    <View style={styles.container}>
      <Ionicons name="document-text-outline" size={60} color={PURPLE} />
      <Text style={styles.title}>Describe Your Business</Text>
      <Text style={styles.subtitle}>
        Tell potential customers about your services and what makes you unique
      </Text>

      <View style={styles.card}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Business Description</Text>
          <Text style={[styles.charCount, description.length >= minChars && styles.charCountValid]}>
            {description.length}/500
          </Text>
        </View>
        <TextInput
          style={styles.textArea}
          value={description}
          onChangeText={(text) => updateServiceField('description', text)}
          placeholder="Welcome to our salon where we provide exceptional services..."
          placeholderTextColor="#999"
          multiline
          maxLength={500}
          textAlignVertical="top"
        />
        {description.length < minChars && (
          <View style={styles.warning}>
            <Ionicons name="information-circle-outline" size={20} color="orange" />
            <Text style={styles.warningText}>
              Minimum {minChars} characters required ({minChars - description.length} more)
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 28, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  subtitle: { color: 'gray', fontSize: 16, marginBottom: 24 },
  card: { backgroundColor: 'white', borderRadius: 15, padding: 16 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontWeight: '600', fontSize: 14 },
  charCount: { color: 'gray', fontSize: 12 },
  charCountValid: { color: 'green' },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    minHeight: 120,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fff3e0',
    borderRadius: 8,
  },
  warningText: { color: 'orange', fontSize: 12, marginLeft: 8, flex: 1 },
});