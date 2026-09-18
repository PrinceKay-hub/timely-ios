import React, { useMemo } from "react";
import { ScrollView, TouchableOpacity, Text, StyleSheet } from "react-native";
import { CATEGORIES, ProductCategory } from "@/types/product";
import { useTheme } from "@/providers/ThemeProvider";

interface Props {
  selected: ProductCategory | "all";
  onSelect: (category: ProductCategory | "all") => void;
}

export function CategoryChips({ selected, onSelect }: Props) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Nested so it has access to the dynamic `styles`
  const Chip = ({
    label,
    active,
    onPress,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: active ? colors.primary : colors.surface },
      ]}
    >
      <Text
        style={[
          styles.chipLabel,
          { color: active ? "#FFFFFF" : colors.text },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      <Chip label="All" active={selected === "all"} onPress={() => onSelect("all")} />
      {CATEGORIES.map((c) => (
        <Chip
          key={c.id}
          label={c.label}
          active={selected === c.id}
          onPress={() => onSelect(c.id)}
        />
      ))}
    </ScrollView>
  );
}

// ─── Style factory ──────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    row: {
      paddingHorizontal: 14,
      gap: 8,
      paddingBottom: 4,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      marginRight: 8,
    },
    chipLabel: {
      fontSize: 13,
      fontWeight: "500",
    },
  });