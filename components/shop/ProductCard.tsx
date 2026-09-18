import React, { useMemo } from "react";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Product } from "@/types/product";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@/providers/ThemeProvider";

interface Props {
  product: Product;
  cardWidth: number;
}

function goToProduct(productId: string) {
  router.push({ pathname: "/shop/[productId]", params: { productId } });
}

export function ProductCard({ product, cardWidth }: Props) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const locationLabel = product.location?.district ?? null;

  return (
    <TouchableOpacity
      key={product.productId}
      style={[styles.card, { width: cardWidth }]}
      onPress={() => goToProduct(product.productId)}
      activeOpacity={0.85}
    >
      <View style={styles.cardImageWrap}>
        <Image
          source={{ uri: product.thumbnailUrl || product.images[0] }}
          style={[styles.cardImage, { backgroundColor: colors.surface }]}
          contentFit="cover"
        />
        {product.isDelivery && (
          <View style={styles.deliveryBadge}>
            <MaterialCommunityIcons name="truck-outline" size={11} color="#FFFFFF" />
          </View>
        )}
      </View>
      <Text style={styles.cardName} numberOfLines={1}>
        {product.name}
      </Text>
      <Text style={[styles.cardPrice, { color: colors.primary }]}>
        {product.currency} {product.price.toLocaleString()}
      </Text>
      {locationLabel && (
        <View style={styles.cardMetaRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={11} color={colors.textSecondary} />
          <Text style={styles.cardMetaText} numberOfLines={1}>
            {locationLabel}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Style factory ──────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    card: {
      marginBottom: 4,
    },
    cardImageWrap: {
      position: "relative",
      borderRadius: 12,
      overflow: "hidden",
      marginBottom: 6,
    },
    cardImage: {
      width: "100%",
      aspectRatio: 1,
    },
    cardName: {
      fontSize: 12,
      fontWeight: "500",
      color: colors.text,
    },
    cardPrice: {
      fontSize: 13,
      fontWeight: "700",
      marginTop: 2,
    },
    cardMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      marginTop: 3,
    },
    cardMetaText: {
      fontSize: 10,
      color: colors.textSecondary,
      flexShrink: 1,
    },
    deliveryBadge: {
      position: "absolute",
      bottom: 6,
      left: 6,
      backgroundColor: "rgba(46,158,91,0.9)",
      borderRadius: 8,
      padding: 4,
    },
  });