// app/search/index.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Keyboard,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSelectedLocationStore } from '@/stores/selectedLocationStore'; 
import { db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/stores/auth';

const PURPLE = '#8B5CF6';


export default function SearchScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const { selectedLocation } = useSelectedLocationStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [serviceList, setServiceList] = useState<string[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const searchInputRef = useRef<TextInput>(null);
  const debounceTimer = useRef<number | null>(null);

  // Fetch service list from Firestore
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const docRef = doc(db, 'categories', 'serviceList');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.services && Array.isArray(data.services)) {
            setServiceList(data.services.map((s: any) => String(s)));
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

  

  // Load recent searches from AsyncStorage
  useEffect(() => {
    const loadRecent = async () => {
      try {
        const stored = await AsyncStorage.getItem('recentSearches');
        if (stored) {
          setRecentSearches(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Failed to load recent searches', error);
      }
    };
    loadRecent();
  }, []);

  // Save recent searches
  const saveRecentSearch = async (query: string) => {
    if (!query.trim()) return;
    const updated = [query, ...recentSearches.filter(q => q !== query)].slice(0, 5);
    setRecentSearches(updated);
    await AsyncStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  // Debounced search for suggestions
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        const filtered = serviceList
          .filter(item => item.toLowerCase().includes(searchQuery.toLowerCase()))
          .slice(0, 5);
        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchQuery, serviceList]);

  const handleSuggestionSelect = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    Keyboard.dismiss();
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    searchInputRef.current?.focus();
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Missing search term', 'Please enter a search term');
      return;
    }
    if (selectedLocation === 'Select Location' || !selectedLocation) {
      Alert.alert('Location required', 'Please select a location');
      return;
    }

    await saveRecentSearch(searchQuery.trim());

    // Navigate to results screen
    router.push({
      pathname: '/search/results',
      params: {
        query: searchQuery.trim(),
        location: selectedLocation,
        user: JSON.stringify(user),
      },
    });
  };

  const navigateToLocationSelection = () => {
    router.push('/location/regions');
  };

  const removeRecentSearch = async (index: number) => {
    const updated = recentSearches.filter((_, i) => i !== index);
    setRecentSearches(updated);
    await AsyncStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const clearAllRecent = async () => {
    setRecentSearches([]);
    await AsyncStorage.removeItem('recentSearches');
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={Keyboard.dismiss}
      style={styles.container}
    >
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <View style={styles.searchContainer}>
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="What service are you looking for?"
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => {
                if (searchQuery.length > 0 && suggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
            <Ionicons name="search" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.locationSelector} onPress={navigateToLocationSelection}>
          <Ionicons name="location-outline" size={20} color={PURPLE} />
          <Text style={styles.locationText} numberOfLines={1}>
            {selectedLocation || 'Select Location'}
          </Text>
          <Ionicons name="chevron-forward" size={20} color="gray" />
        </TouchableOpacity>
      </View>

      {/* Content area */}
      <View style={styles.content}>
        {showSuggestions && suggestions.length > 0 ? (
          <View style={styles.suggestionsContainer}>
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => handleSuggestionSelect(item)}
                >
                  <Ionicons name="search-outline" size={20} color={PURPLE} />
                  <Text style={styles.suggestionText}>{item}</Text>
                  <Ionicons name="arrow-up-outline" size={16} color="gray" />
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        ) : (
          <View style={styles.recentContainer}>
            {recentSearches.length > 0 && (
              <View style={styles.recentHeader}>
                <Text style={styles.recentTitle}>Popular Searches</Text>
                <TouchableOpacity onPress={clearAllRecent}>
                  <Text style={styles.clearAllText}>Clear All</Text>
                </TouchableOpacity>
              </View>
            )}
            <FlatList
              data={recentSearches}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item, index }) => (
                <View style={styles.recentItem}>
                  <TouchableOpacity
                    style={styles.recentContent}
                    onPress={() => {
                      setSearchQuery(item);
                      handleSearch();
                    }}
                  >
                    <View style={styles.recentIcon}>
                      <Ionicons name="time-outline" size={20} color={PURPLE} />
                    </View>
                    <Text style={styles.recentText}>{item}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeRecentSearch(index)} style={styles.removeRecent}>
                    <Ionicons name="close" size={18} color="gray" />
                  </TouchableOpacity>
                </View>
              )}
            />
            {loadingServices && (
              <ActivityIndicator style={{ marginTop: 20 }} color={PURPLE} />
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    backgroundColor: PURPLE,
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 25,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
  },
  clearButton: { padding: 4 },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 12,
  },
  locationText: { flex: 1, marginLeft: 8, fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  suggestionsContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  suggestionText: { flex: 1, marginLeft: 12 },
  separator: { height: 1, backgroundColor: '#f0f0f0' },
  recentContainer: { flex: 1 },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentTitle: { fontSize: 18, fontWeight: 'bold' },
  clearAllText: { color: PURPLE, fontWeight: '600' },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 8,
    padding: 8,
  },
  recentContent: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  recentIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recentText: { fontSize: 16 },
  removeRecent: { padding: 8 },
});