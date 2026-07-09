import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Animated,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';

interface Option {
  icon: string;
  label: string;
  onPress: () => void;
}

interface Props {
  options: Option[];
  mainIcon?: string;
  onOverlayPress?: () => void;
}

const FabWithOptions: React.FC<Props> = ({ options, mainIcon = '+', onOverlayPress }) => {
  const [expanded, setExpanded] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;
  const { theme } = useTheme();
  const colors = theme.colors;

  // Create dynamic styles based on the theme
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    Animated.timing(animation, {
      toValue: expanded ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [expanded]);

  const rotate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const handlePress = () => {
    setExpanded(!expanded);
  };

  const handleOptionPress = (option: Option) => {
    setExpanded(false);
    option.onPress();
  };

  const Overlay = expanded && onOverlayPress ? (
    <TouchableWithoutFeedback onPress={onOverlayPress}>
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'transparent' }]} />
    </TouchableWithoutFeedback>
  ) : null;

  return (
    <>
      {Overlay}
      <View style={styles.container}>
        <View style={styles.fabWrapper}>
          {options.map((option, index) => {
            const bottom = animation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, (index + 1) * 70],
            });
            const opacity = animation.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 0, 1],
            });

            return (
              <Animated.View
                key={option.label}
                style={[
                  styles.option,
                  {
                    bottom,
                    opacity,
                  },
                ]}
              >
                {/* Label */}
                <TouchableOpacity
                  style={[styles.optionLabel, { backgroundColor: colors.card || colors.background }]}
                  onPress={() => handleOptionPress(option)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.labelText, { color: colors.text }]} numberOfLines={1}>
                    {option.label}
                  </Text>
                </TouchableOpacity>

                {/* Icon button */}
                <TouchableOpacity
                  style={[styles.optionButton, { backgroundColor: colors.card || colors.background }]}
                  onPress={() => handleOptionPress(option)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.optionIcon, { color: colors.primary }]}>
                    {option.icon}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: colors.primary }]}
            onPress={handlePress}
            activeOpacity={0.8}
          >
            <Animated.Text style={[styles.fabIcon, { transform: [{ rotate }] }]}>
              {mainIcon}
            </Animated.Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
};

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: 20,
      right: 20,
      zIndex: 100,
    },
    fabWrapper: {
      position: 'relative',
      width: 56,
      height: 56,
      alignItems: 'flex-end',
    },
    fab: {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 4,
      shadowColor: colors.shadow || '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    fabIcon: {
      fontSize: 24,
      color: '#fff',
    },
    option: {
      position: 'absolute',
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    optionLabel: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 12,
      width: 100,
      shadowColor: colors.shadow || '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
      maxWidth: 120,
    },
    labelText: {
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
      writingDirection: 'ltr',
      flexShrink: 1,
    },
    optionButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.shadow || '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
    optionIcon: {
      fontSize: 20,
    },
  });

export default FabWithOptions;