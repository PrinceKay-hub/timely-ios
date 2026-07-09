// app/search/index.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { useTheme } from '@/providers/ThemeProvider';

export default function SearchScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { selectedLocation } = useSelectedLocationStore();
  const { theme } = useTheme();
  const colors = theme.colors;

  // Create dynamic styles based on the theme
  const styles = useMemo(() => createStyles(colors), [colors]);

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
      style={[styles.container, { backgroundColor: colors.surface }]}
    >
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.searchRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: colors.background }]}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
            <TextInput
              ref={searchInputRef}
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="What service are you looking for?"
              placeholderTextColor={colors.textSecondary || '#999'}
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
                <Ionicons name="close-circle" size={20} color={colors.textSecondary || '#999'} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            onPress={handleSearch}
            style={[styles.searchButton, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="search" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.locationSelector, { backgroundColor: colors.background }]}
          onPress={navigateToLocationSelection}
        >
          <Ionicons name="location-outline" size={20} color={colors.primary} />
          <Text style={[styles.locationText, { color: colors.text }]} numberOfLines={1}>
            {selectedLocation || 'Select Location'}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary || 'gray'} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {showSuggestions && suggestions.length > 0 ? (
          <View style={[styles.suggestionsContainer, { backgroundColor: colors.card }]}>
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => handleSuggestionSelect(item)}
                >
                  <Ionicons name="search-outline" size={20} color={colors.primary} />
                  <Text style={[styles.suggestionText, { color: colors.text }]}>{item}</Text>
                  <Ionicons name="arrow-up-outline" size={16} color={colors.textSecondary || 'gray'} />
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => (
                <View style={[styles.separator, { backgroundColor: colors.border || '#f0f0f0' }]} />
              )}
            />
          </View>
        ) : (
          <View style={styles.recentContainer}>
            {recentSearches.length > 0 && (
              <View style={styles.recentHeader}>
                <Text style={[styles.recentTitle, { color: colors.text }]}>Popular Searches</Text>
                <TouchableOpacity onPress={clearAllRecent}>
                  <Text style={[styles.clearAllText, { color: colors.primary }]}>Clear All</Text>
                </TouchableOpacity>
              </View>
            )}
            <FlatList
              data={recentSearches}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item, index }) => (
                <View style={[styles.recentItem, { backgroundColor: colors.card }]}>
                  <TouchableOpacity
                    style={styles.recentContent}
                    onPress={() => {
                      setSearchQuery(item);
                      handleSearch();
                    }}
                  >
                    <View
                      style={[
                        styles.recentIcon,
                        { backgroundColor: colors.primaryLight || `${colors.primary}18` },
                      ]}
                    >
                      <Ionicons name="time-outline" size={20} color={colors.primary} />
                    </View>
                    <Text style={[styles.recentText, { color: colors.text }]}>{item}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeRecentSearch(index)} style={styles.removeRecent}>
                    <Ionicons name="close" size={18} color={colors.textSecondary || 'gray'} />
                  </TouchableOpacity>
                </View>
              )}
            />
            {loadingServices && (
              <ActivityIndicator style={{ marginTop: 20 }} color={colors.primary} />
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
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
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
    },
    searchContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
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
      justifyContent: 'center',
      alignItems: 'center',
    },
    locationSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 15,
      padding: 12,
    },
    locationText: { flex: 1, marginLeft: 8, fontWeight: '600' },
    content: { flex: 1, padding: 16 },
    suggestionsContainer: {
      borderRadius: 15,
      padding: 8,
      shadowColor: colors.shadow || '#000',
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
    separator: { height: 1 },
    recentContainer: { flex: 1 },
    recentHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    recentTitle: { fontSize: 18, fontWeight: 'bold' },
    clearAllText: { fontWeight: '600' },
    recentItem: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      marginBottom: 8,
      padding: 8,
    },
    recentContent: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    recentIcon: {
      width: 36,
      height: 36,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    recentText: { fontSize: 16 },
    removeRecent: { padding: 8 },
  });