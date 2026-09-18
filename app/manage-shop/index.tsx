import React, { useCallback, useEffect, useMemo, useState } from "react";
import { db } from "@/firebase";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Modal,
    Alert,
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
    orderBy,
    query,
    where,
    updateDoc,
    doc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { CATEGORIES, Product, ProductStatus } from "../../types/product";
import { deleteProduct } from "@/services/shopApi";
import { useTheme } from "@/providers/ThemeProvider";

// ─── Helpers (unchanged) ─────────────────────────────────────────────────
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

function timeAgo(ms: number): string {
    const seconds = Math.floor((Date.now() - ms) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
}

// ─── Main component ──────────────────────────────────────────────────────
export default function MyListingsScreen() {
    const uid = getAuth().currentUser?.uid ?? null;
    const { theme } = useTheme();
    const colors = theme.colors;
    const isDark = theme.dark;

    const styles = useMemo(() => createStyles(colors), [colors]);

    const [listings, setListings] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(false);
    const [actionSheetProduct, setActionSheetProduct] = useState<Product | null>(null);
    const [mutatingId, setMutatingId] = useState<string | null>(null);

    const fetchListings = useCallback(async () => {
        if (!uid) {
            setLoading(false);
            return;
        }
        setError(false);
        try {
            const snap = await getDocs(
                query(
                    collection(getFirestore(), "products"),
                    where("sellerId", "==", uid),
                    orderBy("createdAt", "desc")
                )
            );
            setListings(snap.docs.map((d) => d.data() as Product));
        } catch (err) {
            console.error("Failed to load your listings:", err);
            setError(true);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [uid]);

    useEffect(() => {
        fetchListings();
    }, [fetchListings]);

    function onRefresh() {
        setRefreshing(true);
        fetchListings();
    }

    function openActions(product: Product) {
        setActionSheetProduct(product);
    }

    function closeActions() {
        setActionSheetProduct(null);
    }

    function handleEdit(product: Product) {
        closeActions();
        router.push({
            pathname: "/shop/sell",
            params: { productId: product.productId },
        });
    }

    async function handleToggleStatus(product: Product) {
        closeActions();
        const nextStatus: ProductStatus = product.status === "offline" ? "active" : "offline";
        setMutatingId(product.productId);
        try {
            const userDocRef = doc(db, "products", product.productId);
            await updateDoc(userDocRef, { status: nextStatus });
            fetchListings();
        } catch (err) {
            console.error("Failed to update listing status:", err);
            Alert.alert("Something went wrong", "Couldn't update this listing. Try again.");
        } finally {
            setMutatingId(null);
        }
    }

    function handleDelete(product: Product) {
        closeActions();
        Alert.alert(
            "Delete this listing?",
            `"${product.name}" will be removed permanently.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setMutatingId(product.productId);
                        try {
                            await deleteProduct(product.productId);
                            setListings((prev) => prev.filter((p) => p.productId !== product.productId));
                        } catch (err) {
                            console.error("Failed to delete listing:", err);
                            Alert.alert("Something went wrong", "Couldn't delete this listing. Try again.");
                        } finally {
                            setMutatingId(null);
                        }
                    },
                },
            ]
        );
    }

    const activeCount = listings.filter((p) => p.status === "active").length;
    const offlineCount = listings.filter((p) => p.status === "offline").length;
    const pendingCount = listings.filter((p) => p.status === "pending").length;
    const totalViews = listings.reduce((sum, p) => sum + p.viewCount, 0);

    function renderStatusBadge(status: ProductStatus) {
        if (status === "offline") {
            return (
                <View style={[styles.statusBadge, { backgroundColor: `${colors.error}26` }]}>
                    <Text style={[styles.statusBadgeText, { color: colors.error }]}>Offline</Text>
                </View>
            );
        }
        if (status === "active") {
            return (
                <View style={[styles.statusBadge, { backgroundColor: `${colors.success}1f` }]}>
                    <Text style={[styles.statusBadgeText, { color: colors.success || "#2E9E5B" }]}>Live</Text>
                </View>
            );
        }
        if (status === "pending") {
            return (
                <View style={[styles.statusBadge, { backgroundColor: "#d6c36f" }]}>
                    <Text style={[styles.statusBadgeText, { color:  "#f9f2e3" }]}>Pending</Text>
                </View>
            );
        }
        return (
            <View style={[styles.statusBadge, { backgroundColor: colors.surface }]}>
                <Text style={[styles.statusBadgeText, { color: colors.text }]}>{status}</Text>
            </View>
        );
    }

    function renderItem({ item }: { item: Product }) {
        const categoryLabel = CATEGORIES.find((c) => c.id === item.category)?.label ?? item.category;
        const isMutating = mutatingId === item.productId;

        return (
            <View style={[styles.card, { backgroundColor: colors.card || colors.background, borderColor: colors.border }]}>
                <Image
                    source={{ uri: item.thumbnailUrl || item.images[0] }}
                    style={[styles.cardImage, { backgroundColor: colors.surface }]}
                    contentFit="cover"
                />
                <View style={styles.cardBody}>
                    <View style={styles.cardTopRow}>
                        <Text style={styles.cardName} numberOfLines={1}>
                            {item.name}
                        </Text>
                        <TouchableOpacity
                            style={styles.menuButton}
                            onPress={() => openActions(item)}
                            disabled={isMutating}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            {isMutating ? (
                                <ActivityIndicator size="small" color={colors.textSecondary} />
                            ) : (
                                <MaterialCommunityIcons name="dots-vertical" size={18} color={colors.textSecondary} />
                            )}
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.cardPrice, { color: colors.primary }]}>
                        {item.currency} {item.price.toLocaleString()}
                    </Text>

                    <View style={styles.cardMetaRow}>
                        {renderStatusBadge(item.status)}
                        <Text style={[styles.cardMetaDot, { color: colors.textSecondary }]}>·</Text>
                        <Text style={styles.cardMetaText}>{categoryLabel}</Text>
                    </View>

                    <View style={styles.cardStatsRow}>
                        <View style={styles.cardStatItem}>
                            <MaterialCommunityIcons name="eye-outline" size={12} color={colors.textSecondary} />
                            <Text style={styles.cardStatText}>{item.viewCount}</Text>
                        </View>
                        <Text style={styles.cardStatText}>{timeAgo(toMillis(item.createdAt))}</Text>
                    </View>
                </View>
            </View>
        );
    }

    if (!uid) {
        return (
            <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
                <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
                <MaterialCommunityIcons name="account-lock-outline" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyText}>Sign in to manage your listings.</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>My listings</Text>
                <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.primary }]}
                    onPress={() => router.push("/shop/sell")}
                >
                    <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            {!loading && listings.length > 0 && (
                <View style={styles.statsRow}>
                    <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.statValue, { color: colors.text }]}>{activeCount}</Text>
                        <Text style={styles.statLabel}>Live</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.statValue, { color: colors.text }]}>{offlineCount}</Text>
                        <Text style={styles.statLabel}>Offline</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.statValue, { color: colors.text }]}>{pendingCount}</Text>
                        <Text style={styles.statLabel}>Pending</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.statValue, { color: colors.text }]}>{totalViews}</Text>
                        <Text style={styles.statLabel}>Total views</Text>
                    </View>
                </View>
            )}

            {loading ? (
                <View style={styles.centeredFlex}>
                    <ActivityIndicator color={colors.primary} />
                </View>
            ) : error ? (
                <View style={styles.centeredFlex}>
                    <Text style={styles.emptyText}>Couldn't load your listings.</Text>
                    <TouchableOpacity onPress={fetchListings} style={{ marginTop: 10 }}>
                        <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : listings.length === 0 ? (
                <View style={styles.centeredFlex}>
                    <MaterialCommunityIcons name="storefront-outline" size={48} color={colors.textSecondary} />
                    <Text style={styles.emptyText}>You haven't listed anything yet.</Text>
                    <TouchableOpacity
                        style={[styles.emptyCta, { backgroundColor: colors.primary }]}
                        onPress={() => router.push("/shop/sell")}
                    >
                        <Text style={styles.emptyCtaText}>Sell your first product</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={listings}
                    keyExtractor={(item) => item.productId}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                    }
                />
            )}

            <Modal
                visible={!!actionSheetProduct}
                transparent
                animationType="slide"
                onRequestClose={closeActions}
            >
                <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={closeActions}>
                    <TouchableOpacity
                        activeOpacity={1}
                        style={[styles.sheet, { backgroundColor: colors.card || colors.background }]}
                    >
                        <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
                        {actionSheetProduct && (
                            <Text style={styles.sheetTitle} numberOfLines={1}>
                                {actionSheetProduct.name}
                            </Text>
                        )}

                        <TouchableOpacity
                            style={[styles.sheetOption, { borderTopColor: colors.border }]}
                            onPress={() => actionSheetProduct && handleEdit(actionSheetProduct)}
                        >
                            <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.text} />
                            <Text style={[styles.sheetOptionText, { color: colors.text }]}>Edit listing</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.sheetOption, { borderTopColor: colors.border }]}
                            onPress={() => actionSheetProduct && handleToggleStatus(actionSheetProduct)}
                        >
                            <MaterialCommunityIcons
                                name={
                                    actionSheetProduct?.status === "offline"
                                        ? "refresh"
                                        : "check-circle-outline"
                                }
                                size={20}
                                color={colors.text}
                            />
                            <Text style={[styles.sheetOptionText, { color: colors.text }]}>
                                {actionSheetProduct?.status === "offline"
                                    ? "Relist as available"
                                    : "Mark as offline"}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.sheetOption, { borderTopColor: colors.border }]}
                            onPress={() => actionSheetProduct && handleDelete(actionSheetProduct)}
                        >
                            <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.error || "#D64545"} />
                            <Text style={[styles.sheetOptionText, { color: colors.error || "#D64545" }]}>
                                Delete listing
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.sheetCancel, { backgroundColor: colors.surface }]}
                            onPress={closeActions}
                        >
                            <Text style={[styles.sheetCancelText, { color: colors.text }]}>Cancel</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
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
        centeredFlex: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
        },
        header: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 0.5,
        },
        backButton: {
            width: 36,
            height: 36,
            alignItems: "center",
            justifyContent: "center",
        },
        headerTitle: {
            fontSize: 16,
            fontWeight: "600",
        },
        addButton: {
            width: 32,
            height: 32,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
        },
        statsRow: {
            flexDirection: "row",
            paddingHorizontal: 16,
            paddingVertical: 14,
            gap: 10,
        },
        statBox: {
            flex: 1,
            borderRadius: 14,
            paddingVertical: 12,
            alignItems: "center",
        },
        statValue: {
            fontSize: 17,
            fontWeight: "700",
        },
        statLabel: {
            fontSize: 11,
            color: colors.textSecondary,
            marginTop: 2,
        },
        listContent: {
            padding: 16,
            paddingTop: 4,
            gap: 12,
        },
        card: {
            flexDirection: "row",
            gap: 12,
            borderRadius: 14,
            borderWidth: 0.5,
            padding: 10,
        },
        cardImage: {
            width: 78,
            height: 78,
            borderRadius: 10,
        },
        cardBody: {
            flex: 1,
            justifyContent: "center",
        },
        cardTopRow: {
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 8,
        },
        cardName: {
            flex: 1,
            fontSize: 14,
            fontWeight: "600",
            color: colors.text,
        },
        menuButton: {
            padding: 2,
        },
        cardPrice: {
            fontSize: 14,
            fontWeight: "700",
            marginTop: 2,
        },
        cardMetaRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginTop: 6,
        },
        cardMetaDot: {
            fontSize: 11,
        },
        cardMetaText: {
            fontSize: 11,
            color: colors.textSecondary,
        },
        statusBadge: {
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 10,
        },
        statusBadgeText: {
            fontSize: 10,
            fontWeight: "600",
        },
        cardStatsRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            marginTop: 6,
        },
        cardStatItem: {
            flexDirection: "row",
            alignItems: "center",
            gap: 3,
        },
        cardStatText: {
            fontSize: 11,
            color: colors.textSecondary,
        },
        emptyText: {
            fontSize: 13,
            color: colors.textSecondary,
            marginTop: 10,
            textAlign: "center",
        },
        emptyCta: {
            marginTop: 16,
            paddingHorizontal: 18,
            paddingVertical: 10,
            borderRadius: 12,
        },
        emptyCtaText: {
            color: "#FFFFFF",
            fontSize: 13,
            fontWeight: "600",
        },
        retryText: {
            fontSize: 13,
            fontWeight: "500",
        },
        sheetOverlay: {
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.35)",
            justifyContent: "flex-end",
        },
        sheet: {
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: 28,
        },
        sheetHandle: {
            width: 36,
            height: 4,
            borderRadius: 2,
            alignSelf: "center",
            marginBottom: 14,
        },
        sheetTitle: {
            fontSize: 13,
            color: colors.textSecondary,
            marginBottom: 8,
        },
        sheetOption: {
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            paddingVertical: 14,
            borderTopWidth: 0.5,
        },
        sheetOptionText: {
            fontSize: 15,
        },
        sheetCancel: {
            marginTop: 8,
            paddingVertical: 14,
            alignItems: "center",
            borderRadius: 12,
        },
        sheetCancelText: {
            fontSize: 15,
            fontWeight: "600",
        },
    });