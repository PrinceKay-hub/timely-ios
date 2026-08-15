
import { ResultCard } from '@/components/search/ResultCard';
import { db } from '@/firebase';
import { useTheme } from '@/providers/ThemeProvider';
import { useHomeStore } from '@/stores/home';
import { useSearchStore } from '@/stores/searchStore';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const sortOptions = [
  { label: 'Nearest', value: 'distance' },
  { label: 'Highest Rated', value: 'rating' },
];

// Filters apply only within the currently loaded page. True dataset-wide
// filters (e.g. "New Listings") would need to become backend params on
// searchByCategory to stay consistent with totalCount/pagination.
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

export default function CategoryResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category: string }>();
  const {
    results,
    isLoading,
    isLoadingMore,
    error,
    totalCount,
    searchByCategoryAction,
    loadMoreResults,
  } = useSearchStore();
  const { theme } = useTheme();
  const colors = theme.colors;

  const { categories, categoriesError } = useHomeStore();

  const dynamicStyles = useMemo(() => createDynamicStyles(colors), [colors]);

  const [sortBy, setSortBy] = useState<'distance' | 'rating'>('distance');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

  // ─── Category switching ──────────────────────────────────────────────────
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [serviceList, setServiceList] = useState<string[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

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
        console.error('Error fetching categories:', err);
      } finally {
        setLoadingServices(false);
      }
    };
    fetchServices();
  }, []);

  useEffect(() => {
    if (params.category) {
      searchByCategoryAction(params.category);
    }
    // sortBy intentionally re-triggers a fresh server-side fetch rather than
    // re-sorting the client's partial page, since sort order and pagination
    // both come from the backend now.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.category, sortBy]);

  // Filters apply only within the currently loaded page.
  const visibleResults = useMemo(() => {
    if (selectedFilter === 'Verified') {
      return results.filter((item) => item.isVerified === true);
    }
    return results;
  }, [results, selectedFilter]);

  // Chips for quick one-tap category switching — excludes the current one.
  const suggestionChips = useMemo(
    () =>
      categories
        .map((category) => String(category.name ?? category.title ?? category.label ?? ''))
        .filter((category) => category && category !== params.category)
        .slice(0, 8),
    [categories, params.category]
  );

  const handleBack = () => router.back();

  // ─── Retry function ──────────────────────────────────────────────────────
  const handleRetry = () => {
    if (params.category) {
      searchByCategoryAction(params.category);
    }
  };

  const switchCategory = (category: string) => {
    setShowCategoryModal(false);
    if (category !== params.category) {
      router.setParams({ category });
    }
  };

  const goToFreeTextSearch = () => router.push('/search');

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

        <TouchableOpacity
          style={styles.headerText}
          onPress={() => setShowCategoryModal(true)}
          accessibilityLabel="Change category"
          accessibilityRole="button"
        >
          <View style={styles.headerCategoryRow}>
            <Text style={styles.headerQuery} numberOfLines={1}>
              {params.category}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#fff" style={{ marginLeft: 6 }} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={goToFreeTextSearch}
          style={[styles.searchIconButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
          accessibilityLabel="Search by keyword instead"
          accessibilityRole="button"
        >
          <Ionicons name="search" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={styles.resultCount}>
        <Text style={styles.resultCountText}>
          {totalCount} result{totalCount !== 1 ? 's' : ''} found in 10km radius
        </Text>
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
        <Ionicons
          name="options-outline"
          size={20}
          color={showFilters ? '#fff' : colors.primary}
        />
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
          {variant === 'empty' ? 'Try another category' : 'Browse similar'}
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
              onPress={() => switchCategory(term)}
              accessibilityLabel={`Browse ${term}`}
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
        Try a different category or keyword search
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

  // ─── Modern Error UI ──────────────────────────────────────────────────────
  const renderError = () => (
    <View style={[styles.errorContainer, { backgroundColor: colors.surface }]}>
      <View
        style={[
          styles.errorIconContainer,
          { backgroundColor: '#FEE2E2' },
        ]}
      >
        <Ionicons name="wifi-outline" size={48} color={colors.error || '#EF4444'} />
      </View>
      <Text style={[styles.errorTitle, { color: colors.text }]}>
        Something went wrong
      </Text>
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

  // ─── Category picker modal ────────────────────────────────────────────────
  const renderCategoryModal = () => (
    <Modal visible={showCategoryModal} transparent animationType="slide">
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowCategoryModal(false)}
      >
        <View style={[styles.categoryModalContent, { backgroundColor: colors.card }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.textSecondary || '#ccc' }]} />
          <View style={styles.categoryModalHeaderRow}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Choose a category</Text>
            <TouchableOpacity
              onPress={() => {
                setShowCategoryModal(false);
                goToFreeTextSearch();
              }}
              accessibilityLabel="Search by keyword instead"
              accessibilityRole="button"
            >
              <Text style={[styles.categoryModalSearchLink, { color: colors.primary }]}>
                Search instead
              </Text>
            </TouchableOpacity>
          </View>

          {loadingServices ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
          ) : (
            <ScrollView style={{ maxHeight: 360 }}>
              {categories.map((option) => {
                const category = String(
                  option.name ?? option.title ?? option.label ?? option
                );
                return (
                <TouchableOpacity
                  key={category}
                  style={styles.sortOption}
                  onPress={() => switchCategory(category)}
                  accessibilityLabel={`Browse ${category}`}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name={params.category === category ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={params.category === category ? colors.primary : colors.textSecondary || '#999'}
                  />
                  <Text
                    style={[
                      styles.sortOptionText,
                      {
                        color: params.category === category ? colors.primary : colors.textSecondary || '#333',
                        fontWeight: params.category === category ? 'bold' : 'normal',
                      },
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
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

      {renderCategoryModal()}
    </View>
  );
}

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
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backButton: { borderRadius: 20, padding: 8, marginRight: 12 },
  headerText: { flex: 1 },
  headerCategoryRow: { flexDirection: 'row', alignItems: 'center' },
  headerQuery: { color: 'white', fontSize: 20, fontWeight: 'bold', flexShrink: 1 },
  searchIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
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
  categoryModalContent: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    maxHeight: '75%',
  },
  categoryModalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryModalSearchLink: { fontWeight: '600', fontSize: 14 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  sortOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  sortOptionText: { fontSize: 16, marginLeft: 12 },
  errorItem: { padding: 16, marginVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: '#ffeeee' },
  errorItemText: { color: 'red' },

  // ─── Modern Error UI styles ──────────────────────────────────────────────
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorIconContainer: {
    padding: 20,
    borderRadius: 60,
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});