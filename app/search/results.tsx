
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
  Keyboard,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSearchStore } from '@/stores/searchStore';
import { useSelectedLocationStore } from '@/stores/selectedLocationStore';
import { ResultCard } from '@/components/search/ResultCard';
import { useTheme } from '@/providers/ThemeProvider';
import { db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

const sortOptions = [
  { label: 'Nearest', value: 'distance' },
  { label: 'Highest Rated', value: 'rating' },
];

const filterOptions = ['All', 'Verified'];

const SafeResultCard = ({ item }: { item: any }) => {
  try {
    return <ResultCard item={item} />;
  } catch (error) {
    console.error('Error rendering ResultCard for item:', item?.id, error);
    return (
      <View style={styles.errorItem}>
        <Text style={styles.errorItemText}>Error rendering item</Text>
      </View>
    );
  }
};

export default function SearchResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ query: string; location: string }>();
  const {
    results,
    isLoading,
    isLoadingMore,
    error,
    totalCount,
    fetchSearchResults,
    loadMoreResults,
  } = useSearchStore();

  // Used only to notice when the location changes elsewhere (e.g. the
  // region picker) so we can pull it back into this screen's params.
  const { selectedLocation } = useSelectedLocationStore();

  const { theme } = useTheme();
  const colors = theme.colors;

  const dynamicStyles = useMemo(() => createDynamicStyles(colors), [colors]);

  const [sortBy, setSortBy] = useState<'distance' | 'rating'>('distance');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

  const [region, setRegion] = useState('');
  const [district, setDistrict] = useState('');

  // ─── Inline-editable search bar ─────────────────────────────────────────
  const [isEditingQuery, setIsEditingQuery] = useState(false);
  const [queryDraft, setQueryDraft] = useState(params.query ?? '');
  const queryInputRef = useRef<TextInput>(null);

  // ─── "Browse similar" / recovery suggestions ────────────────────────────
  const [serviceList, setServiceList] = useState<string[]>([]);

  useEffect(() => {
    setQueryDraft(params.query ?? '');
  }, [params.query]);

  useEffect(() => {
    const parts = (params.location || '').split(' - ');
    if (parts.length === 2) {
      setRegion(parts[0]);
      setDistrict(parts[1]);
    } else {
      setRegion(params.location || '');
      setDistrict('');
    }
  }, [params.location]);

  useEffect(() => {
    if (params.query && region) {
      fetchSearchResults({
        query: params.query,
        region,
        district: district || undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.query, region, district, sortBy]);

  // If the user changed location via the picker and comes back to this
  // screen, pull the new location into this route's params so the existing
  // fetch effect above picks it up automatically.
  useFocusEffect(
    useCallback(() => {
      if (
        selectedLocation &&
        selectedLocation !== 'Select Location' &&
        selectedLocation !== params.location
      ) {
        router.setParams({ location: selectedLocation });
      }
    }, [selectedLocation, params.location])
  );

  // Light category list for the suggestion chips — same source the search
  // screen uses, kept independent so this screen doesn't depend on that one.
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
      } catch (err) {
        console.error('Error fetching suggestion categories:', err);
      }
    };
    fetchServices();
  }, []);

  const suggestionChips = useMemo(() => {
    const current = (params.query || '').toLowerCase();
    return serviceList.filter((s) => s.toLowerCase() !== current).slice(0, 8);
  }, [serviceList, params.query]);

  const visibleResults = useMemo(() => {
    if (selectedFilter === 'Verified') {
      return results.filter((item) => item.isVerified === true);
    }
    return results;
  }, [results, selectedFilter]);

  const handleBack = () => router.back();

  const handleRetry = () => {
    fetchSearchResults({
      query: params.query,
      region,
      district: district || undefined,
    });
  };

  // ─── Query editing ───────────────────────────────────────────────────────
  const beginEditingQuery = () => {
    setIsEditingQuery(true);
    // wait a tick for the TextInput to mount before focusing
    requestAnimationFrame(() => queryInputRef.current?.focus());
  };

  const submitQuery = (raw: string) => {
    const trimmed = raw.trim();
    Keyboard.dismiss();
    setIsEditingQuery(false);
    if (!trimmed || trimmed === params.query) {
      setQueryDraft(params.query ?? '');
      return;
    }
    router.setParams({ query: trimmed });
  };

  const handleChipPress = (term: string) => {
    Keyboard.dismiss();
    setIsEditingQuery(false);
    router.setParams({ query: term });
  };

  const openLocationPicker = () => router.push('/location/regions');

  // ─── Render helpers ──────────────────────────────────────────────────────

  const renderHeader = () => (
    <View style={[dynamicStyles.header, { backgroundColor: colors.primary }]}>
      <View style={styles.headerTop}>
        <TouchableOpacity
          onPress={handleBack}
          style={[styles.backButton, { backgroundColor: '#fff' }]}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>

        <View style={styles.searchPill}>
          <Ionicons name="search" size={18} color="#fff" style={{ marginRight: 8 }} />
          {isEditingQuery ? (
            <TextInput
              ref={queryInputRef}
              style={styles.searchPillInput}
              value={queryDraft}
              onChangeText={setQueryDraft}
              onSubmitEditing={() => submitQuery(queryDraft)}
              onBlur={() => submitQuery(queryDraft)}
              placeholder="Search for a service"
              placeholderTextColor="rgba(255,255,255,0.7)"
              returnKeyType="search"
              autoFocus
            />
          ) : (
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={beginEditingQuery}
              accessibilityLabel="Edit search"
              accessibilityRole="button"
            >
              <Text style={styles.headerQuery} numberOfLines={1}>
                {params.query}
              </Text>
            </TouchableOpacity>
          )}
          {isEditingQuery && queryDraft.length > 0 && (
            <TouchableOpacity
              onPress={() => setQueryDraft('')}
              accessibilityLabel="Clear search text"
              accessibilityRole="button"
            >
              <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.bottomHearderRow}>
          <TouchableOpacity
        style={styles.locationRow}
        onPress={openLocationPicker}
        accessibilityLabel="Change location"
        accessibilityRole="button"
      >
        <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.9)" />
        <Text style={styles.headerLocation} numberOfLines={1} >
          {' '}in {region} {district ? `- ${district}` : ''}
        </Text>
        <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>

      <View style={styles.resultCount}>
        <Text style={styles.resultCountText}>
          {totalCount} result{totalCount !== 1 ? 's' : ''} found
        </Text>
      </View>
      </View>

      
    </View>
  );

  const renderSortFilterBar = () => (
    <View style={[styles.sortFilterBar, { backgroundColor: colors.card }]}>
      <TouchableOpacity
        style={[styles.sortButton, { backgroundColor: colors.surface }]}
        onPress={() => setShowSortModal(true)}
        accessibilityLabel="Change sort order"
        accessibilityRole="button"
      >
        <Ionicons name="funnel-outline" size={20} color={colors.primary} />
        <Text style={[styles.sortButtonText, { color: colors.text }]}>
          {sortOptions.find((o) => o.value === sortBy)?.label}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.filterButton,
          { backgroundColor: showFilters ? colors.primary : colors.surface },
        ]}
        onPress={() => setShowFilters(!showFilters)}
        accessibilityLabel="Toggle filters"
        accessibilityRole="button"
      >
        <Ionicons name="options-outline" size={20} color={showFilters ? '#fff' : colors.primary} />
      </TouchableOpacity>
    </View>
  );

  const renderFilterChips = () => (
    <View style={[styles.filterChipsContainer, { backgroundColor: colors.card }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChipsContent}
      >
        {filterOptions.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterChip,
              {
                backgroundColor: selectedFilter === filter ? colors.primary : colors.surface,
                borderColor: selectedFilter === filter ? colors.primary : colors.border || '#eee',
              },
            ]}
            onPress={() => setSelectedFilter(filter)}
            accessibilityLabel={`Filter: ${filter}`}
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.filterChipText,
                { color: selectedFilter === filter ? '#fff' : colors.textSecondary || '#333' },
              ]}
            >
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderSuggestionChips = (variant: 'inline' | 'empty') => {
    if (!suggestionChips.length) return null;
    return (
      <View
        style={[
          styles.suggestionsBar,
          { backgroundColor: colors.card },
          variant === 'empty' && styles.suggestionsBarEmpty,
        ]}
      >
        <Text style={[styles.suggestionsLabel, { color: colors.textSecondary || '#888' }]}>
          {variant === 'empty' ? 'Try searching for' : 'Browse similar'}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestionChipsContent}
        >
          {suggestionChips.map((term) => (
            <TouchableOpacity
              key={term}
              style={[
                styles.suggestionChip,
                { backgroundColor: colors.surface, borderColor: colors.border || '#eee' },
              ]}
              onPress={() => handleChipPress(term)}
              accessibilityLabel={`Search for ${term}`}
              accessibilityRole="button"
            >
              <Text style={[styles.suggestionChipText, { color: colors.text }]}>{term}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="search-outline" size={60} color={colors.textSecondary || '#ccc'} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No results found</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary || 'gray' }]}>
        Try a different search or location
      </Text>
      {renderSuggestionChips('empty')}
    </View>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const renderError = () => (
    <View style={[styles.errorContainer, { backgroundColor: colors.surface }]}>
      <View
        style={[
          styles.errorIconContainer,
          { backgroundColor:  '#FEE2E2' },
        ]}
      >
        <Ionicons name="wifi-outline" size={48} color={colors.error || '#EF4444'} />
      </View>
      <Text style={[styles.errorTitle, { color: colors.text }]}>Something went wrong</Text>
      <Text style={[styles.errorMessage, { color: colors.textSecondary || '#6B7280' }]}>
        {error || 'An unexpected error occurred'}
      </Text>
      <TouchableOpacity
        style={[styles.errorButton, { backgroundColor: colors.primary }]}
        onPress={handleRetry}
        accessibilityLabel="Try again"
        accessibilityRole="button"
      >
        <Text style={styles.errorButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  // ─── Screen states ────────────────────────────────────────────────────────

  if (isLoading && results.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.surface }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return renderError();
  }

  // ─── Main view ────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {renderHeader()}
      {renderSortFilterBar()}
      {showFilters && renderFilterChips()}

      <FlatList
        data={visibleResults}
        keyExtractor={(item, index) => item?.id ?? `fallback-${index}`}
        renderItem={({ item }) => {
          try {
            return <SafeResultCard item={item} />;
          } catch (renderError) {
            console.error('FlatList render error for item:', item?.id, renderError);
            return null;
          }
        }}
        ListHeaderComponent={visibleResults.length > 0 ? () => renderSuggestionChips('inline') : null}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={loadMoreResults}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />

      <Modal visible={showSortModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.textSecondary || '#ccc' }]} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Sort by</Text>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.sortOption}
                onPress={() => {
                  setSortBy(option.value as 'distance' | 'rating');
                  setShowSortModal(false);
                }}
                accessibilityLabel={`Sort by ${option.label}`}
                accessibilityRole="button"
              >
                <Ionicons
                  name={sortBy === option.value ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={sortBy === option.value ? colors.primary : colors.textSecondary || '#999'}
                />
                <Text
                  style={[
                    styles.sortOptionText,
                    {
                      color: sortBy === option.value ? colors.primary : colors.textSecondary || '#333',
                      fontWeight: sortBy === option.value ? 'bold' : 'normal',
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const createDynamicStyles = (colors: any) =>
  StyleSheet.create({
    header: {
      paddingTop: 50,
      paddingBottom: 20,
      paddingHorizontal: 20,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
    },
  });

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backButton: { borderRadius: 20, padding: 8, marginRight: 12 },
  searchPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchPillInput: { flex: 1, color: 'white', fontSize: 16, padding: 0 },
  headerQuery: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  locationRow: { flexDirection: 'row', alignItems: 'center',},
  headerLocation: { color: 'rgba(255,255,255,0.85)', fontSize: 13, flexShrink: 1 },
  resultCount: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  resultCountText: { color: 'white', fontWeight: '600' },
  sortFilterBar: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12 },
  sortButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 12,
    marginRight: 12,
  },
  sortButtonText: { fontWeight: '600', marginLeft: 8 },
  filterButton: { borderRadius: 10, padding: 12 },
  filterChipsContainer: { height: 56, justifyContent: 'center' },
  filterChipsContent: { paddingHorizontal: 20, paddingVertical: 8 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: { fontWeight: '600' },
  suggestionsBar: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, marginBottom: 10 },
  suggestionsBarEmpty: { marginTop: 8, width: '100%' },
  suggestionsLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' },
  suggestionChipsContent: { paddingRight: 20 },
  suggestionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    marginRight: 8,
  },
  suggestionChipText: { fontWeight: '600', fontSize: 13 },
  listContent: { padding: 20, paddingTop: 4 },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 16 },
  emptySubtitle: { fontSize: 14, marginTop: 8, textAlign: 'center' },
  footerLoader: { paddingVertical: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  sortOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  sortOptionText: { fontSize: 16, marginLeft: 12 },
  errorItem: { padding: 16, marginVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: '#ffeeee' },
  errorItemText: { color: 'red' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  errorIconContainer: { padding: 20, borderRadius: 60, marginBottom: 24 },
  errorTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  errorMessage: { fontSize: 14, textAlign: 'center', marginBottom: 24 },
  errorButton: { paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12 },
  errorButtonText: { color: '#fff', fontWeight: 'bold' },
  bottomHearderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  }
});