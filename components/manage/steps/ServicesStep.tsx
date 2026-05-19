import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { useServiceRegistrationStore } from '@/stores/serviceRegistrationStore';

const PURPLE = '#8B5CF6';
const PURPLE_LIGHT = '#EDE9FE';

const AMENITIES = [
  'Free WiFi',
  'Parking',
  'Mobile Money Payment',
  'DSTV',
  'Wheelchair Access',
  'Refreshment',
  'Air Conditioned',
];

type Step = 'pick' | 'details';

export const ServicesStep = () => {
  const { currentService, updateServiceField } = useServiceRegistrationStore();
  const services = currentService?.services || [];
  const selectedAmenities = currentService?.amenities || [];

  const [modalVisible, setModalVisible] = useState(false);
  const [step, setStep] = useState<Step>('pick');
  const [selectedName, setSelectedName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [serviceList, setServiceList] = useState<string[]>([]);
  const [filteredServices, setFilteredServices] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingServices, setLoadingServices] = useState(true);

  const searchRef = useRef<TextInput>(null);
  const priceRef = useRef<TextInput>(null);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const docRef = doc(db, 'categories', 'serviceList');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.services && Array.isArray(data.services)) {
            const list = data.services.map((s: any) => String(s));
            setServiceList(list);
            setFilteredServices(list);
          }
        }
      } catch (error) {
        console.error('Error fetching services:', error);
      } finally {
        setLoadingServices(false);
      }
    };
    fetchServices();
  }, []);

  useEffect(() => {
    const q = searchQuery.toLowerCase().trim();
    setFilteredServices(
      q === '' ? serviceList : serviceList.filter((s) => s.toLowerCase().includes(q))
    );
  }, [searchQuery, serviceList]);

  const openModal = () => {
    setStep('pick');
    setSelectedName('');
    setPrice('');
    setDuration('');
    setSearchQuery('');
    setModalVisible(true);
  };

  const closeModal = () => {
    Keyboard.dismiss();
    setModalVisible(false);
  };

  const handleSelectService = (name: string) => {
    setSelectedName(name);
    setStep('details');
    setTimeout(() => priceRef.current?.focus(), 150);
  };

  const handleAddService = () => {
    if (!price || !duration) {
      Alert.alert('Incomplete', 'Please enter price and duration');
      return;
    }
    updateServiceField('services', [
      ...services,
      { name: selectedName, price: parseInt(price), duration: parseInt(duration) },
    ]);
    closeModal();
  };

  const handleDeleteService = (index: number) => {
    updateServiceField('services', services.filter((_, i) => i !== index));
  };

  const toggleAmenity = (amenity: string) => {
    if (selectedAmenities.includes(amenity)) {
      updateServiceField('amenities', selectedAmenities.filter((a) => a !== amenity));
    } else {
      updateServiceField('amenities', [...selectedAmenities, amenity]);
    }
  };

  return (
    <View style={styles.container}>
      <Ionicons name="cut-outline" size={60} color={PURPLE} />
      <Text style={styles.title}>Your Services & Amenities</Text>
      <Text style={styles.subtitle}>Add the services you offer & amenities available</Text>

      <View style={styles.card}>
        {services.length === 0 ? (
          <View style={styles.emptyServices}>
            <Ionicons name="add-circle-outline" size={40} color="#ccc" />
            <Text style={styles.emptyText}>No services added yet</Text>
          </View>
        ) : (
          <View style={styles.servicesList}>
            {services.map((svc, index) => (
              <View key={index} style={styles.serviceItem}>
                <View style={styles.serviceIcon}>
                  <Ionicons name="cut" size={18} color={PURPLE} />
                </View>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{svc.name}</Text>
                  <Text style={styles.serviceDuration}>{svc.duration} min</Text>
                </View>
                <Text style={styles.servicePrice}>₵{svc.price}</Text>
                <TouchableOpacity
                  onPress={() => handleDeleteService(index)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={18} color="#F87171" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.addButton} onPress={openModal}>
          <Ionicons name="add" size={20} color={PURPLE} />
          <Text style={styles.addButtonText}>Add Service</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <Text style={styles.label}>Amenities</Text>
        <View style={styles.amenitiesGrid}>
          {AMENITIES.map((amenity) => {
            const selected = selectedAmenities.includes(amenity);
            return (
              <TouchableOpacity
                key={amenity}
                style={[styles.amenityChip, selected && styles.amenityChipSelected]}
                onPress={() => toggleAmenity(amenity)}
              >
                <Text style={[styles.amenityText, selected && styles.amenityTextSelected]}>
                  {amenity}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Bottom Sheet Modal ── */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <TouchableWithoutFeedback onPress={closeModal}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheetWrapper}
        >
          <View style={styles.sheet}>
            {/* Handle */}
            <View style={styles.handle} />

            {/* ── Step indicator ── */}
            <View style={styles.stepRow}>
              <View style={styles.stepItem}>
                <View style={[styles.stepDot, styles.stepDotActive]}>
                  <Text style={styles.stepDotText}>1</Text>
                </View>
                <Text style={[styles.stepLabel, step === 'pick' && styles.stepLabelActive]}>
                  Choose Service
                </Text>
              </View>
              <View style={[styles.stepLine, step === 'details' && styles.stepLineActive]} />
              <View style={styles.stepItem}>
                <View style={[styles.stepDot, step === 'details' && styles.stepDotActive]}>
                  <Text style={[styles.stepDotText, step !== 'details' && styles.stepDotTextInactive]}>
                    2
                  </Text>
                </View>
                <Text style={[styles.stepLabel, step === 'details' && styles.stepLabelActive]}>
                  Set Price & Time
                </Text>
              </View>
            </View>

            {/* ── Step 1: Pick service ── */}
            {step === 'pick' && (
              <View style={styles.stepContent}>
                {/* Search bar */}
                <View style={styles.searchBar}>
                  <Ionicons name="search" size={18} color="#999" style={{ marginRight: 8 }} />
                  <TextInput
                    ref={searchRef}
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search services…"
                    placeholderTextColor="#bbb"
                    returnKeyType="search"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={18} color="#bbb" />
                    </TouchableOpacity>
                  )}
                </View>

                {loadingServices ? (
                  <ActivityIndicator size="small" color={PURPLE} style={{ marginVertical: 32 }} />
                ) : (
                  <FlatList
                    data={filteredServices}
                    keyExtractor={(_, i) => String(i)}
                    keyboardShouldPersistTaps="handled"
                    style={styles.list}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.listItem}
                        onPress={() => handleSelectService(item)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.listItemText}>{item}</Text>
                        <Ionicons name="chevron-forward" size={18} color="#ccc" />
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                      <Text style={styles.emptyListText}>No services found</Text>
                    }
                  />
                )}
              </View>
            )}

            {/* ── Step 2: Price & duration ── */}
            {step === 'details' && (
              <View style={styles.stepContent}>
                {/* Selected service badge */}
                <View style={styles.selectedBadge}>
                  <View style={styles.selectedBadgeIcon}>
                    <Ionicons name="cut" size={16} color={PURPLE} />
                  </View>
                  <Text style={styles.selectedBadgeName} numberOfLines={1}>
                    {selectedName}
                  </Text>
                  <TouchableOpacity onPress={() => setStep('pick')}>
                    <Text style={styles.changeText}>Change</Text>
                  </TouchableOpacity>
                </View>

                {/* Price */}
                <Text style={styles.fieldLabel}>Price (₵)</Text>
                <View style={styles.inputRow}>
                  <Text style={styles.inputPrefix}>₵</Text>
                  <TextInput
                    ref={priceRef}
                    style={styles.fieldInput}
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#ccc"
                    returnKeyType="next"
                    onSubmitEditing={() => {}}
                  />
                </View>

                {/* Duration */}
                <Text style={styles.fieldLabel}>Duration</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="time-outline" size={18} color="#999" style={{ marginLeft: 14 }} />
                  <TextInput
                    style={styles.fieldInput}
                    value={duration}
                    onChangeText={setDuration}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#ccc"
                    returnKeyType="done"
                    onSubmitEditing={handleAddService}
                  />
                  <Text style={styles.inputSuffix}>min</Text>
                </View>

                {/* Confirm */}
                <TouchableOpacity style={styles.confirmButton} onPress={handleAddService}>
                  <Ionicons name="add-circle" size={20} color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.confirmButtonText}>Add Service</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 28, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  subtitle: { color: 'gray', fontSize: 16, marginBottom: 24 },
  card: { backgroundColor: 'white', borderRadius: 15, padding: 16 },
  emptyServices: { alignItems: 'center', padding: 20 },
  emptyText: { color: 'gray', marginTop: 8 },
  servicesList: { marginBottom: 16 },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  serviceIcon: {
    backgroundColor: PURPLE_LIGHT,
    padding: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  serviceInfo: { flex: 1 },
  serviceName: { fontWeight: '600', fontSize: 15 },
  serviceDuration: { color: '#aaa', fontSize: 12, marginTop: 2 },
  servicePrice: { fontWeight: '700', color: PURPLE, marginRight: 14, fontSize: 15 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    padding: 14,
    borderWidth: 1.5,
    borderColor: PURPLE,
    borderRadius: 12,
    borderStyle: 'dashed',
  },
  addButtonText: { color: PURPLE, fontWeight: '600', marginLeft: 6 },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 20 },
  label: { fontWeight: '600', fontSize: 14, marginBottom: 12 },
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#eee',
  },
  amenityChipSelected: { backgroundColor: PURPLE, borderColor: PURPLE },
  amenityText: { color: '#555', fontWeight: '500', fontSize: 13 },
  amenityTextSelected: { color: 'white' },

  // Modal
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheetWrapper: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    minHeight: 480,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    marginTop: 12,
    marginBottom: 20,
  },

  // Step indicator
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginBottom: 20,
  },
  stepItem: { alignItems: 'center', gap: 6 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: PURPLE },
  stepDotText: { color: 'white', fontSize: 13, fontWeight: '700' },
  stepDotTextInactive: { color: 'white', opacity: 0.4 },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
    marginBottom: 20,
  },
  stepLineActive: { backgroundColor: PURPLE },
  stepLabel: { fontSize: 11, color: '#aaa', fontWeight: '500' },
  stepLabelActive: { color: PURPLE, fontWeight: '700' },

  stepContent: { paddingHorizontal: 20 },

  // Step 1
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#111' },
  list: { maxHeight: 300 },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F7',
  },
  listItemText: { fontSize: 15, color: '#222' },
  emptyListText: { textAlign: 'center', color: '#bbb', paddingVertical: 24, fontSize: 14 },

  // Step 2
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PURPLE_LIGHT,
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
    gap: 10,
  },
  selectedBadgeIcon: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 6,
  },
  selectedBadgeName: { flex: 1, fontWeight: '700', color: '#1a1a1a', fontSize: 15 },
  changeText: { color: PURPLE, fontWeight: '600', fontSize: 13 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 14,
    marginBottom: 20,
    overflow: 'hidden',
  },
  inputPrefix: {
    fontSize: 17,
    fontWeight: '600',
    color: '#555',
    paddingHorizontal: 14,
  },
  inputSuffix: {
    fontSize: 14,
    color: '#aaa',
    paddingHorizontal: 14,
  },
  fieldInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#111',
    paddingVertical: 14,
  },
  confirmButton: {
    flexDirection: 'row',
    backgroundColor: PURPLE,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  confirmButtonText: { color: 'white', fontWeight: '700', fontSize: 16 },
});