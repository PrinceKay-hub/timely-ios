import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSearchStore } from '@/stores/searchStore';
import { ResultCard } from '@/components/search/ResultCard';
import { useTheme } from '@/providers/ThemeProvider';

const sortOptions = [
  'Recommended',
  'Highest Rated',
  'Most Reviews',
  'Nearest',
];

const filterOptions = [
  'All',
  'Highly Rated (4.5+)',
  'New Listings',
  'Verified',
];

// Safe wrapper component
const SafeResultCard = ({ item, colors }: { item: any; colors: any }) => {
  try {
    return <ResultCard item={item} />;
  } catch (error) {
    console.error('Error rendering ResultCard for item:', item?.id, error);
    return (
      <View style={[styles.errorItem, { backgroundColor: colors.errorLight || '#ffeeee' }]}>
        <Text style={{ color: colors.error || 'red' }}>Error rendering item</Text>
      </View>
    );
  }
};

export default function SearchResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ query: string; location: string }>();
  const { results, isLoading, error, fetchSearchResults } = useSearchStore();
  const { theme } = useTheme();
  const colors = theme.colors;

  // Create dynamic styles based on the theme
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [sortBy, setSortBy] = useState('Recommended');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

  const [region, setRegion] = useState('');
  const [district, setDistrict] = useState('');

  useEffect(() => {
    const parts = params.location.split(' - ');
    if (parts.length === 2) {
      setRegion(parts[0]);
      setDistrict(parts[1]);
    } else {
      setRegion(params.location);
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
  }, [params.query, region, district]);

  const calculateRecommendationScore = (item: any) => {
    const rating = item.rating || 0;
    const reviews = item.reviews || 0;
    const distance = item.distance || 100;

    const ratingWeight = 0.5;
    const reviewsWeight = 0.3;
    const distanceWeight = 0.2;

    const normalizedReviews = reviews > 0 ? Math.min(reviews / 100, 1) : 0;
    const normalizedDistance = distance > 0 ? 1 / (1 + distance / 10) : 1;

    return (rating / 5) * ratingWeight + normalizedReviews * reviewsWeight + normalizedDistance * distanceWeight;
  };

  // Apply filtering and sorting
  const filteredResults = useMemo(() => {
    if (!results || !Array.isArray(results)) return [];

    let filtered = [...results];

    switch (selectedFilter) {
      case 'Highly Rated (4.5+)':
        filtered = filtered.filter(item => (item.rating || 0) >= 4.5);
        break;
      case 'New Listings':
        filtered = filtered.filter(item => {
          const createdAt = item.createdAt ? new Date(item.createdAt) : null;
          if (!createdAt) return false;
          const daysDiff = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
          return daysDiff <= 30;
        });
        break;
      case 'Verified':
        filtered = filtered.filter(item => item.isVerified === true);
        break;
      default:
        break;
    }

    switch (sortBy) {
      case 'Highest Rated':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'Most Reviews':
        filtered.sort((a, b) => (b.reviews || 0) - (a.reviews || 0));
        break;
      case 'Nearest':
        filtered.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
        break;
      case 'Recommended':
      default:
        filtered.sort((a, b) => {
          const scoreA = calculateRecommendationScore(a);
          const scoreB = calculateRecommendationScore(b);
          return scoreB - scoreA;
        });
        break;
    }
    return filtered;
  }, [results, selectedFilter, sortBy]);

  const handleBack = () => router.back();

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: colors.primary }]}>
      <View style={styles.headerTop}>
        <TouchableOpacity
          onPress={handleBack}
          style={[styles.backButton, { backgroundColor: colors.background }]}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerQuery} numberOfLines={1}>
            {params.query}
          </Text>
          <Text style={styles.headerLocation}>
            in {region} {district ? `- ${district}` : ''}
          </Text>
        </View>
      </View>
      <View style={styles.resultCount}>
        <Text style={styles.resultCountText}>
          {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''} found
        </Text>
      </View>
    </View>
  );

  const renderSortFilterBar = () => (
    <View style={[styles.sortFilterBar, { backgroundColor: colors.card }]}>
      <TouchableOpacity
        style={[styles.sortButton, { backgroundColor: colors.surface }]}
        onPress={() => setShowSortModal(true)}
      >
        <Ionicons name="funnel-outline" size={20} color={colors.primary} />
        <Text style={[styles.sortButtonText, { color: colors.text }]}>{sortBy}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.filterButton,
          { backgroundColor: showFilters ? colors.primary : colors.surface },
        ]}
        onPress={() => setShowFilters(!showFilters)}
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
          >
            <Text
              style={[
                styles.filterChipText,
                {
                  color: selectedFilter === filter ? '#fff' : colors.textSecondary || '#333',
                },
              ]}
            >
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="search-outline" size={60} color={colors.textSecondary || '#ccc'} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No results found</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary || 'gray' }]}>
        Try a different search or location
      </Text>
    </View>
  );

  if (isLoading && results.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.surface }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.surface }]}>
        <Text style={{ color: colors.error || 'red', marginBottom: 10 }}>{error}</Text>
        <TouchableOpacity
          onPress={() =>
            fetchSearchResults({ query: params.query, region, district: district || undefined })
          }
        >
          <Text style={{ color: colors.primary }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {renderHeader()}
      {renderSortFilterBar()}
      {showFilters && renderFilterChips()}

      <FlatList
        data={filteredResults}
        keyExtractor={(item, index) => item?.id ?? `fallback-${index}`}
        renderItem={({ item }) => {
          try {
            return <SafeResultCard item={item} colors={colors} />;
          } catch (error) {
            console.error('FlatList render error for item:', item?.id, error);
            return null;
          }
        }}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty()}
      />

      {/* Sort Modal */}
      <Modal visible={showSortModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.textSecondary || '#ccc' }]} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Sort By</Text>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.sortOption}
                onPress={() => {
                  setSortBy(option);
                  setShowSortModal(false);
                }}
              >
                <Ionicons
                  name={sortBy === option ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={sortBy === option ? colors.primary : colors.textSecondary || '#999'}
                />
                <Text
                  style={[
                    styles.sortOptionText,
                    {
                      color: sortBy === option ? colors.primary : colors.textSecondary || '#333',
                      fontWeight: sortBy === option ? 'bold' : 'normal',
                    },
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
      marginBottom: 16,
    },
    backButton: {
      borderRadius: 20,
      padding: 8,
      marginRight: 16,
    },
    headerText: { flex: 1 },
    headerQuery: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    headerLocation: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 2 },
    resultCount: {
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 6,
    },
    resultCountText: { color: 'white', fontWeight: '600' },
    sortFilterBar: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
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
    filterButton: {
      borderRadius: 10,
      padding: 12,
    },
    filterChipsContainer: {
      height: 56,
      justifyContent: 'center',
    },
    filterChipsContent: {
      paddingHorizontal: 20,
      paddingVertical: 8,
    },
    filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      marginRight: 8,
    },
    filterChipText: { fontWeight: '600' },
    listContent: { padding: 20 },
    emptyContainer: { alignItems: 'center', padding: 40 },
    emptyTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 16 },
    emptySubtitle: { fontSize: 14, marginTop: 8, textAlign: 'center' },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      padding: 20,
    },
    modalHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 20,
    },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
    sortOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
    },
    sortOptionText: { fontSize: 16, marginLeft: 12 },
    errorItem: {
      padding: 16,
      marginVertical: 8,
      borderRadius: 8,
      alignItems: 'center',
    },
  });