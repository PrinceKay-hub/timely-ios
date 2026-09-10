// components/HorizontalServiceSection.tsx
import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import type { Service } from '@/data/repositories/serviceRepository';

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

const CompactCard: React.FC<{ item: Service; styles: any; colors: any }> = ({
  item,
  styles,
  colors,
}) => {
  const router = useRouter();
  const onPress = useCallback(() => router.push(`/service/${item.id}`), [item.id]);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.image, { backgroundColor: colors.surface || '#f3f4f6' }]}>
        {item.images?.[0] ? (
          <Image
            source={{ uri: item.images[0] }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
            placeholder={colors.surface || '#f3f4f6'}
          />
        ) : (
          <View
            style={[
              StyleSheet.absoluteFill,
              { alignItems: 'center', justifyContent: 'center' },
            ]}
          >
            <Text style={{ fontSize: 22 }}>🖼</Text>
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name ?? ''}
        </Text>
        <View style={styles.row}>
          <Text style={{ fontSize: 12 }}>⭐</Text>
          <Text style={styles.ratingText}>{(item.rating ?? 0).toFixed(1)}</Text>
        </View>
        {typeof item.distanceKm === 'number' && (
          <View style={styles.row}>
            <Text style={{ fontSize: 10, color: colors.textSecondary }}>📍</Text>
            <Text style={[styles.distanceText, { color: colors.textSecondary }]}>
              {formatDistance(item.distanceKm)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

interface HorizontalServiceSectionProps {
  title: string;
  services: Service[];
  isLoading: boolean;
}

export const HorizontalServiceSection: React.FC<HorizontalServiceSectionProps> = ({
  title,
  services,
  isLoading,
}) => {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = getStyles(theme);

  if (isLoading) {
    return (
      <View style={styles.wrap}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  // Fails/empties quietly — optional section, don't clutter the home
  // screen with an error for something non-essential.
  if (!services || services.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <FlatList
        data={services}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listPad}
        renderItem={({ item }) => (
          <CompactCard item={item} styles={styles} colors={colors} />
        )}
      />
    </View>
  );
};

const getStyles = (theme: any) => {
  const { colors } = theme;
  return StyleSheet.create({
    wrap: { marginBottom: 24 },
    title: {
      fontSize: 14,
      fontWeight: '700',
      paddingHorizontal: 20,
      marginBottom: 10,
    },
    loadingBox: { height: 196, alignItems: 'center', justifyContent: 'center' },
    listPad: { paddingHorizontal: 20 },
    card: {
      width: 150,
      marginRight: 12,
      backgroundColor: colors.card || colors.background,
      borderRadius: 15,
      overflow: 'hidden',
      shadowColor: colors.shadow || '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    image: { height: 110, width: 150 },
    body: { padding: 8, gap: 2 },
    name: { fontWeight: '700', fontSize: 11, color: colors.text },
    row: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
    ratingText: { fontSize: 12, fontWeight: '700', color: colors.text },
    distanceText: { fontSize: 11 },
  });
};