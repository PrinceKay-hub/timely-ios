import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  PanResponder,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ReactNativeZoomableView } from '@openspacelabs/react-native-zoomable-view';
import { useTheme } from '@/providers/ThemeProvider';
import { Image } from 'expo-image';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DISMISS_THRESHOLD = 100;

interface GalleryWidgetProps {
  images: string[];
  index: number;
  onClose: () => void;
}

export default function GalleryWidget({ images, index, onClose }: GalleryWidgetProps) {
  const [currentIndex, setCurrentIndex] = useState(index);
  const [rotationAngle, setRotationAngle] = useState(0);
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const flatListRef = useRef<FlatList>(null);
  const { theme } = useTheme();
  const colors = theme.colors;

  // Create dynamic styles based on the theme
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Pan responder for swipe‑down‑to‑dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && gestureState.dy > 0;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) return;
        translateY.setValue(gestureState.dy);
        const newOpacity = Math.min(Math.max(1 - gestureState.dy / 300, 0.4), 1);
        opacity.setValue(newOpacity);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > DISMISS_THRESHOLD) {
          onClose();
        } else {
          Animated.parallel([
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              tension: 100,
              friction: 8,
            }),
            Animated.timing(opacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  const handleRotate = () => {
    setRotationAngle(prev => prev + 90);
  };

  const renderImage = ({ item }: { item: string }) => (
    <View style={styles.imageContainer}>
      <ReactNativeZoomableView
        maxZoom={4}
        minZoom={1}
        zoomStep={0.5}
        initialZoom={1}
        bindToBorders
        style={styles.zoomable}
      >
        <Image
          source={{ uri: item }}
          style={[
            styles.image,
            {
              transform: [{ rotate: `${rotationAngle}deg` }],
            },
          ]}
          contentFit="contain"
          transition={200}
          placeholder={colors.surface || '#f3f4f6'}
        />
      </ReactNativeZoomableView>
    </View>
  );

  return (
    <View style={styles.overlay}>
      <StatusBar barStyle="light-content" backgroundColor="black" />
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateY }],
            opacity,
          },
        ]}
        {...panResponder.panHandlers}
      >
        <SafeAreaView edges={['top']} style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="chevron-back" size={24} color={colors.text || '#fff'} />
          </TouchableOpacity>
          <Text style={[styles.counter, { color: colors.text || '#fff' }]}>
            {currentIndex + 1} / {images.length}
          </Text>
          <TouchableOpacity onPress={handleRotate} style={styles.headerButton}>
            <Ionicons name="refresh" size={24} color={colors.primary} />
          </TouchableOpacity>
        </SafeAreaView>

        <FlatList
          ref={flatListRef}
          data={images}
          keyExtractor={(_, i) => i.toString()}
          renderItem={renderImage}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={index}
          getItemLayout={(_, i) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * i,
            index: i,
          })}
          onMomentumScrollEnd={e => {
            const newIndex = Math.round(
              e.nativeEvent.contentOffset.x / SCREEN_WIDTH
            );
            setCurrentIndex(newIndex);
            setRotationAngle(0);
          }}
          style={styles.flatList}
        />
      </Animated.View>
    </View>
  );
}

// ─── Style factory ──────────────────────────────────────────────────────────
const createStyles = (colors: any) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'black',
      zIndex: 999,
    },
    container: {
      flex: 1,
      backgroundColor: 'black',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: 'black',
      paddingHorizontal: 8,
      paddingVertical: 8,
    },
    headerButton: {
      padding: 8,
    },
    counter: {
      fontSize: 14,
      fontWeight: '500',
    },
    flatList: {
      flex: 1,
    },
    imageContainer: {
      width: SCREEN_WIDTH,
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'black',
    },
    zoomable: {
      width: SCREEN_WIDTH,
      height: '100%',
    },
    image: {
      width: SCREEN_WIDTH,
      height: '100%',
    },
  });