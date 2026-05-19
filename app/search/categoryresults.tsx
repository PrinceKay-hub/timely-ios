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
  Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSearchStore } from '@/stores/searchStore';
import { ResultCard } from '@/components/search/ResultCard';

const PURPLE = '#8B5CF6';

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

export default function CategoryResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category: string;}>();
  const { results, isLoading, error, searchByCategoryAction } = useSearchStore();

  // Local state for sorting and filtering
  const [sortBy, setSortBy] = useState('Recommended');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

  // Parse location


  useEffect(() => {
    if (params.category) {
      searchByCategoryAction(
        params.category,
      );
    }
  }, [params.category]);



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

  // Apply filtering and sorting to results
  const filteredResults = useMemo(() => {
    let filtered = [...results];

    // Apply filter
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

    // Apply sort
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
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={PURPLE} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerQuery} numberOfLines={1}>
            {params.category}
          </Text>
        </View>
      </View>
      <View style={styles.resultCount}>
        <Text style={styles.resultCountText}>
          {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''} found in 10km radius
        </Text>
      </View>
    </View>
  );

  const renderSortFilterBar = () => (
    <View style={styles.sortFilterBar}>
      <TouchableOpacity style={styles.sortButton} onPress={() => setShowSortModal(true)}>
        <Ionicons name="funnel-outline" size={20} color={PURPLE} />
        <Text style={styles.sortButtonText}>{sortBy}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.filterButton, showFilters && styles.filterButtonActive]}
        onPress={() => setShowFilters(!showFilters)}
      >
        <Ionicons
          name="options-outline"
          size={20}
          color={showFilters ? 'white' : PURPLE}
        />
      </TouchableOpacity>
    </View>
  );

  const renderFilterChips = () => (
  <View style={styles.filterChipsContainer}>
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
            selectedFilter === filter && styles.filterChipActive,
          ]}
          onPress={() => setSelectedFilter(filter)}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedFilter === filter && styles.filterChipTextActive,
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
      <Ionicons name="search-outline" size={60} color="#ccc" />
      <Text style={styles.emptyTitle}>No results found</Text>
      <Text style={styles.emptySubtitle}>Try a different search or location</Text>
    </View>
  );

  if (isLoading && results.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: 'red', marginBottom: 10 }}>{error}</Text>
        <TouchableOpacity onPress={() => searchByCategoryAction(params.category)}>
          <Text style={{ color: PURPLE }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderSortFilterBar()}
      {showFilters && renderFilterChips()}

      <FlatList
        data={filteredResults}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ResultCard item={item} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty()}
      />

      {/* Sort Modal */}
      <Modal visible={showSortModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSortModal(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Sort By</Text>
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
                  color={sortBy === option ? PURPLE : '#999'}
                />
                <Text style={[styles.sortOptionText, sortBy === option && styles.sortOptionTextActive]}>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: 'white',
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
    backgroundColor: 'white',
  },
  sortButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingVertical: 12,
    marginRight: 12,
  },
  sortButtonText: { fontWeight: '600', marginLeft: 8, color: '#333' },
  filterButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 12,
  },
  filterButtonActive: {
    backgroundColor: PURPLE,
  },
  filterChipsContainer: {
  height: 56,                // Fixed height for the row
  backgroundColor: 'white',
  justifyContent: 'center',  // Center the chips vertically
},
filterChipsContent: {
  paddingHorizontal: 20,
  paddingVertical: 8,
},
filterChip: {
  paddingHorizontal: 16,
  paddingVertical: 8,
  backgroundColor: '#f5f5f5',
  borderRadius: 20,
  borderWidth: 1,
  borderColor: '#eee',
  marginRight: 8,            // Horizontal spacing between chips
},
  filterChipActive: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  filterChipText: { fontWeight: '600', color: '#333' },
  filterChipTextActive: { color: 'white' },
  listContent: { padding: 20 },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 16 },
  emptySubtitle: { color: 'gray', fontSize: 14, marginTop: 8, textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
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
  sortOptionText: { fontSize: 16, marginLeft: 12, color: '#333' },
  sortOptionTextActive: { fontWeight: 'bold', color: PURPLE },
});