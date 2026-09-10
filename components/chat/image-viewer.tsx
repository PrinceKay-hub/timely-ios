import React from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { ReactNativeZoomableView } from '@openspacelabs/react-native-zoomable-view';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  uri: string | null;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function ImageViewer({ visible, uri, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(0);
  const bgOpacity = useSharedValue(1);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateY.value = e.translationY;
      bgOpacity.value = 1 - Math.min(Math.abs(e.translationY) / 300, 1);
    })
    .onEnd((e) => {
      if (Math.abs(e.translationY) > 120) {
        runOnJS(onClose)();
        translateY.value = 0;
        bgOpacity.value = 1;
      } else {
        translateY.value = withSpring(0);
        bgOpacity.value = withSpring(1);
      }
    });

  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  if (!uri) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        <Animated.View style={[StyleSheet.absoluteFillObject, styles.bg, bgStyle]} />

        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.imageWrap, imageStyle]}>
            <ReactNativeZoomableView
              maxZoom={4}
              minZoom={1}
              zoomStep={0.5}
              initialZoom={1}
              bindToBorders
              style={styles.zoomable}
            >
              <Image source={{ uri }} style={styles.image} contentFit="contain" />
            </ReactNativeZoomableView>
          </Animated.View>
        </GestureDetector>

        <TouchableOpacity
          style={[styles.closeBtn, { top: insets.top + 12 }]}
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bg: { backgroundColor: '#000' },
  imageWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', height: '100%' },
  closeBtn: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomable: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
});