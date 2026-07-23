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
  'Free Photoshoot'
];

type Step = 'pick' | 'details';
type PriceType = 'Fixed' | 'Range';
type DurationUnit = 'Minutes' | 'Hours';

export const ServicesStep = () => {
  const { currentService, updateServiceField } = useServiceRegistrationStore();
  const { serviceCatalog, serviceCatalogError, isLoadingServiceCatalog, loadServiceCatalog } =
    useServiceCatalogStore();
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const services = currentService?.services || [];
  const selectedAmenities = currentService?.amenities || [];

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [step, setStep] = useState<Step>('pick');
  const [selectedName, setSelectedName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredServices, setFilteredServices] = useState<string[]>([]);

  // Price & Duration state
  const [priceType, setPriceType] = useState<PriceType>('Fixed');
  const [price, setPrice] = useState('');          // for Fixed
  const [priceMin, setPriceMin] = useState('');    // for Range
  const [priceMax, setPriceMax] = useState('');    // for Range
  const [duration, setDuration] = useState('');
  const [durationUnit, setDurationUnit] = useState<DurationUnit>('Minutes');

  const searchRef = useRef<TextInput>(null);
  const priceRef = useRef<TextInput>(null);
  const priceMinRef = useRef<TextInput>(null);
  const priceMaxRef = useRef<TextInput>(null);
  const durationRef = useRef<TextInput>(null);

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
    setPriceMin('');
    setPriceMax('');
    setDuration('');
    setPriceType('Fixed');
    setDurationUnit('Minutes');
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
    // Focus the first input based on price type
    setTimeout(() => {
      if (priceType === 'Fixed') {
        priceRef.current?.focus();
      } else {
        priceMinRef.current?.focus();
      }
    }, 150);
  };

  const handleAddService = () => {
    // Validate service name
    if (!selectedName) {
      Alert.alert('Error', 'Please select a service');
      return;
    }

    // 1. Price validation
    let priceString: string;
    if (priceType === 'Fixed') {
      const parsed = parseInt(price, 10);
      if (!price || isNaN(parsed) || parsed <= 0) {
        Alert.alert('Invalid Price', 'Please enter a valid price greater than 0');
        return;
      }
      priceString = String(parsed);
    } else {
      const min = parseInt(priceMin, 10);
      const max = parseInt(priceMax, 10);
      if (!priceMin || !priceMax || isNaN(min) || isNaN(max) || min <= 0 || max <= 0 || min > max) {
        Alert.alert('Invalid Range', 'Please enter a valid price range (min ≤ max)');
        return;
      }
      priceString = `${min} - ${max}`;
    }

    // 2. Duration validation
    const durationValue = parseInt(duration, 10);
    if (!duration || isNaN(durationValue) || durationValue <= 0) {
      Alert.alert('Invalid Duration', 'Please enter a valid duration greater than 0');
      return;
    }
    const durationInMinutes = durationUnit === 'Hours' ? durationValue * 60 : durationValue;

    // 3. Duplicate check
    const isDuplicate = services.some(
      (s) => s.name.trim().toLowerCase() === selectedName.trim().toLowerCase()
    );
    if (isDuplicate) {
      Alert.alert('Already Added', `"${selectedName}" is already in your services list`);
      return;
    }

    // 4. Add service
    updateServiceField('services', [
      ...services,
      { name: selectedName, price: priceString, duration: durationInMinutes },
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

  
  const formatDuration = (minutes: number) => {
    if (minutes >= 60 && minutes % 60 === 0) {
      return `${minutes / 60} hr`;
    } else if (minutes > 60) {
      const hrs = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hrs}h ${mins}m`;
    }
    return `${minutes} mins`;
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
                    {formatDuration(svc.duration)}
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

      {/* ── Modal ── */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <TouchableWithoutFeedback onPress={closeModal}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheetWrapper}
        >
          <View style={[styles.sheet, { backgroundColor: colors.card || colors.background }]}>
            <View style={[styles.handle, { backgroundColor: colors.border || '#E5E7EB' }]} />

            {/* Step indicator */}
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

            {/* Step 1: Pick service */}
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

            {/* Step 2: Price & duration with toggle */}
            {step === 'details' && (
              <View style={styles.stepContent}>
                {/* Selected service badge */}
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

                {/* Price type toggle */}
                <View style={styles.priceTypeRow}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Price type</Text>
                  <View style={styles.priceTypeChips}>
                    <TouchableOpacity
                      style={[
                        styles.priceChip,
                        {
                          backgroundColor: priceType === 'Fixed' ? colors.primary : colors.surface,
                          borderColor: priceType === 'Fixed' ? colors.primary : colors.border || '#ccc',
                        },
                      ]}
                      onPress={() => setPriceType('Fixed')}
                    >
                      <Text
                        style={[
                          styles.priceChipText,
                          { color: priceType === 'Fixed' ? '#fff' : colors.textSecondary },
                        ]}
                      >
                        Fixed
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.priceChip,
                        {
                          backgroundColor: priceType === 'Range' ? colors.primary : colors.surface,
                          borderColor: priceType === 'Range' ? colors.primary : colors.border || '#ccc',
                        },
                      ]}
                      onPress={() => setPriceType('Range')}
                    >
                      <Text
                        style={[
                          styles.priceChipText,
                          { color: priceType === 'Range' ? '#fff' : colors.textSecondary },
                        ]}
                      >
                        Range
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Price inputs */}
                {priceType === 'Fixed' ? (
                  <View style={[styles.inputRow, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.inputPrefix, { color: colors.textSecondary }]}>₵</Text>
                    <TextInput
                      ref={priceRef}
                      style={[styles.fieldInput, { color: colors.text }]}
                      value={price}
                      onChangeText={setPrice}
                      keyboardType="numeric"
                      placeholder="50"
                      placeholderTextColor={colors.textSecondary}
                      returnKeyType="next"
                      onSubmitEditing={() => durationRef.current?.focus()}
                    />
                  </View>
                ) : (
                  <View style={styles.rangeRow}>
                    <View style={[styles.rangeInputWrapper, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.inputPrefix, { color: colors.textSecondary }]}>₵</Text>
                      <TextInput
                        ref={priceMinRef}
                        style={[styles.fieldInput, { color: colors.text }]}
                        value={priceMin}
                        onChangeText={setPriceMin}
                        keyboardType="numeric"
                        placeholder="100"
                        placeholderTextColor={colors.textSecondary}
                        returnKeyType="next"
                        onSubmitEditing={() => priceMaxRef.current?.focus()}
                      />
                    </View>
                    <Text style={[styles.rangeDash, { color: colors.textSecondary }]}>–</Text>
                    <View style={[styles.rangeInputWrapper, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.inputPrefix, { color: colors.textSecondary }]}>₵</Text>
                      <TextInput
                        ref={priceMaxRef}
                        style={[styles.fieldInput, { color: colors.text }]}
                        value={priceMax}
                        onChangeText={setPriceMax}
                        keyboardType="numeric"
                        placeholder="170"
                        placeholderTextColor={colors.textSecondary}
                        returnKeyType="next"
                        onSubmitEditing={() => durationRef.current?.focus()}
                      />
                    </View>
                  </View>
                )}

                {/* Duration */}
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Duration</Text>
                <View style={styles.durationRow}>
                  <View style={[styles.durationInputWrapper, { backgroundColor: colors.surface }]}>
                    <Ionicons name="time-outline" size={18} color={colors.textSecondary} style={{ marginLeft: 14 }} />
                    <TextInput
                      ref={durationRef}
                      style={[styles.fieldInput, { color: colors.text }]}
                      value={duration}
                      onChangeText={setDuration}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                      returnKeyType="done"
                      onSubmitEditing={handleAddService}
                    />
                  </View>
                  <View style={styles.unitToggle}>
                    <TouchableOpacity
                      style={[
                        styles.unitButton,
                        {
                          backgroundColor: durationUnit === 'Minutes' ? colors.primary : colors.surface,
                          borderColor: durationUnit === 'Minutes' ? colors.primary : colors.border || '#ccc',
                        },
                      ]}
                      onPress={() => setDurationUnit('Minutes')}
                    >
                      <Text
                        style={[
                          styles.unitButtonText,
                          { color: durationUnit === 'Minutes' ? '#fff' : colors.textSecondary },
                        ]}
                      >
                        Min
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.unitButton,
                        {
                          backgroundColor: durationUnit === 'Hours' ? colors.primary : colors.surface,
                          borderColor: durationUnit === 'Hours' ? colors.primary : colors.border || '#ccc',
                        },
                      ]}
                      onPress={() => setDurationUnit('Hours')}
                    >
                      <Text
                        style={[
                          styles.unitButtonText,
                          { color: durationUnit === 'Hours' ? '#fff' : colors.textSecondary },
                        ]}
                      >
                        Hr
                      </Text>
                    </TouchableOpacity>
                  </View>
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

// ─── Styles ────────────────────────────────────────────────────────────────
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

    // Search
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

    // Selected badge
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

    // Price type
    priceTypeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    priceTypeChips: {
      flexDirection: 'row',
      gap: 8,
    },
    priceChip: {
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
    },
    priceChipText: { fontWeight: '600', fontSize: 13 },

    // Price inputs
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
    fieldInput: {
      flex: 1,
      fontSize: 17,
      fontWeight: '600',
      paddingVertical: 14,
    },
    rangeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      gap: 10,
    },
    rangeInputWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 14,
      overflow: 'hidden',
    },
    rangeDash: { fontSize: 20, fontWeight: '300' },

    // Duration
    durationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      gap: 10,
    },
    durationInputWrapper: {
      flex: 2,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 14,
      overflow: 'hidden',
    },
    unitToggle: {
      flex: 1,
      flexDirection: 'row',
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border || '#ccc',
    },
    unitButton: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unitButtonText: { fontWeight: '600', fontSize: 14 },

    // Confirm
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