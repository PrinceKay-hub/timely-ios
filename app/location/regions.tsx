import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLocationStore } from '@/stores/locationStore';
import { useSelectedLocationStore } from '@/stores/selectedLocationStore';
import { EmptyScreen } from '@/components/EmptyScreen';

const { width, height } = Dimensions.get('window');
const PURPLE = '#8B5CF6';

export default function RegionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isService } = params; // optional flag

  const { locations, isLoading, error, fetchLocations } = useLocationStore();
  const { setSelectedLocation } = useSelectedLocationStore();

  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Search state
  const [regionSearch, setRegionSearch] = useState('');
  const [districtSearch, setDistrictSearch] = useState('');

  // Data arrays
  const allRegions = Array.from(locations.keys()).sort();
  const [filteredRegions, setFilteredRegions] = useState<string[]>([]);
  const [filteredDistricts, setFilteredDistricts] = useState<string[]>([]);

  // Animation
  const slideAnim = useRef(new Animated.Value(width)).current;

  useEffect(() => {
    fetchLocations();
  }, []);

  // Update filtered regions when search or locations change
  useEffect(() => {
    if (regionSearch.trim() === '') {
      setFilteredRegions(allRegions);
    } else {
      const query = regionSearch.toLowerCase();
      setFilteredRegions(
        allRegions.filter((r) => r.toLowerCase().includes(query))
      );
    }
  }, [regionSearch, locations]);


  // Update filtered districts when search or selected region changes
  useEffect(() => {
    if (selectedRegion && locations.has(selectedRegion)) {
      const districts = locations.get(selectedRegion)!;
      if (districtSearch.trim() === '') {
        setFilteredDistricts(districts);
      } else {
        const query = districtSearch.toLowerCase();
        setFilteredDistricts(districts.filter((d) => d.toLowerCase().includes(query)));
      }
    } else {
      setFilteredDistricts([]);
    }
  }, [selectedRegion, districtSearch, locations]);

  const openPanel = (region: string) => {
    setSelectedRegion(region);
    setIsPanelOpen(true);
    setDistrictSearch('');
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closePanel = () => {
    Animated.timing(slideAnim, {
      toValue: width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsPanelOpen(false);
      setSelectedRegion(null);
    });
  };

  const selectDistrict = (district: string) => {
    setSelectedDistrict(district);
  };

  const confirmLocation = () => {
    if (selectedRegion) {
      let locationString = selectedRegion;
      if (selectedDistrict) {
        locationString += ` - ${selectedDistrict}`;
      }
      setSelectedLocation(locationString);
      router.back();
    }
  };

  const selectRegionOnly = () => {
    if (selectedRegion) {
      setSelectedLocation(selectedRegion);
      router.back();
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: 'red' }}>{error}</Text>
        <TouchableOpacity onPress={fetchLocations}>
          <Text style={{ color: PURPLE, marginTop: 10 }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (locations.size === 0) {
    return (
      <EmptyScreen
        icon="search-off"
        title="No Regions Found"
        message="Try again later"
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={PURPLE} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Location</Text>
          <TouchableOpacity style={styles.locationIcon}>
            <Ionicons name="location-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {selectedDistrict ? (
          <View style={styles.selectedChip}>
            <Ionicons name="location" size={18} color={PURPLE} />
            <Text style={styles.selectedChipText}>
              {selectedRegion} - {selectedDistrict}
            </Text>
          </View>
        ) : (
          <Text style={styles.headerSubtitle}>Choose your region</Text>
        )}
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={PURPLE} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search regions..."
          value={regionSearch}
          onChangeText={setRegionSearch}
          placeholderTextColor="#999"
        />
        {regionSearch.length > 0 && (
          <TouchableOpacity onPress={() => setRegionSearch('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Regions List */}
      <FlatList
        data={filteredRegions}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const districts = locations.get(item) || [];
          const isSelected = selectedRegion === item;
          return (
            <TouchableOpacity
              style={[styles.regionCard, isSelected && styles.selectedCard]}
              onPress={() => openPanel(item)}
            >
              <View style={styles.regionIcon}>
                <Ionicons name="business" size={24} color={PURPLE} />
              </View>
              <View style={styles.regionInfo}>
                <Text style={styles.regionName}>{item}</Text>
                <Text style={styles.regionDistricts}>{districts.length} districts</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={24}
                color={isSelected ? PURPLE : '#999'}
              />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <Ionicons name="search-off" size={60} color="#ccc" />
            <Text style={styles.emptyTitle}>No regions found</Text>
            <Text style={styles.emptySubtitle}>Try a different search term</Text>
          </View>
        }
      />

      {/* Districts Panel */}
      {isPanelOpen && selectedRegion && (
        <>
          <TouchableOpacity style={styles.overlay} onPress={closePanel} activeOpacity={1} />
          <Animated.View
            style={[
              styles.panel,
              { transform: [{ translateX: slideAnim }] },
            ]}
          >
            {/* Panel Header */}
            <View style={styles.panelHeader}>
              <TouchableOpacity onPress={closePanel} style={styles.panelBack}>
                <Ionicons name="arrow-back" size={24} color={PURPLE} />
              </TouchableOpacity>
              <Text style={styles.panelTitle}>{selectedRegion}</Text>
              <View style={{ width: 40 }} />
            </View>

            {/* Districts Search */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={PURPLE} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search districts..."
                value={districtSearch}
                onChangeText={setDistrictSearch}
                placeholderTextColor="#999"
              />
              {districtSearch.length > 0 && (
                <TouchableOpacity onPress={() => setDistrictSearch('')}>
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>

            {/* Option to select region only (if isService not true) */}
            {!isService && (
              <TouchableOpacity style={styles.regionOnlyOption} onPress={selectRegionOnly}>
                <Ionicons
                  name={selectedDistrict === null ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={selectedDistrict === null ? PURPLE : '#999'}
                />
                <Text style={styles.regionOnlyText}>{selectedRegion} Region</Text>
              </TouchableOpacity>
            )}

            {/* Districts List */}
            <FlatList
              data={filteredDistricts}
              keyExtractor={(item) => item}
              contentContainerStyle={styles.districtList}
              renderItem={({ item }) => {
                const isSelected = selectedDistrict === item;
                return (
                  <TouchableOpacity
                    style={[styles.districtItem, isSelected && styles.selectedDistrict]}
                    onPress={() => selectDistrict(item)}
                  >
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={isSelected ? PURPLE : '#999'}
                    />
                    <Text style={[styles.districtName, isSelected && styles.selectedDistrictName]}>
                      {item}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={20} color={PURPLE} />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  <Ionicons name="location-off" size={60} color="#ccc" />
                  <Text style={styles.emptyTitle}>No districts found</Text>
                  <Text style={styles.emptySubtitle}>Try a different search term</Text>
                </View>
              }
            />

            {/* Confirm Button */}
            {selectedDistrict && (
              <TouchableOpacity style={styles.confirmButton} onPress={confirmLocation}>
                <Text style={styles.confirmText}>Confirm Location</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: PURPLE,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 8,
  },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  locationIcon: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 8,
  },
  selectedChip: {
    flexDirection: 'row',
    backgroundColor: 'white',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  selectedChipText: { color: PURPLE, fontWeight: 'bold', marginLeft: 8 },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 16 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#eee',
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16 },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  regionCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: PURPLE,
  },
  regionIcon: {
    backgroundColor: '#EDE9FE',
    borderRadius: 12,
    padding: 12,
    marginRight: 16,
  },
  regionInfo: { flex: 1 },
  regionName: { fontSize: 18, fontWeight: 'bold' },
  regionDistricts: { color: 'gray', fontSize: 14, marginTop: 4 },
  emptyList: { alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 16 },
  emptySubtitle: { color: 'gray', fontSize: 14, marginTop: 8, textAlign: 'center' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: width * 0.85,
    backgroundColor: 'white',
    borderTopLeftRadius: 30,
    borderBottomLeftRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: -5, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  panelHeader: {
    backgroundColor: PURPLE,
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopLeftRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },
  panelBack: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 8,
    marginRight: 16,
  },
  panelTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', flex: 1 },
  regionOnlyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  regionOnlyText: { fontSize: 16, marginLeft: 12, color: '#333' },
  districtList: { paddingHorizontal: 16, paddingBottom: 20 },
  districtItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginBottom: 8,
  },
  selectedDistrict: {
    backgroundColor: '#EDE9FE',
    borderWidth: 2,
    borderColor: PURPLE,
  },
  districtName: { fontSize: 16, marginLeft: 12, flex: 1, color: '#333' },
  selectedDistrictName: { fontWeight: 'bold', color: PURPLE },
  confirmButton: {
    backgroundColor: PURPLE,
    borderRadius: 30,
    paddingVertical: 16,
    margin: 16,
    alignItems: 'center',
  },
  confirmText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});