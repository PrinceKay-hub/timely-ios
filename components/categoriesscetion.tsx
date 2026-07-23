// components/home/CategoriesSection.tsx
import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useHomeStore } from '@/stores/home';
import { useTheme } from '@/providers/ThemeProvider';
import { Image } from 'expo-image';

interface CategoriesSectionProps {
  user: Record<string, any>;
}

export const CategoriesSection: React.FC<CategoriesSectionProps> = () => {
  const router = useRouter();
  const { categories, categoriesError } = useHomeStore();
  const { theme } = useTheme();
  const colors = theme.colors;

  // Create dynamic styles based on the current theme
  const styles = useMemo(() => createStyles(colors), [colors]);

  // ─── Category icon component (nested to capture styles & colors) ──
  const CategoryIcon: React.FC<{ icon: string; label: string }> = ({ icon, label }) => {
    const [imgError, setImgError] = React.useState(false);

    return (
      <View style={styles.categoryItem}>
        <View style={styles.iconBox}>
          {!imgError && icon ? (
            <Image
              source={{ uri: icon }}
              style={styles.iconImage}
              contentFit="contain"
              transition={200}
              placeholder={colors.surface || '#f3f4f6'}
              onError={() => setImgError(true)}
            />
          ) : (
            <Text style={styles.iconFallback}>🖼</Text>
          )}
        </View>
        <Text style={styles.categoryLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
    );
  };

  // ─── Error state ────────────────────────────────────────────────────
  if (categoriesError) {
    return (
      <View style={styles.errorWrap}>
        <Text style={styles.errorText}>
          Failed to load categories: {categoriesError}
        </Text>
      </View>
    );
  }

  // ─── Empty state ────────────────────────────────────────────────────
  if (!categories || categories.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map((category: Record<string, any>, index: number) => (
          <TouchableOpacity
            key={index}
            onPress={() =>
              router.push({
                pathname: '/search/categoryresults',
                params: {
                  category: category.name,
                },
              })
            }
            activeOpacity={0.75}
          >
            <CategoryIcon icon={category.icon} label={category.name} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

// ─── Style factory ──────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    wrapper: {
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    scrollContent: {
      paddingRight: 8,
    },
    categoryItem: {
      alignItems: 'center',
      marginHorizontal: 6,
      width: 68,
    },
    iconBox: {
      width: 60,
      height: 60,
      borderRadius: 15,
      backgroundColor: colors.card || colors.surface || '#fff',
      borderWidth: 1,
      borderColor: colors.border || '#e5e7eb',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 8,
      shadowColor: colors.shadow || '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    iconImage: {
      width: 36,
      height: 36,
    },
    iconFallback: {
      fontSize: 24,
      color: colors.textSecondary,
    },
    categoryLabel: {
      marginTop: 8,
      fontSize: 11,
      textAlign: 'center',
      color: colors.textSecondary || '#374151',
    },
    errorWrap: {
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    errorText: {
      color: colors.error || '#ef4444',
      fontSize: 13,
      textAlign: 'center',
    },
  });