import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '@/providers/ThemeProvider';

const TRY_ON_ROUTE = 'tryon';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  home: 'home',
  favorites: 'heart',
  tryon: 'sparkles',
  appointments: 'calendar',
  profile: 'person',
};

const LABELS: Record<string, string> = {
  home: 'Home',
  favorites: 'Favorites',
  tryon: 'Try on',
  appointments: 'Appointments',
  profile: 'Profile',
};

export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{ 
        headerShown: false,
      }}
      tabBar={(props) => <ModernTabBar {...props} />}
    >
      <Tabs.Screen name="home" options={{ title: LABELS.home }} />
      <Tabs.Screen name="favorites" options={{ title: LABELS.favorites }} />
      <Tabs.Screen name="tryon" options={{ title: LABELS.tryon }} />
      <Tabs.Screen
        name="appointments"
        options={{ title: LABELS.appointments }}
      />
      <Tabs.Screen name="profile" options={{ title: LABELS.profile }} />
    </Tabs>
  );
}

function ModernTabBar({ state, navigation }: BottomTabBarProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View
        style={[
          styles.bar,
          {
            backgroundColor: theme.colors.background,
            shadowColor: '#000',
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const isTryOn = route.name === TRY_ON_ROUTE;
          const focused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          if (isTryOn) {
            // Reserve the center gap; the floating button renders separately.
            return <View key={route.key} style={styles.spacer} />;
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.item}
              hitSlop={8}
            >
              <Ionicons
                name={ICONS[route.name]}
                size={22}
                color={focused ? theme.colors.primary : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.label,
                  {
                    color: focused
                      ? theme.colors.primary
                      : theme.colors.textSecondary,
                    fontWeight: focused ? '700' : '500',
                  },
                ]}
              >
                {LABELS[route.name]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Floating "Try on" button, rendered above the bar to stand out */}
      <TryOnButton
        focused={state.routes[state.index].name === TRY_ON_ROUTE}
        color={theme.colors.primary}
        onPress={() => {
          const route = state.routes.find((r) => r.name === TRY_ON_ROUTE);
          if (route) navigation.navigate(route.name);
        }}
      />
    </View>
  );
}

function TryOnButton({
  focused,
  color,
  onPress,
}: {
  focused: boolean;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tryOnWrap, focused && styles.tryOnWrapFocused]}
      hitSlop={8}
    >
      <View
        style={[
          styles.glow,
          { shadowColor: color },
          focused && styles.glowFocused,
        ]}
      >
        <View style={[styles.circle, { backgroundColor: color }]}>
          <Ionicons name="sparkles" size={22} color="#fff" />
        </View>
      </View>
      <Text style={[styles.tryOnLabel, { color }]}>Try on</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
    wrapper: {
    // 1. Float the container absolutely over your screens
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    // 2. Remove the fixed height to let content breathe naturally
  },
  bar: {
    // 1. Maintain absolute positioning inside the wrapper
    position: 'absolute',
    bottom: 24, // Raised slightly for better bottom edge spacing
    left: 16,
    right: 16,
    height: 72,
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: Platform.OS === 'android' ? 8 : 0,
  },

  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  spacer: {
    width: 64,
  },
  label: {
    fontSize: 9,
  },
    tryOnWrap: {
    position: 'absolute',
    bottom: 46, 
    alignItems: 'center',
    gap: 4,
    transform: [{ scale: 1 }],
  },

  tryOnWrapFocused: {
    transform: [{ scale: 1.08 }],
  },
  glow: {
    borderRadius: 30,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: Platform.OS === 'android' ? 6 : 0,
  },
  glowFocused: {
    shadowOpacity: 0.65,
    shadowRadius: 22,
  },
  circle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  tryOnLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
});