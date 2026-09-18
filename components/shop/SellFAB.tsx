import React, { useMemo } from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "@/providers/ThemeProvider";

export function SellFAB() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <TouchableOpacity
      style={styles.fab}
      activeOpacity={0.85}
      onPress={() => router.push("/shop/sell")}
      accessibilityLabel="Sell a product"
    >
      <MaterialCommunityIcons name="plus" size={26} color={colors.background} />
    </TouchableOpacity>
  );
}

// ─── Style factory ──────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    fab: {
      position: "absolute",
      right: 16,
      bottom: 100,
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.text, // neutral high-contrast surface in both modes
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.shadow || "#000",
      shadowOpacity: 0.15,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4,
    },
  });