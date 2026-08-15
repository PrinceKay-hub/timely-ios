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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSelectedLocationStore } from '@/stores/selectedLocationStore';
import { db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/providers/ThemeProvider';

export default function SearchScreen() {
  const router = useRouter();
  const { selectedLocation } = useSelectedLocationStore();
  const { theme } = useTheme();
  const colors = theme.colors;

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [serviceList, setServiceList] = useState<string[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const searchInputRef = useRef<TextInput>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const updated = [query, ...recentSearches.filter((q) => q !== query)].slice(0, 5);
    setRecentSearches(updated);
    try {
      await AsyncStorage.setItem('recentSearches', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save recent search', error);
    }
  };

  // Debounced search for suggestions
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        const filtered = serviceList
          .filter((item) => item.toLowerCase().includes(searchQuery.toLowerCase()))
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

  const handleClearSearch = () => {
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    searchInputRef.current?.focus();
  };

  // Accepts an explicit term so callers that just set state (recent search
  // taps, suggestion taps) don't fall victim to React's async state update —
  // reading `searchQuery` here directly after calling setSearchQuery would
  // use the *previous* render's value, not the one just selected.
  const performSearch = async (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) {
      Alert.alert('Missing search term', 'Please enter a search term');
      return;
    }
    if (selectedLocation === 'Select Location' || !selectedLocation) {
      Alert.alert('Location required', 'Please select a location');
      return;
    }

    setShowSuggestions(false);
    Keyboard.dismiss();
    await saveRecentSearch(trimmed);

    router.push({
      pathname: '/search/results',
      params: {
        query: trimmed,
        location: selectedLocation,
      },
    });
  };

  const handleSearch = () => performSearch(searchQuery);

  const handleSuggestionSelect = (suggestion: string) => {
    setSearchQuery(suggestion);
    performSearch(suggestion);
  };

  const handleRecentSelect = (item: string) => {
    setSearchQuery(item);
    performSearch(item);
  };

  const navigateToLocationSelection = () => {
    router.push('/location/regions');
  };

  const removeRecentSearch = async (index: number) => {
    const updated = recentSearches.filter((_, i) => i !== index);
    setRecentSearches(updated);
    try {
      await AsyncStorage.setItem('recentSearches', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to remove recent search', error);
    }
  };

  const clearAllRecent = async () => {
    setRecentSearches([]);
    try {
      await AsyncStorage.removeItem('recentSearches');
    } catch (error) {
      console.error('Failed to clear recent searches', error);
    }
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
            style={styles.backButton}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          <View style={styles.searchPill}>
            <Ionicons name="search" size={18} color="rgba(255,255,255,0.85)" style={{ marginRight: 8 }} />
            <TextInput
              ref={searchInputRef}
              style={styles.searchPillInput}
              placeholder="Search for a service"
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
              onFocus={() => {
                if (searchQuery.length > 0 && suggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={handleClearSearch}
                style={styles.clearButton}
                accessibilityLabel="Clear search"
                accessibilityRole="button"
              >
                <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.85)" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={handleSearch}
            style={styles.searchIconButton}
            accessibilityLabel="Search"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.locationRow}
          onPress={navigateToLocationSelection}
          accessibilityLabel="Select location"
          accessibilityRole="button"
        >
          <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.9)" />
          <Text style={styles.locationText} numberOfLines={1}>
            {' '}{selectedLocation || 'Select Location'}
          </Text>
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.7)" />
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
                  accessibilityLabel={`Search for ${item}`}
                  accessibilityRole="button"
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
                <Text style={[styles.recentTitle, { color: colors.text }]}>Recent Searches</Text>
                <TouchableOpacity
                  onPress={clearAllRecent}
                  accessibilityLabel="Clear all recent searches"
                  accessibilityRole="button"
                >
                  <Text style={[styles.clearAllText, { color: colors.primary }]}>Clear All</Text>
                </TouchableOpacity>
              </View>
            )}
            <FlatList
              data={recentSearches}
              keyExtractor={(item, index) => `${item}-${index}`}
              renderItem={({ item, index }) => (
                <View style={[styles.recentItem, { backgroundColor: colors.card }]}>
                  <TouchableOpacity
                    style={styles.recentContent}
                    onPress={() => handleRecentSelect(item)}
                    accessibilityLabel={`Search for ${item}`}
                    accessibilityRole="button"
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
                  <TouchableOpacity
                    onPress={() => removeRecentSearch(index)}
                    style={styles.removeRecent}
                    accessibilityLabel={`Remove ${item} from recent searches`}
                    accessibilityRole="button"
                  >
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
      paddingBottom: 20,
      paddingHorizontal: 16,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
    },
    searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    searchPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    searchPillInput: {
      flex: 1,
      color: 'white',
      fontSize: 15,
      padding: 0,
    },
    clearButton: { padding: 4, marginLeft: 4 },
    searchIconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    locationRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 46 },
    locationText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600', flexShrink: 1 },
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