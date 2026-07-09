import React, { useEffect, useState, useRef, useMemo } from 'react';
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
import { useServiceRegistrationStore } from '@/stores/serviceRegistrationStore';
import { useServiceCatalogStore } from '@/stores/serviceCatalog';
import { useTheme } from '@/providers/ThemeProvider';

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
  const { serviceCatalog, serviceCatalogError, isLoadingServiceCatalog, loadServiceCatalog } =
    useServiceCatalogStore();
  const { theme } = useTheme();
  const colors = theme.colors;

  // Create dynamic styles based on the theme
  const styles = useMemo(() => createStyles(colors), [colors]);

  const services = currentService?.services || [];
  const selectedAmenities = currentService?.amenities || [];

  const [modalVisible, setModalVisible] = useState(false);
  const [step, setStep] = useState<Step>('pick');
  const [selectedName, setSelectedName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [filteredServices, setFilteredServices] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const searchRef = useRef<TextInput>(null);
  const priceRef = useRef<TextInput>(null);

  useEffect(() => {
    loadServiceCatalog();
  }, []);

  useEffect(() => {
    const q = searchQuery.toLowerCase().trim();
    setFilteredServices(
      q === '' ? serviceCatalog : serviceCatalog.filter((s) => s.toLowerCase().includes(q))
    );
  }, [searchQuery, serviceCatalog]);

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
    const parsedPrice = parseFloat(price);
    const parsedDuration = parseInt(duration, 10);

    if (!price.trim() || !duration.trim() || isNaN(parsedPrice) || isNaN(parsedDuration)) {
      Alert.alert('Incomplete', 'Please enter a valid price and duration');
      return;
    }
    if (parsedPrice <= 0) {
      Alert.alert('Invalid price', 'Price must be greater than 0');
      return;
    }
    if (parsedDuration <= 0) {
      Alert.alert('Invalid duration', 'Duration must be greater than 0 minutes');
      return;
    }
    const isDuplicate = services.some(
      (s) => s.name.trim().toLowerCase() === selectedName.trim().toLowerCase()
    );
    if (isDuplicate) {
      Alert.alert('Already added', `"${selectedName}" is already in your services list`);
      return;
    }

    updateServiceField('services', [
      ...services,
      { name: selectedName, price: parsedPrice, duration: parsedDuration },
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
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Ionicons name="cut-outline" size={60} color={colors.primary} />
      <Text style={[styles.title, { color: colors.text }]}>Your Services & Amenities</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Add the services you offer & amenities available
      </Text>

      <View style={[styles.card, { backgroundColor: colors.card || colors.background }]}>
        {services.length === 0 ? (
          <View style={styles.emptyServices}>
            <Ionicons name="add-circle-outline" size={40} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No services added yet
            </Text>
          </View>
        ) : (
          <View style={styles.servicesList}>
            {services.map((svc, index) => (
              <View key={index} style={[styles.serviceItem, { borderBottomColor: colors.border || '#f5f5f5' }]}>
                <View style={[styles.serviceIcon, { backgroundColor: colors.primaryLight || `${colors.primary}18` }]}>
                  <Ionicons name="cut" size={18} color={colors.primary} />
                </View>
                <View style={styles.serviceInfo}>
                  <Text style={[styles.serviceName, { color: colors.text }]}>{svc.name}</Text>
                  <Text style={[styles.serviceDuration, { color: colors.textSecondary }]}>
                    {svc.duration} min
                  </Text>
                </View>
                <Text style={[styles.servicePrice, { color: colors.primary }]}>₵{svc.price}</Text>
                <TouchableOpacity
                  onPress={() => handleDeleteService(index)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.error || '#F87171'} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.addButton,
            {
              borderColor: colors.primary,
              backgroundColor: colors.surface,
            }
          ]}
          onPress={openModal}
        >
          <Ionicons name="add" size={20} color={colors.primary} />
          <Text style={[styles.addButtonText, { color: colors.primary }]}>Add Service</Text>
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: colors.border || '#f0f0f0' }]} />

        <Text style={[styles.label, { color: colors.text }]}>Amenities</Text>
        <View style={styles.amenitiesGrid}>
          {AMENITIES.map((amenity) => {
            const selected = selectedAmenities.includes(amenity);
            return (
              <TouchableOpacity
                key={amenity}
                style={[
                  styles.amenityChip,
                  {
                    backgroundColor: selected ? colors.primary : colors.surface,
                    borderColor: selected ? colors.primary : colors.border || '#eee',
                  },
                ]}
                onPress={() => toggleAmenity(amenity)}
              >
                <Text
                  style={[
                    styles.amenityText,
                    {
                      color: selected ? '#fff' : colors.textSecondary,
                    },
                  ]}
                >
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
          <View style={[styles.sheet, { backgroundColor: colors.card || colors.background }]}>
            {/* Handle */}
            <View style={[styles.handle, { backgroundColor: colors.border || '#E5E7EB' }]} />

            {/* ── Step indicator ── */}
            <View style={styles.stepRow}>
              <View style={styles.stepItem}>
                <View style={[styles.stepDot, { backgroundColor: colors.primary }]}>
                  <Text style={styles.stepDotText}>1</Text>
                </View>
                <Text style={[
                  styles.stepLabel,
                  { color: step === 'pick' ? colors.primary : colors.textSecondary },
                  step === 'pick' && styles.stepLabelActive
                ]}>
                  Choose Service
                </Text>
              </View>
              <View style={[
                styles.stepLine,
                { backgroundColor: step === 'details' ? colors.primary : colors.border || '#E5E7EB' }
              ]} />
              <View style={styles.stepItem}>
                <View style={[
                  styles.stepDot,
                  { backgroundColor: step === 'details' ? colors.primary : colors.border || '#E5E7EB' }
                ]}>
                  <Text style={[
                    styles.stepDotText,
                    step !== 'details' && { color: colors.textSecondary || '#999' }
                  ]}>
                    2
                  </Text>
                </View>
                <Text style={[
                  styles.stepLabel,
                  { color: step === 'details' ? colors.primary : colors.textSecondary },
                  step === 'details' && styles.stepLabelActive
                ]}>
                  Set Price & Time
                </Text>
              </View>
            </View>

            {/* ── Step 1: Pick service ── */}
            {step === 'pick' && (
              <View style={styles.stepContent}>
                <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
                  <Ionicons name="search" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                  <TextInput
                    ref={searchRef}
                    style={[styles.searchInput, { color: colors.text }]}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search services…"
                    placeholderTextColor={colors.textSecondary}
                    returnKeyType="search"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>

                {isLoadingServiceCatalog ? (
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 32 }} />
                ) : serviceCatalogError ? (
                  <Text style={[styles.emptyListText, { color: colors.textSecondary }]}>
                    Couldn't load services. Pull to retry.
                  </Text>
                ) : (
                  <FlatList
                    data={filteredServices}
                    keyExtractor={(_, i) => String(i)}
                    keyboardShouldPersistTaps="handled"
                    style={styles.list}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[styles.listItem, { borderBottomColor: colors.border || '#F5F5F7' }]}
                        onPress={() => handleSelectService(item)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.listItemText, { color: colors.text }]}>{item}</Text>
                        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                      <Text style={[styles.emptyListText, { color: colors.textSecondary }]}>
                        No services found
                      </Text>
                    }
                  />
                )}
              </View>
            )}

            {/* ── Step 2: Price & duration ── */}
            {step === 'details' && (
              <View style={styles.stepContent}>
                <View style={[styles.selectedBadge, { backgroundColor: colors.primaryLight || `${colors.primary}18` }]}>
                  <View style={[styles.selectedBadgeIcon, { backgroundColor: colors.background }]}>
                    <Ionicons name="cut" size={16} color={colors.primary} />
                  </View>
                  <Text style={[styles.selectedBadgeName, { color: colors.text }]} numberOfLines={1}>
                    {selectedName}
                  </Text>
                  <TouchableOpacity onPress={() => setStep('pick')}>
                    <Text style={[styles.changeText, { color: colors.primary }]}>Change</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Price (₵)</Text>
                <View style={[styles.inputRow, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.inputPrefix, { color: colors.textSecondary }]}>₵</Text>
                  <TextInput
                    ref={priceRef}
                    style={[styles.fieldInput, { color: colors.text }]}
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    returnKeyType="next"
                  />
                </View>

                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Duration</Text>
                <View style={[styles.inputRow, { backgroundColor: colors.surface }]}>
                  <Ionicons name="time-outline" size={18} color={colors.textSecondary} style={{ marginLeft: 14 }} />
                  <TextInput
                    style={[styles.fieldInput, { color: colors.text }]}
                    value={duration}
                    onChangeText={setDuration}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    returnKeyType="done"
                    onSubmitEditing={handleAddService}
                  />
                  <Text style={[styles.inputSuffix, { color: colors.textSecondary }]}>min</Text>
                </View>

                <TouchableOpacity
                  style={[styles.confirmButton, { backgroundColor: colors.primary }]}
                  onPress={handleAddService}
                >
                  <Ionicons name="add-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
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

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 20 },
    title: { fontSize: 28, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
    subtitle: { fontSize: 16, marginBottom: 24 },
    card: { borderRadius: 15, padding: 16 },
    emptyServices: { alignItems: 'center', padding: 20 },
    emptyText: { marginTop: 8 },
    servicesList: { marginBottom: 16 },
    serviceItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
    },
    serviceIcon: {
      padding: 8,
      borderRadius: 8,
      marginRight: 12,
    },
    serviceInfo: { flex: 1 },
    serviceName: { fontWeight: '600', fontSize: 15 },
    serviceDuration: { fontSize: 12, marginTop: 2 },
    servicePrice: { fontWeight: '700', marginRight: 14, fontSize: 15 },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
      padding: 14,
      borderWidth: 1.5,
      borderRadius: 12,
      borderStyle: 'dashed',
    },
    addButtonText: { fontWeight: '600', marginLeft: 6 },
    divider: { height: 1, marginVertical: 20 },
    label: { fontWeight: '600', fontSize: 14, marginBottom: 12 },
    amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    amenityChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },
    amenityText: { fontWeight: '500', fontSize: 13 },

    // Modal
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
    sheetWrapper: { justifyContent: 'flex-end' },
    sheet: {
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
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepDotText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    stepLine: {
      flex: 1,
      height: 2,
      marginHorizontal: 8,
      marginBottom: 20,
    },
    stepLabel: { fontSize: 11, fontWeight: '500' },
    stepLabelActive: { fontWeight: '700' },

    stepContent: { paddingHorizontal: 20 },

    // Step 1
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 12,
    },
    searchInput: { flex: 1, fontSize: 15 },
    list: { maxHeight: 300 },
    listItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 4,
      borderBottomWidth: 1,
    },
    listItemText: { fontSize: 15 },
    emptyListText: { textAlign: 'center', paddingVertical: 24, fontSize: 14 },

    // Step 2
    selectedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 14,
      padding: 14,
      marginBottom: 24,
      gap: 10,
    },
    selectedBadgeIcon: {
      borderRadius: 8,
      padding: 6,
    },
    selectedBadgeName: { flex: 1, fontWeight: '700', fontSize: 15 },
    changeText: { fontWeight: '600', fontSize: 13 },
    fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 14,
      marginBottom: 20,
      overflow: 'hidden',
    },
    inputPrefix: {
      fontSize: 17,
      fontWeight: '600',
      paddingHorizontal: 14,
    },
    inputSuffix: {
      fontSize: 14,
      paddingHorizontal: 14,
    },
    fieldInput: {
      flex: 1,
      fontSize: 17,
      fontWeight: '600',
      paddingVertical: 14,
    },
    confirmButton: {
      flexDirection: 'row',
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    confirmButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  });