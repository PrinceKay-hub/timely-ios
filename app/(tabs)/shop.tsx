import React, { useMemo, useState } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Dimensions,
    StatusBar,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { CategoryChips } from "@/components/shop/CategoryChips";
import { ProductCard } from "@/components/shop/ProductCard";
import { SellFAB } from "@/components/shop/SellFAB";
import { useProducts } from "../../hooks/useProducts";
import { ProductCategory } from "../../types/product";
import { useTheme } from "@/providers/ThemeProvider";

const { width } = Dimensions.get("window");
const GRID_GAP = 12;
const CARD_WIDTH = (width - 16 * 2 - GRID_GAP) / 2;

export default function ShopScreen() {
    const { theme } = useTheme();
    const colors = theme.colors;
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [category, setCategory] = useState<ProductCategory | "all">("all");
    const { products, loading, refreshing, loadingMore, refresh, loadMore } =
        useProducts(category);

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.gray100, }]}>
            <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />

            <View style={[styles.header, { backgroundColor: colors.primary }]}>
                <View style={styles.headerIcons}>
                    <Text style={styles.headerTitle}>Shop</Text>

                    <TouchableOpacity
                        style={styles.searchBtn}
                        onPress={() => router.push("/shop/search")}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.searchIcon}>🔍</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.categoryRow}>
                <CategoryChips selected={category} onSelect={setCategory} />
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator color={colors.primary} />
                </View>
            ) : products.length === 0 ? (
                <View style={styles.centered}>
                    <MaterialCommunityIcons
                        name="shopping-outline"
                        size={40}
                        color={colors.textSecondary}
                    />
                    <Text style={styles.emptyTitle}>No products yet</Text>
                    <Text style={styles.emptyBody}>
                        Be the first to list something in this category.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={products}
                    keyExtractor={(item) => item.productId}
                    numColumns={2}
                    contentContainerStyle={styles.grid}
                    columnWrapperStyle={styles.gridRow}
                    renderItem={({ item }) => <ProductCard product={item} cardWidth={CARD_WIDTH} />}
                    refreshing={refreshing}
                    onRefresh={refresh}
                    onEndReachedThreshold={0.4}
                    onEndReached={loadMore}
                    ListFooterComponent={
                        loadingMore ? (
                            <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} />
                        ) : null
                    }
                />
            )}

            <SellFAB />
        </View>
    );
}

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
    StyleSheet.create({
        container: {
            flex: 1,
        },
        header: {
            paddingTop: 50,
            paddingBottom: 20,
            paddingHorizontal: 16,
            borderBottomLeftRadius: 30,
            borderBottomRightRadius: 30,
        },
        headerTitle: {
            fontSize: 25,
            fontWeight: "600",
            color: "#FFFFFF",
        },
        headerIcons: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: 'space-between',
        },
        categoryRow: {
            paddingTop: 12,
            paddingBottom: 4,
        },
        grid: {
            padding: 14,
            paddingBottom: 90,
        },
        gridRow: {
            gap: 10,
            marginBottom: 10,
        },
        centered: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 40,
        },
        emptyTitle: {
            fontSize: 15,
            fontWeight: "500",
            color: colors.text,
            marginTop: 12,
        },
        emptyBody: {
            fontSize: 13,
            color: colors.textSecondary,
            textAlign: "center",
            marginTop: 4,
        },
        searchBtn: {
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: 'rgba(255,255,255,0.2)',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 10
        },
        searchIcon: {
            fontSize: 18,
        },
    });