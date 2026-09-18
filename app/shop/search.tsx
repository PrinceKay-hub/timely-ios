import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Dimensions,
    Keyboard,
    StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import {
    collection,
    getDocs,
    getFirestore,
    limit,
    orderBy,
    query,
    where,
} from "firebase/firestore";
import { CATEGORIES, Product, ProductCategory } from "../../types/product";
import { ProductCard } from "@/components/shop/ProductCard";
import { useTheme } from "@/providers/ThemeProvider";

const { width } = Dimensions.get("window");
const GRID_GAP = 12;
const CARD_WIDTH = (width - 16 * 2 - GRID_GAP) / 2;
const MAX_RECENT_SEARCHES = 6;
const CATALOG_LIMIT = 150;

type SortOption = "newest" | "price_asc" | "price_desc";

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
    { id: "newest", label: "Newest" },
    { id: "price_asc", label: "Price: Low to High" },
    { id: "price_desc", label: "Price: High to Low" },
];

// Firestore Timestamp normalizer
function toMillis(value: unknown): number {
    if (typeof value === "number") return value;
    if (value && typeof (value as any).toMillis === "function") {
        return (value as any).toMillis();
    }
    if (value && typeof (value as any).seconds === "number") {
        const nanos = (value as any).nanoseconds ?? 0;
        return (value as any).seconds * 1000 + Math.floor(nanos / 1e6);
    }
    return 0;
}

export default function SearchScreen() {
    const { theme } = useTheme();
    const colors = theme.colors;
    const styles = useMemo(() => createStyles(colors), [colors]);

    const inputRef = useRef<TextInput>(null);

    const [catalog, setCatalog] = useState<Product[]>([]);
    const [catalogLoading, setCatalogLoading] = useState(true);
    const [catalogError, setCatalogError] = useState(false);

    const [searchText, setSearchText] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
    const [sortBy, setSortBy] = useState<SortOption>("newest");
    const [recentSearches, setRecentSearches] = useState<string[]>([]);

    useEffect(() => {
        const t = setTimeout(() => inputRef.current?.focus(), 250);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        loadCatalog();
    }, []);

    async function loadCatalog() {
        setCatalogLoading(true);
        setCatalogError(false);
        try {
            const snap = await getDocs(
                query(
                    collection(getFirestore(), "products"),
                    where("status", "==", "active"),
                    orderBy("createdAt", "desc"),
                    limit(CATALOG_LIMIT)
                )
            );
            setCatalog(snap.docs.map((d) => d.data() as Product));
        } catch (err) {
            console.error("Failed to load search catalog:", err);
            setCatalogError(true);
        } finally {
            setCatalogLoading(false);
        }
    }

    const trimmedQuery = searchText.trim().toLowerCase();
    const isBrowsing = trimmedQuery.length === 0 && !selectedCategory;

    const trending = useMemo(
        () => [...catalog].sort((a, b) => b.viewCount - a.viewCount).slice(0, 8),
        [catalog]
    );

    const results = useMemo(() => {
        let list = catalog;

        if (selectedCategory) {
            list = list.filter((p) => p.category === selectedCategory);
        }
        if (trimmedQuery) {
            list = list.filter(
                (p) =>
                    p.name.toLowerCase().includes(trimmedQuery) ||
                    p.description.toLowerCase().includes(trimmedQuery) ||
                    p.tags.some((t) => t.toLowerCase().includes(trimmedQuery))
            );
        }

        const sorted = [...list];
        if (sortBy === "price_asc") sorted.sort((a, b) => a.price - b.price);
        else if (sortBy === "price_desc") sorted.sort((a, b) => b.price - a.price);
        else sorted.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
        return sorted;
    }, [catalog, selectedCategory, trimmedQuery, sortBy]);

    function commitSearch(term: string) {
        const cleaned = term.trim();
        if (!cleaned) return;
        setRecentSearches((prev) => {
            const withoutDupe = prev.filter((s) => s.toLowerCase() !== cleaned.toLowerCase());
            return [cleaned, ...withoutDupe].slice(0, MAX_RECENT_SEARCHES);
        });
    }

    function handleSubmit() {
        commitSearch(searchText);
        Keyboard.dismiss();
    }

    function applyRecentSearch(term: string) {
        setSearchText(term);
    }

    function removeRecentSearch(term: string) {
        setRecentSearches((prev) => prev.filter((s) => s !== term));
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
            <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
                </TouchableOpacity>
                <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
                    <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
                    <TextInput
                        ref={inputRef}
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Search products, tags..."
                        placeholderTextColor={colors.textSecondary}
                        value={searchText}
                        onChangeText={setSearchText}
                        onSubmitEditing={handleSubmit}
                        returnKeyType="search"
                    />
                    {searchText.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchText("")}>
                            <MaterialCommunityIcons name="close-circle" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <View style={styles.categoryGrid}>
                {CATEGORIES.map((c) => (
                    <TouchableOpacity
                        key={c.id}
                        style={[
                            styles.categoryOption,
                            {
                                backgroundColor:
                                    selectedCategory === c.id
                                        ? colors.primary
                                        : colors.surface,
                            },
                        ]}
                        onPress={() => setSelectedCategory(selectedCategory === c.id ? null : c.id)}
                    >
                        <MaterialCommunityIcons
                            name={c.icon as any}
                            size={18}
                            color={selectedCategory === c.id ? "#FFFFFF" : colors.text}
                        />
                        <Text
                            style={[
                                styles.categoryLabel,
                                { color: selectedCategory === c.id ? "#FFFFFF" : colors.text },
                            ]}
                        >
                            {c.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {catalogLoading ? (
                <View style={styles.centered}>
                    <ActivityIndicator color={colors.primary} />
                </View>
            ) : catalogError ? (
                <View style={styles.centered}>
                    <Text style={styles.emptyText}>Couldn't load products.</Text>
                    <TouchableOpacity onPress={loadCatalog} style={{ marginTop: 10 }}>
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : isBrowsing ? (
                <ScrollView contentContainerStyle={styles.browseContent}>
                    {recentSearches.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeaderRow}>
                                <Text style={styles.sectionLabel}>Recent searches</Text>
                                <TouchableOpacity onPress={() => setRecentSearches([])}>
                                    <Text style={styles.clearAllText}>Clear all</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.recentRow}>
                                {recentSearches.map((term) => (
                                    <TouchableOpacity
                                        key={term}
                                        style={[
                                            styles.recentChip,
                                            {
                                                backgroundColor: colors.surface,
                                                borderColor: colors.border || '#E7E4EF',
                                            },
                                        ]}
                                        onPress={() => applyRecentSearch(term)}
                                    >
                                        <Text style={[styles.recentChipText, { color: colors.text }]}>{term}</Text>
                                        <TouchableOpacity
                                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                            onPress={() => removeRecentSearch(term)}
                                        >
                                            <MaterialCommunityIcons name="close" size={13} color={colors.textSecondary} />
                                        </TouchableOpacity>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {trending.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Trending now</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.trendingRow}
                            >
                                {trending.map((item, i) => <ProductCard product={item} cardWidth={140} key={i}/>)}
                            </ScrollView>
                        </View>
                    )}
                </ScrollView>
            ) : (
                <>
                    <View style={styles.sortRow}>
                        <Text style={styles.resultsCount}>
                            {results.length} {results.length === 1 ? "result" : "results"}
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {SORT_OPTIONS.map((opt) => (
                                <TouchableOpacity
                                    key={opt.id}
                                    style={[
                                        styles.sortChip,
                                        {
                                            backgroundColor:
                                                sortBy === opt.id
                                                    ? colors.text
                                                    : colors.surface,
                                        },
                                    ]}
                                    onPress={() => setSortBy(opt.id)}
                                >
                                    <Text
                                        style={[
                                            styles.sortChipText,
                                            { color: sortBy === opt.id ? colors.background : colors.text },
                                        ]}
                                    >
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {results.length === 0 ? (
                        <View style={styles.centered}>
                            <MaterialCommunityIcons name="magnify-close" size={48} color={colors.textSecondary} />
                            <Text style={styles.emptyText}>No products match your search.</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={results}
                            keyExtractor={(item) => item.productId}
                            numColumns={2}
                            contentContainerStyle={styles.gridContent}
                            columnWrapperStyle={{ gap: GRID_GAP }}
                            onScrollBeginDrag={() => Keyboard.dismiss()}
                            renderItem={({ item }) => <ProductCard product={item} cardWidth={CARD_WIDTH} />}
                        />
                    )}
                </>
            )}
        </SafeAreaView>
    );
}

// ─── Style factory ──────────────────────────────────────────────────────
const createStyles = (colors: any) =>
    StyleSheet.create({
        container: {
            flex: 1,
        },
        centered: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
        },
        header: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 16,
            paddingVertical: 10,
        },
        backButton: {
            width: 36,
            height: 36,
            alignItems: "center",
            justifyContent: "center",
        },
        searchBar: {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 10,
        },
        searchInput: {
            flex: 1,
            fontSize: 14,
        },
        categoryGrid: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            padding: 8,
        },
        categoryOption: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 20,
        },
        categoryLabel: {
            fontSize: 12,
        },
        browseContent: {
            padding: 16,
            paddingTop: 4,
        },
        section: {
            marginBottom: 24,
        },
        sectionHeaderRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
        },
        sectionLabel: {
            fontSize: 14,
            fontWeight: "600",
            color: colors.text,
            marginBottom: 10,
        },
        clearAllText: {
            fontSize: 12,
            color: colors.primary,
            fontWeight: "500",
        },
        recentRow: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
        },
        recentChip: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 10,
            paddingVertical: 7,
            borderRadius: 14,
            borderWidth: 0.5,
        },
        recentChipText: {
            fontSize: 12,
        },
        trendingRow: {
            gap: 12,
        },
        sortRow: {
            paddingHorizontal: 16,
            paddingBottom: 10,
            gap: 8,
        },
        resultsCount: {
            fontSize: 12,
            color: colors.textSecondary,
            marginBottom: 8,
        },
        sortChip: {
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 14,
            marginRight: 8,
        },
        sortChipText: {
            fontSize: 12,
        },
        gridContent: {
            paddingHorizontal: 16,
            paddingBottom: 24,
            gap: GRID_GAP,
        },
        emptyText: {
            fontSize: 13,
            color: colors.textSecondary,
            marginTop: 8,
            textAlign: "center",
        },
        retryText: {
            fontSize: 13,
            color: colors.primary,
            fontWeight: "500",
        },
    });