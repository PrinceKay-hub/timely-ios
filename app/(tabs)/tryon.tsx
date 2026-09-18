import React, { useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 16;
const H_PADDING = 24;

// ─── Menu data (accent colors are theme‑aware via mapping) ────────────
interface MenuItem {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;       // will be set dynamically
  accentSoft: string;   // will be set dynamically
  route: string;
}

// ─── Main Component ───────────────────────────────────────────────────────
export default function TryOn() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = theme.colors;

  // Build dynamic styles and menu items using the theme.
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Accent colors derived from theme (with fallbacks to brand colours)
  const berry = colors.primary || '#A6295E';
  const berrySoft = colors.primaryLight || '#F6E9EE';
  const gold = colors.secondary || '#B8860B';
  const goldSoft = colors.secondaryLight || '#F7F0DE';

  const MENU_ITEMS: MenuItem[] = [
    {
      key: 'tryOn',
      title: 'Virtual Try-On',
      subtitle: 'See yourself in any style',
      icon: 'color-wand-outline',
      accent: berry,
      accentSoft: berrySoft,
      route: '/hairstyles/virtualtry',
    },
    {
      key: 'styles',
      title: 'Hairstyles',
      subtitle: 'Browse 1,000+ styles',
      icon: 'cut-outline',
      accent: gold,
      accentSoft: goldSoft,
      route: '/hairstyles/feedscreen',
    },
  ];

  // ─── MenuCard (nested to capture styles & colors) ──────────────────────
  const MenuCard: React.FC<{ item: MenuItem; tall: boolean; onPress: () => void }> = ({
    item,
    tall,
    onPress,
  }) => {
    const scale = useRef(new Animated.Value(1)).current;

    const pressIn = () =>
      Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
    const pressOut = () =>
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 6 }).start();

    return (
      <Animated.View style={[styles.cardWrapper, { transform: [{ scale }] }]}>
        <Pressable
          onPress={onPress}
          onPressIn={pressIn}
          onPressOut={pressOut}
          style={[styles.card, tall ? styles.cardTall : styles.cardSquare]}
          android_ripple={{ color: item.accentSoft }}
        >
          <View style={[styles.iconRing, { borderColor: item.accent, backgroundColor: item.accentSoft }]}>
            <Ionicons name={item.icon} size={26} color={item.accent} />
          </View>

          <View style={styles.cardText}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
          </View>

          <View style={styles.cardFooter}>
            <View style={[styles.accentDot, { backgroundColor: item.accent }]} />
            <Ionicons name="arrow-forward" size={16} color={item.accent} />
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  // ─── Adaptive grid ──────────────────────────────────────────────────────
  const MenuGrid: React.FC<{ items: MenuItem[]; onSelect: (route: string) => void }> = ({
    items,
    onSelect,
  }) => {
    const tall = items.length <= 2;
    return (
      <View style={styles.grid}>
        {items.map((item) => (
          <MenuCard key={item.key} item={item} tall={tall} onPress={() => onSelect(item.route)} />
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.appName, { color: colors.text }]}>Try-On</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>Find your perfect look today</Text>
          <View style={styles.signatureRule}>
            <View style={[styles.ruleSegment, { backgroundColor: berry }]} />
            <View style={[styles.ruleSegment, { backgroundColor: gold }]} />
          </View>
        </View>

        {/* Grid */}
        <View style={styles.gridSection}>
          <MenuGrid items={MENU_ITEMS} onSelect={(route) => router.push(route as any)} />
        </View>

        {/* Footer */}
        <Text style={[styles.footer, { color: colors.textSecondary }]}>Find your perfect look today</Text>
      </View>
    </SafeAreaView>
  );
}

// ─── Style factory ──────────────────────────────────────────────────────
const createStyles = (colors: any) => {
  const CARD_WIDTH = (SCREEN_WIDTH - H_PADDING * 2 - GRID_GAP) / 2;
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      flex: 1,
      paddingHorizontal: H_PADDING,
      paddingVertical: 32,
      justifyContent: 'space-between',
    },
    header: {
      alignItems: 'center',
      marginTop: 12,
    },
    appName: {
      fontSize: 40,
      fontWeight: '800',
      letterSpacing: 1.5,
    },
    tagline: {
      fontSize: 15,
      marginTop: 4,
      letterSpacing: 0.5,
    },
    signatureRule: {
      flexDirection: 'row',
      marginTop: 14,
      width: 32,
      height: 3,
      borderRadius: 2,
      overflow: 'hidden',
    },
    ruleSegment: {
      flex: 1,
    },
    gridSection: {
      flex: 1,
      marginTop: 32,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: GRID_GAP,
      justifyContent: 'center',
    },
    cardWrapper: {
      width: CARD_WIDTH,
    },
    card: {
      width: '100%',
      backgroundColor: colors.card || colors.background,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border || '#EFEAE3',
      padding: 18,
      justifyContent: 'space-between',
      shadowColor: colors.shadow || '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.05,
      shadowRadius: 14,
      elevation: 3,
    },
    cardTall: {
      height: CARD_WIDTH * 1.35,
    },
    cardSquare: {
      height: CARD_WIDTH,
    },
    iconRing: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardText: {
      marginTop: 14,
    },
    cardTitle: {
      fontSize: 17,
      fontWeight: '700',
      letterSpacing: 0.1,
    },
    cardSubtitle: {
      fontSize: 12.5,
      marginTop: 4,
      lineHeight: 17,
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
    },
    accentDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    footer: {
      textAlign: 'center',
      fontSize: 13,
      letterSpacing: 0.3,
    },
  });
};