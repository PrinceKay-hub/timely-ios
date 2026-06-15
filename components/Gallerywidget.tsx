import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Animated,
  PanResponder,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ReactNativeZoomableView } from '@openspacelabs/react-native-zoomable-view';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
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

  // ── Pan responder for swipe-down-to-dismiss ──────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture downward vertical drags
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && gestureState.dy > 0;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) return; // Block upward drag
        translateY.setValue(gestureState.dy);
        const newOpacity = (1 - gestureState.dy / 300).clamp(0.4, 1.0);
        opacity.setValue(newOpacity);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > DISMISS_THRESHOLD) {
          onClose();
        } else {
          // Snap back
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
        <Animated.Image
          source={{ uri: item }}
          style={[
            styles.image,
            {
              transform: [
                {
                  rotate: `${rotationAngle}deg`,
                },
              ],
            },
          ]}
          resizeMode="contain"
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
        {/* ── Header ───────────────────────────────────────────────────── */}
        <SafeAreaView edges={['top']} style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>

          <Text style={styles.counter}>
            {currentIndex + 1} / {images.length}
          </Text>

          <TouchableOpacity onPress={handleRotate} style={styles.headerButton}>
            <Ionicons name="refresh" size={24} color="white" />
          </TouchableOpacity>
        </SafeAreaView>

        {/* ── Image pager ──────────────────────────────────────────────── */}
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
            length: Dimensions.get('window').width,
            offset: Dimensions.get('window').width * i,
            index: i,
          })}
          onMomentumScrollEnd={e => {
            const newIndex = Math.round(
              e.nativeEvent.contentOffset.x / Dimensions.get('window').width
            );
            setCurrentIndex(newIndex);
            setRotationAngle(0); // Reset rotation on page change
          }}
        />
      </Animated.View>
    </View>
  );
}

// Clamp polyfill for Number
declare global {
  interface Number {
    clamp(min: number, max: number): number;
  }
}
Number.prototype.clamp = function (min: number, max: number): number {
  return Math.min(Math.max(this as number, min), max);
};

const styles = StyleSheet.create({
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
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  imageContainer: {
    width: Dimensions.get('window').width,
    height: SCREEN_HEIGHT,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomable: {
    width: Dimensions.get('window').width,
    height: SCREEN_HEIGHT,
  },
  image: {
    width: Dimensions.get('window').width,
    height: SCREEN_HEIGHT,
  },
});