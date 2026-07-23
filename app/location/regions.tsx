import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { useTheme } from '@/providers/ThemeProvider';

const { width, height } = Dimensions.get('window');

export default function RegionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isService } = params;

  const { locations, isLoading, error, fetchLocations } = useLocationStore();
  const { setSelectedLocation } = useSelectedLocationStore();
  const { theme } = useTheme();
  const colors = theme.colors;

  // Create dynamic styles based on the theme
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const [regionSearch, setRegionSearch] = useState('');
  const [districtSearch, setDistrictSearch] = useState('');

  const allRegions = Array.from(locations.keys()).sort();
  const [filteredRegions, setFilteredRegions] = useState<string[]>([]);
  const [filteredDistricts, setFilteredDistricts] = useState<string[]>([]);

  const slideAnim = useRef(new Animated.Value(width)).current;

  useEffect(() => {
    fetchLocations();
  }, []);

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
      <View style={[styles.center, { backgroundColor: colors.surface }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.surface }]}>
        <Text style={{ color: colors.error || 'red' }}>{error}</Text>
        <TouchableOpacity onPress={fetchLocations}>
          <Text style={{ color: colors.primary, marginTop: 10 }}>Retry</Text>
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
      style={[styles.container, { backgroundColor: colors.surface }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} 
          style={[styles.backButton, { backgroundColor: '#fff'}]
          }>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Location</Text>
          <TouchableOpacity style={[styles.locationIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Ionicons name="location-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {selectedDistrict ? (
          <View style={[styles.selectedChip, { backgroundColor: colors.background }]}>
            <Ionicons name="location" size={18} color={colors.primary} />
            <Text style={[styles.selectedChipText, { color: colors.primary }]}>
              {selectedRegion} - {selectedDistrict}
            </Text>
          </View>
        ) : (
          <Text style={styles.headerSubtitle}>Choose your region</Text>
        )}
      </View>

      {/* Search Input */}
      <View style={[
        styles.searchContainer,
        {
          backgroundColor: colors.card || colors.background,
          borderColor: colors.border || '#eee',
        }
      ]}>
        <Ionicons name="search" size={20} color={colors.primary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search regions..."
          value={regionSearch}
          onChangeText={setRegionSearch}
          placeholderTextColor={colors.textSecondary || '#999'}
        />
        {regionSearch.length > 0 && (
          <TouchableOpacity onPress={() => setRegionSearch('')}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary || '#999'} />
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
              style={[
                styles.regionCard,
                {
                  backgroundColor: colors.card || colors.background,
                  shadowColor:  '#000',
                },
                isSelected && { borderColor: colors.primary, borderWidth: 2 },
              ]}
              onPress={() => openPanel(item)}
            >
              <View style={[styles.regionIcon, { backgroundColor: colors.primaryLight || `${colors.primary}18` }]}>
                <Ionicons name="business" size={24} color={colors.primary} />
              </View>
              <View style={styles.regionInfo}>
                <Text style={[styles.regionName, { color: colors.text }]}>{item}</Text>
                <Text style={[styles.regionDistricts, { color: colors.textSecondary }]}>
                  {districts.length} districts
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={24}
                color={isSelected ? colors.primary : colors.textSecondary || '#999'}
              />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <Ionicons name="search-off" size={60} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No regions found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Try a different search term
            </Text>
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
              {
                backgroundColor: colors.card || colors.background,
                shadowColor: '#000',
              },
              { transform: [{ translateX: slideAnim }] },
            ]}
          >
            {/* Panel Header */}
            <View style={[styles.panelHeader, { backgroundColor: colors.primary }]}>
              <TouchableOpacity onPress={closePanel} style={[styles.panelBack, { backgroundColor: colors.background }]}>
                <Ionicons name="arrow-back" size={24} color={colors.primary} />
              </TouchableOpacity>
              <Text style={[styles.panelTitle, { color: 'white' }]}>{selectedRegion}</Text>
              <View style={{ width: 40 }} />
            </View>

            {/* Districts Search */}
            <View style={[
              styles.searchContainer,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border || '#eee',
              }
            ]}>
              <Ionicons name="search" size={20} color={colors.primary} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search districts..."
                value={districtSearch}
                onChangeText={setDistrictSearch}
                placeholderTextColor={colors.textSecondary || '#999'}
              />
              {districtSearch.length > 0 && (
                <TouchableOpacity onPress={() => setDistrictSearch('')}>
                  <Ionicons name="close-circle" size={20} color={colors.textSecondary || '#999'} />
                </TouchableOpacity>
              )}
            </View>

            {/* Option to select region only (if isService not true) */}
            {!isService && (
              <TouchableOpacity
                style={[styles.regionOnlyOption, { borderBottomColor: colors.border || '#eee' }]}
                onPress={selectRegionOnly}
              >
                <Ionicons
                  name={selectedDistrict === null ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={selectedDistrict === null ? colors.primary : colors.textSecondary || '#999'}
                />
                <Text style={[styles.regionOnlyText, { color: colors.text }]}>
                  {selectedRegion} Region
                </Text>
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
                    style={[
                      styles.districtItem,
                      {
                        backgroundColor: isSelected ? colors.primaryLight || `${colors.primary}18` : colors.surface,
                        borderColor: isSelected ? colors.primary : 'transparent',
                        borderWidth: isSelected ? 2 : 0,
                      },
                    ]}
                    onPress={() => selectDistrict(item)}
                  >
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={isSelected ? colors.primary : colors.textSecondary || '#999'}
                    />
                    <Text style={[
                      styles.districtName,
                      {
                        color: isSelected ? colors.primary : colors.text,
                        fontWeight: isSelected ? 'bold' : 'normal',
                      }
                    ]}>
                      {item}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  <Ionicons name="location-off" size={60} color={colors.textSecondary} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No districts found</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                    Try a different search term
                  </Text>
                </View>
              }
            />

            {/* Confirm Button */}
            {selectedDistrict && (
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: colors.primary }]}
                onPress={confirmLocation}
              >
                <Text style={styles.confirmText}>Confirm Location</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
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
      borderRadius: 20,
      padding: 8,
    },
    headerTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
    locationIcon: {
      borderRadius: 20,
      padding: 8,
    },
    selectedChip: {
      flexDirection: 'row',
      alignSelf: 'flex-start',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      alignItems: 'center',
    },
    selectedChipText: { fontWeight: 'bold', marginLeft: 8 },
    headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 16 },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 20,
      marginTop: 20,
      marginBottom: 10,
      paddingHorizontal: 15,
      borderRadius: 15,
      borderWidth: 1,
    },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, paddingVertical: 12, fontSize: 16 },
    listContent: { paddingHorizontal: 20, paddingBottom: 20 },
    regionCard: {
      flexDirection: 'row',
      borderRadius: 15,
      padding: 16,
      marginBottom: 12,
      alignItems: 'center',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    regionIcon: {
      borderRadius: 12,
      padding: 12,
      marginRight: 16,
    },
    regionInfo: { flex: 1 },
    regionName: { fontSize: 18, fontWeight: 'bold' },
    regionDistricts: { fontSize: 14, marginTop: 4 },
    emptyList: { alignItems: 'center', padding: 40 },
    emptyTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 16 },
    emptySubtitle: { fontSize: 14, marginTop: 8, textAlign: 'center' },
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
      borderTopLeftRadius: 30,
      borderBottomLeftRadius: 30,
      shadowOffset: { width: -5, height: 0 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 10,
    },
    panelHeader: {
      paddingTop: 50,
      paddingHorizontal: 20,
      paddingBottom: 20,
      borderTopLeftRadius: 30,
      flexDirection: 'row',
      alignItems: 'center',
    },
    panelBack: {
      borderRadius: 20,
      padding: 8,
      marginRight: 16,
    },
    panelTitle: { fontSize: 22, fontWeight: 'bold', flex: 1 },
    regionOnlyOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
    },
    regionOnlyText: { fontSize: 16, marginLeft: 12 },
    districtList: { paddingHorizontal: 16, paddingBottom: 20 },
    districtItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      marginBottom: 8,
    },
    districtName: { fontSize: 16, marginLeft: 12, flex: 1 },
    confirmButton: {
      borderRadius: 30,
      paddingVertical: 16,
      margin: 16,
      alignItems: 'center',
    },
    confirmText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  });